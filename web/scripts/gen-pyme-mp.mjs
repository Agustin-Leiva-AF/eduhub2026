// Genera la pyme FICTICIA de la fuente Mercado Pago: "Carpintería Los Aromos" (muebles a medida, Córdoba, 5 empleados).
// Salida en public/demo/mp/: pagos con la forma de GET /v1/payments/search + exports de ARCA, boletas y nómina.
// Los cobros y pagos pasan por una cuenta Mercado Pago; las facturas de ARCA concilian con esos pagos (mismo monto y
// nombre/CUIT). Determinístico (semilla fija). Uso: node scripts/gen-pyme-mp.mjs
import fs from 'node:fs';

let seed = 2026;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const jitter = (x, p) => Math.round(x * (1 + (rnd() * 2 - 1) * p));
const elegir = lista => { let r = rnd() * lista.reduce((s, x) => s + x.peso, 0); for (const x of lista) if ((r -= x.peso) <= 0) return x; return lista[0]; };

const USER = 1000;
const DESDE = new Date('2026-05-01T00:00:00Z');
const HOY = new Date('2026-10-30T00:00:00Z');
const IPC_MES = 0.02;
const FERIADOS = ['2026-05-01', '2026-05-25', '2026-06-15', '2026-06-20', '2026-07-09', '2026-08-17', '2026-10-12'];
const SALDO_FINAL_OBJETIVO = 6800000; // el aporte inicial se calcula para llegar a este saldo el 30/10

const d2s = d => d.toISOString().slice(0, 10);
const add = (d, n) => new Date(d.getTime() + n * 86400000);
const habil = d => d.getUTCDay() % 6 !== 0 && !FERIADOS.includes(d2s(d));
const proxHabil = d => { while (!habil(d)) d = add(d, 1); return d; };
const meses = d => (d.getUTCFullYear() - 2026) * 12 + d.getUTCMonth() - 4; // desde mayo-2026
const infl = d => Math.pow(1 + IPC_MES, meses(d));

const pagos = [];
let idV = 95000000, idC = 96000000;
const iso = (fecha, hora) => `${fecha}T${String(hora).padStart(2, '0')}:${String(Math.floor(rnd() * 60)).padStart(2, '0')}:00.000-03:00`;
const dentro = d => d >= DESDE && d <= HOY;

// Cobro de la cuenta: MP descuenta su comisión (≈6%) en los cobros con QR/tarjeta; las transferencias entran enteras.
function cobro(d, desc, bruto, tipo) {
  if (!dentro(d)) return;
  const f = d2s(d), t = iso(f, 9 + Math.floor(rnd() * 9));
  pagos.push({ id: ++idV, status: 'approved', operation_type: tipo, description: desc, date_created: t, date_approved: t, date_last_updated: t,
    transaction_amount: bruto, transaction_amount_refunded: 0,
    transaction_details: { net_received_amount: tipo === 'money_transfer' ? bruto : Math.round(bruto * 0.9399 * 100) / 100 }, collector_id: USER, payer: { id: 2000 + Math.floor(rnd() * 500) } });
}
// Pago de la cuenta a un tercero (la cuenta es la compradora).
function pago(d, desc, monto, tipo = 'regular_payment') {
  if (!dentro(d)) return;
  const f = d2s(d), t = iso(f, 10 + Math.floor(rnd() * 6));
  pagos.push({ id: ++idC, status: 'approved', operation_type: tipo, description: desc, date_created: t, date_approved: t, date_last_updated: t,
    transaction_amount: monto, collector_id: 3000 + Math.floor(rnd() * 90), payer: { id: USER } });
}

