// Genera los archivos de la pyme FICTICIA de la demo: "La Esquina de Nueva Córdoba" (bar, 8 empleados).
// Salida en public/demo/: extracto bancario (CSV estilo home banking) y exports de "Mis Comprobantes" de ARCA.
// Determinístico (semilla fija). Uso: node scripts/gen-demo.mjs
import fs from 'node:fs';

let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const jitter = (x, p) => Math.round(x * (1 + (rnd() * 2 - 1) * p));

const DESDE = new Date('2026-05-01T00:00:00Z');
const HOY = new Date('2026-10-30T00:00:00Z');
const IPC_MES = 0.02; // deriva de precios usada para generar la historia
const FERIADOS = ['2026-05-01', '2026-05-25', '2026-06-15', '2026-06-20', '2026-07-09', '2026-08-17', '2026-10-12'];

const d2s = d => d.toISOString().slice(0, 10);
const add = (d, n) => new Date(d.getTime() + n * 86400000);
const habil = d => d.getUTCDay() % 6 !== 0 && !FERIADOS.includes(d2s(d));
const proxHabil = d => { while (!habil(d)) d = add(d, 1); return d; };
const meses = d => (d.getUTCFullYear() - 2026) * 12 + d.getUTCMonth() - 4; // meses desde mayo-2026
const infl = d => Math.pow(1 + IPC_MES, meses(d));

const mov = []; // {fecha, desc, monto}
const push = (fecha, desc, monto) => { if (fecha >= DESDE && fecha <= HOY) mov.push({ fecha: d2s(fecha), desc, monto }); };

// Ventas: liquidaciones de Mercado Pago y Posnet, acreditadas el día hábil siguiente
const PESO_DIA = [1.0, 0.6, 0.7, 0.8, 1.0, 1.5, 1.7]; // dom..sáb
const VENTA_BASE = 770000;
const pendientesVenta = [];
for (let d = add(DESDE, -3); d <= HOY; d = add(d, 1)) {
  const v = jitter(VENTA_BASE * PESO_DIA[d.getUTCDay()] * infl(d), 0.18);
  pendientesVenta.push({ v, d });
  if (habil(d) && d >= DESDE) {
    const tot = pendientesVenta.reduce((s, x) => s + x.v, 0);
    pendientesVenta.length = 0;
    push(d, 'ACRED LIQ MERCADO PAGO SRL', Math.round(tot * 0.62));
    push(d, 'ACRED POSNET VISA/MASTER LIQ', Math.round(tot * 0.38));
  }
}

// Gastos fijos mensuales (día del mes, descripción, monto base mayo)
const FIJOS = [
  [1, 'COM MANTENIMIENTO CUENTA PYME', 38000],
  [4, 'PAGO HABERES NOMINA 8 EMPL', 8000000],
  [5, 'TRANSF ALQUILER LOCAL INMOB DEL PARQUE', 2200000],
  [10, 'VEP ARCA F931 CARGAS SOCIALES', 2300000],
  [12, 'DEB AUT EPEC ENERGIA', 690000],
  [15, 'VEP RENTAS CBA IIBB', 860000],
  [20, 'VEP ARCA IVA DDJJ', 1150000],
  [22, 'DEB AUT ECOGAS', 300000],
  [28, 'RETIRO SOCIO TRANSF CTA PROPIA', 1500000],
];
for (let m = 0; m < 6; m++) {
  for (const [dia, desc, base] of FIJOS) {
    const f = proxHabil(new Date(Date.UTC(2026, 4 + m, dia)));
    const paritaria = desc.includes('HABERES') || desc.includes('F931') ? Math.pow(1.025, m) : infl(f);
    push(f, desc, -jitter(base * paritaria, desc.includes('HABERES') ? 0.01 : 0.06));
  }
}
// Aguinaldo 1er semestre: 50% de la mejor remuneración, pagado el 30/06
push(new Date('2026-06-30T00:00:00Z'), 'PAGO HABERES SAC 1ER SEM', -Math.round(8000000 * 1.025 * 0.5));