// ── Ventas a particulares: cobros con QR / link de pago en el taller y la web, con ~6% de comisión MP
const CATALOGO = [
  { n: 'Silla de roble', p: 85000, peso: 4 }, { n: 'Mesa ratona de paraíso', p: 190000, peso: 3 }, { n: 'Escritorio melamina', p: 320000, peso: 3 },
  { n: 'Biblioteca a medida', p: 410000, peso: 2.5 }, { n: 'Cama 2 plazas de pino', p: 380000, peso: 2 }, { n: 'Placard 2 puertas', p: 560000, peso: 1.5 },
  { n: 'Mesa de comedor de algarrobo', p: 620000, peso: 1.2 }, { n: 'Mueble de cocina a medida', p: 1100000, peso: 0.6 }, { n: 'Reparación y laqueado', p: 70000, peso: 3 },
];
const PESO_DIA = [0, 1.1, 1, 1, 1.1, 1.2, 0.6]; // dom..sáb
for (let d = DESDE; d <= HOY; d = add(d, 1)) {
  if (!habil(d) && d.getUTCDay() !== 6) continue;
  const n = Math.round((PESO_DIA[d.getUTCDay()] * 1.35) + (rnd() - 0.5) * 2.2);
  for (let k = 0; k < Math.max(0, n); k++) {
    const it = elegir(CATALOGO);
    cobro(d, `${it.n} - ${rnd() < 0.55 ? 'cobro QR' : 'link de pago'}`, Math.round(jitter(it.p * infl(d), 0.12) / 100) * 100, 'regular_payment');
  }
}

// ── Gastos fijos mensuales: [día, descripción, monto base de mayo, tipo, crece con paritarias]
const FIJOS = [
  [3, 'ALQUILER taller INMOB DEL PARQUE', 1350000, 'money_transfer'],
  [5, 'PAGO HABERES NOMINA 5 EMPL', 5000000, 'money_transfer', 'paritaria'],
  [5, 'TASA municipal comercio Municipalidad de Cordoba', 165000, 'regular_payment'],
  [8, 'TELECOM internet y telefonia', 72000, 'regular_payment'],
  [10, 'VEP ARCA F931 CARGAS SOCIALES', 1400000, 'money_transfer', 'paritaria'],
  [12, 'EPEC energia electrica', 620000, 'regular_payment'],
  [15, 'VEP RENTAS CBA IIBB', 520000, 'money_transfer'],
  [18, 'VEP ARCA IVA DDJJ', 1150000, 'money_transfer'],
  [22, 'AGUAS CORDOBESAS servicio de agua', 86000, 'regular_payment'],
  [25, 'SEGURO integral taller y ART Sancor', 195000, 'regular_payment'],
  [26, 'HONORARIOS estudio contable', 220000, 'money_transfer'],
  [28, 'RETIRO SOCIO TRANSF CTA PROPIA', 1500000, 'money_transfer'],
];
for (let m = 0; m < 6; m++) {
  for (const [dia, desc, base, tipo, cre] of FIJOS) {
    const f = proxHabil(new Date(Date.UTC(2026, 4 + m, dia)));
    const g = cre ? Math.pow(1.025, m) : infl(f);
    pago(f, desc, jitter(base * g, cre ? 0.01 : 0.06), tipo);
  }
  if (m % 2 === 0) pago(proxHabil(new Date(Date.UTC(2026, 4 + m, 20))), 'ECOGAS gas natural bimestral', jitter(250000 * infl(new Date(Date.UTC(2026, 4 + m, 20))), 0.1), 'regular_payment');
}
// Mantenimiento irregular de maquinaria (afilado, repuestos)
for (let d = add(DESDE, 9); d <= HOY; d = add(d, 22 + Math.floor(rnd() * 8))) pago(proxHabil(d), 'Afilado y repuestos sierra', jitter(75000 * infl(d), 0.4));
// Aguinaldo 1er semestre: 50% de la mejor remuneración, pagado el 30/06
pago(new Date('2026-06-30T00:00:00Z'), 'PAGO HABERES SAC 1ER SEM NOMINA 5 EMPL', Math.round(5000000 * 1.025 * 0.5), 'money_transfer');

// ── Facturas recibidas (proveedores) y su pago por transferencia/pago a N días
const PROV = [
  { nom: 'MADERAS DEL SUR SA', cuit: '30712345671', cada: 14, base: 1350000, plazo: 30 },
  { nom: 'ASERRADERO SIERRAS SRL', cuit: '30709876542', cada: 14, base: 900000, plazo: 21 },
  { nom: 'HERRAJES CORDOBA SRL', cuit: '30715551114', cada: 30, base: 780000, plazo: 15 },
  { nom: 'PINTURAS ALBA SA', cuit: '30718880003', cada: 30, base: 520000, plazo: 7 },
  { nom: 'FERRETERIA INDUSTRIAL CUYO SRL', cuit: '30706660018', cada: 21, base: 260000, plazo: 10 },
  { nom: 'TRANSPORTE ANDES SRL', cuit: '30714440025', cada: 15, base: 180000, plazo: 15 },
];
const recibidos = [];
let nro = 2000;
for (const p of PROV) {
  for (let d = add(new Date('2026-03-02T00:00:00Z'), Math.floor(rnd() * 5)); d <= HOY; d = add(d, p.cada)) {
    const total = jitter(p.base * infl(d), 0.12);
    recibidos.push({ fecha: d2s(d), tipo: '1 - Factura A', pv: 3, nro: ++nro, cuit: p.cuit, nom: p.nom, total });
    pago(proxHabil(add(d, p.plazo)), `${p.nom} CUIT ${p.cuit}`, total, 'money_transfer');
  }
}

// ── Facturas emitidas a empresas en cuenta corriente (FCE) y su cobro por transferencia
const CLIENTES = [
  { nom: 'ESTUDIO JURIDICO BUSTOS Y ASOCIADOS SRL', cuit: '30716100011', cada: 30, base: 2600000, plazo: 35 },
  { nom: 'CLINICA DENTAL SONRISA SRL', cuit: '30716200022', cada: 21, base: 1900000, plazo: 30 },
  { nom: 'OFICINAS CUYO SA', cuit: '30716300033', cada: 45, base: 3200000, plazo: 60 },
  { nom: 'HOTEL BOUTIQUE LA SERRANIA SA', cuit: '30716400044', cada: 28, base: 2100000, plazo: 45 },
];
const emitidos = [];
let nroE = 300;
for (const c of CLIENTES) {
  for (let d = add(new Date('2026-03-04T00:00:00Z'), Math.floor(rnd() * 10)); d <= HOY; d = add(d, c.cada)) {
    const total = jitter(c.base * infl(d), 0.15);
    emitidos.push({ fecha: d2s(d), tipo: '201 - Factura de Crédito Electrónica MiPyMEs (FCE) A', pv: 4, nro: ++nroE, cuit: c.cuit, nom: c.nom, total });
    cobro(proxHabil(add(d, jitter(c.plazo, 0.12))), c.nom, total, 'money_transfer');
  }
}

// ── Aporte inicial de capital a la cuenta, calibrado para cerrar con SALDO_FINAL_OBJETIVO
const neto = pagos.reduce((s, p) => s + (p.payer.id === USER ? -p.transaction_amount : p.transaction_details.net_received_amount), 0);
const aporte = Math.round((SALDO_FINAL_OBJETIVO - neto) / 100000) * 100000;
const t0 = iso('2026-05-01', 9);
if (aporte > 0) pagos.push({ id: ++idV, status: 'approved', operation_type: 'account_fund', description: 'Carga de saldo desde cuenta bancaria', date_created: t0, date_approved: t0, date_last_updated: t0,
  transaction_amount: aporte, transaction_details: { net_received_amount: aporte }, collector_id: USER, payer: { id: USER } });
pagos.sort((a, b) => a.date_approved.localeCompare(b.date_approved));