// Comprobantes recibidos (proveedores) y su pago por transferencia a N días
const PROV = [
  { nom: 'DISTRIBUIDORA MEDITERRANEA SA', cuit: '30712345671', tipo: '1 - Factura A', cada: 7, base: 1050000, plazo: 30 },
  { nom: 'FRIGORIFICO LAS LOMAS SRL', cuit: '30709876542', tipo: '1 - Factura A', cada: 7, base: 880000, plazo: 21 },
  { nom: 'VERDULERIA MERCADO NORTE', cuit: '20281234563', tipo: '11 - Factura C', cada: 7, base: 240000, plazo: 7 },
  { nom: 'PAPELERA CUYO SRL', cuit: '30715551114', tipo: '1 - Factura A', cada: 30, base: 410000, plazo: 30 },
];
const recibidos = [];
let nro = 1000;
for (const p of PROV) {
  for (let d = add(new Date('2026-03-02T00:00:00Z'), Math.floor(rnd() * 5)); d <= HOY; d = add(d, p.cada)) {
    const total = jitter(p.base * infl(d), 0.12);
    recibidos.push({ fecha: d2s(d), tipo: p.tipo, pv: 3, nro: ++nro, cuit: p.cuit, nom: p.nom, total, a: p.tipo.includes('A') });
    push(proxHabil(add(d, p.plazo)), `TRANSF A ${p.nom} CUIT ${p.cuit}`, -total);
  }
}

// Comprobantes emitidos: eventos corporativos a un cliente en cuenta corriente, cobro a ~90 días
const emitidos = [];
let nroE = 210;
for (let d = new Date('2026-02-06T00:00:00Z'); d <= HOY; d = add(d, 14)) {
  const total = jitter(1650000 * infl(d), 0.15);
  emitidos.push({ fecha: d2s(d), tipo: '201 - Factura de Crédito Electrónica MiPyMEs (FCE) A', pv: 4, nro: ++nroE, cuit: '30711122233', nom: 'GRUPO ANDINO EVENTOS SA', total });
  push(proxHabil(add(d, 90)), 'TRANSF RECIBIDA GRUPO ANDINO EVENTOS SA', total);
}

// Extracto con saldo corrido
mov.sort((a, b) => a.fecha.localeCompare(b.fecha) || b.monto - a.monto);
let saldo = 3500000;
const ar = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdm = s => s.split('-').reverse().join('/');
let csv = 'Fecha;Descripción;Débito;Crédito;Saldo\n';
let minSaldo = Infinity;
for (const m of mov) {
  saldo += m.monto;
  minSaldo = Math.min(minSaldo, saldo);
  csv += `${fdm(m.fecha)};${m.desc};${m.monto < 0 ? ar(-m.monto) : ''};${m.monto > 0 ? ar(m.monto) : ''};${ar(saldo)}\n`;
}
fs.mkdirSync('public/demo', { recursive: true });
fs.writeFileSync('public/demo/extracto_banco_esquina.csv', csv);

const neto = t => Math.round(t / 1.21 * 100) / 100;
const linea = (r, conIva) => [r.fecha.split('-').reverse().join('/'), r.tipo, r.pv, r.nro, r.nro, '7612345678901' + (r.nro % 10), 'CUIT', r.cuit, r.nom, '1,00', '$',
  ar(conIva ? neto(r.total) : 0), ar(0), ar(conIva ? 0 : r.total), ar(conIva ? r.total - neto(r.total) : 0), ar(r.total)].join(';');
const hdr = q => `Fecha;Tipo;Punto de Venta;Número Desde;Número Hasta;Cód. Autorización;Tipo Doc. ${q};Nro. Doc. ${q};Denominación ${q};Tipo Cambio;Moneda;Imp. Neto Gravado;Imp. Neto No Gravado;Imp. Op. Exentas;IVA;Imp. Total`;
fs.writeFileSync('public/demo/mis_comprobantes_recibidos.csv', hdr('Emisor') + '\n' + recibidos.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(r => linea(r, r.a)).join('\n') + '\n');
fs.writeFileSync('public/demo/mis_comprobantes_emitidos.csv', hdr('Receptor') + '\n' + emitidos.map(r => linea(r, true)).join('\n') + '\n');
console.log(`movimientos=${mov.length} saldoFinal=${ar(saldo)} minSaldoHistórico=${ar(minSaldo)} recibidos=${recibidos.length} emitidos=${emitidos.length}`);