// ── Archivos de ARCA, boletas y nómina
const ar = n => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdm = s => s.split('-').reverse().join('/');
const netoIva = t => Math.round(t / 1.21 * 100) / 100;
const linea = r => [fdm(r.fecha), r.tipo, r.pv, r.nro, r.nro, '7612345678901' + (r.nro % 10), 'CUIT', r.cuit, r.nom, '1,00', '$', ar(netoIva(r.total)), ar(0), ar(0), ar(r.total - netoIva(r.total)), ar(r.total)].join(';');
const hdr = q => `Fecha;Tipo;Punto de Venta;Número Desde;Número Hasta;Cód. Autorización;Tipo Doc. ${q};Nro. Doc. ${q};Denominación ${q};Tipo Cambio;Moneda;Imp. Neto Gravado;Imp. Neto No Gravado;Imp. Op. Exentas;IVA;Imp. Total`;
const porFecha = (a, b) => a.fecha.localeCompare(b.fecha);

const BOLETAS = [ // vencimiento, concepto, emisor, importe (noviembre-diciembre, ya con inflación)
  ['05/11/2026', 'Tasa municipal comercio', 'Municipalidad de Córdoba', 183000],
  ['12/11/2026', 'Servicio de energía EPEC', 'EPEC', 690000],
  ['16/11/2026', 'IIBB anticipo octubre', 'Rentas Córdoba', 575000],
  ['18/11/2026', 'IVA octubre', 'ARCA', 1280000],
  ['20/11/2026', 'Servicio de gas bimestral', 'Ecogas', 278000],
  ['23/11/2026', 'Servicio de agua', 'Aguas Cordobesas', 96000],
  ['25/11/2026', 'Seguro integral y ART', 'Sancor Seguros', 215000],
  ['10/12/2026', 'Servicio de energía EPEC', 'EPEC', 705000],
];
const NOMINA = [ // legajo, empleado, neto, fecha de pago
  ['Maestro carpintero', 1450000], ['Oficial carpintero 1', 1150000], ['Oficial carpintero 2', 1150000], ['Ayudante de taller', 950000], ['Administración y ventas', 1100000],
];

const dir = 'public/demo/mp';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/mp_pagos.json`, JSON.stringify({ userId: USER, pagos }, null, 1));
fs.writeFileSync(`${dir}/mis_comprobantes_recibidos.csv`, hdr('Emisor') + '\n' + recibidos.sort(porFecha).map(linea).join('\n') + '\n');
fs.writeFileSync(`${dir}/mis_comprobantes_emitidos.csv`, hdr('Receptor') + '\n' + emitidos.sort(porFecha).map(linea).join('\n') + '\n');
fs.writeFileSync(`${dir}/boletas_vencimientos.csv`, 'Vencimiento;Concepto;Emisor;Importe\n' + BOLETAS.map(b => `${b[0]};${b[1]};${b[2]};${ar(b[3])}`).join('\n') + '\n');
fs.writeFileSync(`${dir}/nomina_octubre.csv`, 'Legajo;Empleado;Neto a pagar;Cargas sociales;Fecha de pago;Vencimiento cargas\n' +
  NOMINA.map(([e, n], i) => `${i + 1};${e};${ar(n)};${ar(Math.round(n * 0.275))};05/11/2026;10/11/2026`).join('\n') + '\n');

const porMes = {};
for (const p of pagos) { const k = p.date_approved.slice(0, 7); porMes[k] ??= { ent: 0, sal: 0 }; if (p.operation_type === 'account_fund') continue; if (p.payer.id === USER) porMes[k].sal += p.transaction_amount; else porMes[k].ent += p.transaction_details.net_received_amount; }
console.log(`pagos=${pagos.length} aporteInicial=${ar(aporte)} recibidos=${recibidos.length} emitidos=${emitidos.length}`);
for (const [k, v] of Object.entries(porMes)) console.log(k, 'entradas', ar(v.ent), 'salidas', ar(v.sal), 'neto', ar(v.ent - v.sal));
