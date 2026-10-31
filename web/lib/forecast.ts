// Motor de caja: determinístico y explicable. Proyecta el saldo diario a 120 días con:
//  - facturas pendientes de cobro/pago (ARCA), con el plazo real aprendido por contraparte,
//  - facturas futuras estimadas por la cadencia de cada proveedor/cliente,
//  - gastos recurrentes del extracto (sueldos, cargas, impuestos, alquiler, servicios...),
//  - aguinaldo (18/12) y ventas por día de semana de las últimas 8 semanas,
//  - todo ajustado por la inflación mensual del último dato INDEC (vía OpenARG).
import { categorizar, type Categoria } from './categorias';
import type { Comprobante, Movimiento } from './parse';

export const HORIZONTES = [15, 30, 60, 90, 120] as const;

export type Evento = { fecha: string; concepto: string; categoria: Categoria; monto: number; origen: string; cuit?: string };
export type Dia = { fecha: string; saldo: number; entradas: number; salidas: number };
export type Hueco = { inicio: string; fin: string | null; minimo: number; fechaMinimo: string; dias: number; areaNegativa: number };
export type Pronostico = {
  hoy: string; saldoInicial: number; ipcMensual: number;
  serie: Dia[]; eventos: Evento[];
  horizontes: { dias: number; saldoFinal: number; minimo: number; fechaMinimo: string }[];
  hueco: Hueco | null;
  huecos: Hueco[];
  aprendizajes: string[];
  contrapartes: Contraparte[];
  historia: { mes: string; entradas: number; salidas: number }[];
};
export type Contraparte = {
  cuit: string; nombre: string; lado: 'pagar' | 'cobrar'; plazoDias: number; cadenciaDias: number | null;
  montoTipico: number; pendientes: number; facturas: number;
};
export type Opciones = { hoy?: string; horizonte?: number; ipcMensual: number; plazoExtra?: Record<string, number>; anticipos?: { cuit: string; numero: string; fecha: string }[] };

// Feriados nacionales (aprox.; verificar el calendario oficial). Los trasladables pueden diferir.
const FERIADOS = new Set(['2026-11-23', '2026-12-08', '2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09', '2027-03-24']);

const DIA = 86400000;
const d2s = (d: Date) => d.toISOString().slice(0, 10);
const s2d = (s: string) => new Date(s + 'T00:00:00Z');
export const sumar = (s: string, n: number) => d2s(new Date(s2d(s).getTime() + n * DIA));
const difDias = (a: string, b: string) => Math.round((s2d(b).getTime() - s2d(a).getTime()) / DIA);
const habil = (s: string) => { const w = s2d(s).getUTCDay(); return w !== 0 && w !== 6 && !FERIADOS.has(s); };
const proxHabil = (s: string) => { while (!habil(s)) s = sumar(s, 1); return s; };
const mediana = (xs: number[]) => { if (!xs.length) return NaN; const a = [...xs].sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
const clave = (s: string) => s.toUpperCase().replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
const primeraPalabra = (nombre: string) => nombre.toUpperCase().split(/\s+/).find(w => w.length > 3) ?? nombre.toUpperCase();

type Cobro = { m: Movimiento & { cat: Categoria }; usado: boolean };

export function pronosticar(movs: Movimiento[], recibidos: Comprobante[], emitidos: Comprobante[], op: Opciones): Pronostico {
  const H = op.horizonte ?? 120;
  const ordenados = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hoy = op.hoy ?? ordenados[ordenados.length - 1].fecha;
  const conSaldo = ordenados.filter(m => m.saldo !== undefined);
  const saldoInicial = conSaldo.length ? conSaldo[conSaldo.length - 1].saldo! : ordenados.reduce((s, m) => s + m.monto, 0);
  const crec = (f: string) => Math.pow(1 + op.ipcMensual, Math.max(0, difDias(hoy, f)) / 30.4);
  const fin = sumar(hoy, H);
  const enRango = (f: string) => f > hoy && f <= fin;

  const cats = ordenados.map(m => ({ ...m, cat: categorizar(m.desc, m.monto) }));
  const eventos: Evento[] = [];
  const aprendizajes: string[] = [];
  const contrapartes: Contraparte[] = [];

  // 1) Facturas ↔ movimientos: plazo real por contraparte y pendientes
  const pool: Cobro[] = cats.map(m => ({ m, usado: false }));
  const conciliar = (comps: Comprobante[], lado: 'pagar' | 'cobrar') => {
    const porCuit = new Map<string, Comprobante[]>();
    for (const c of comps) porCuit.set(c.cuit, [...(porCuit.get(c.cuit) ?? []), c]);
    for (const [cuit, lista] of porCuit) {
      lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
      const nombre = lista[0].nombre;
      const pal = primeraPalabra(nombre);
      const plazos: number[] = [];
      const pendientes: Comprobante[] = [];
      for (const c of lista) {
        const signo = lado === 'pagar' ? -1 : 1;
        const hit = pool.find(p => !p.usado && p.m.fecha >= c.fecha && Math.abs(p.m.monto - signo * c.total) < 1 &&
          (p.m.desc.toUpperCase().includes(pal) || p.m.desc.includes(cuit)));
        if (hit) { hit.usado = true; plazos.push(difDias(c.fecha, hit.m.fecha)); }
        else if (c.fecha >= ordenados[0].fecha) pendientes.push(c);
      }
      const plazo = Math.round(mediana(plazos)) || 30;
      const fechas = lista.map(c => c.fecha);
      const cadencia = fechas.length >= 3 ? Math.round(mediana(fechas.slice(1).map((f, i) => difDias(fechas[i], f)))) : null;
      const ult = lista.slice(-3);
      const montoTipico = ult.reduce((s, c) => s + c.total, 0) / ult.length;
      contrapartes.push({ cuit, nombre, lado, plazoDias: plazo, cadenciaDias: cadencia, montoTipico, pendientes: pendientes.length, facturas: lista.length });
      const extra = op.plazoExtra?.[cuit] ?? 0;
      const cat: Categoria = lado === 'pagar' ? 'proveedores' : 'cobro_clientes';
      const verbo = lado === 'pagar' ? 'Pago a' : 'Cobro de';
      for (const c of pendientes) {
        const ant = op.anticipos?.find(a => a.cuit === cuit && a.numero === c.numero);
        let f = ant ? ant.fecha : proxHabil(sumar(c.fecha, plazo + extra));
        if (f <= hoy) f = proxHabil(sumar(hoy, 3)); // vencida: asumimos que se cancela en los próximos días
        if (enRango(f)) eventos.push({ fecha: f, concepto: `${verbo} ${nombre} (fact. ${c.numero}${ant ? ', anticipada' : ''})`, categoria: cat, monto: (lado === 'pagar' ? -1 : 1) * c.total, origen: ant ? 'descuento de factura' : 'factura pendiente', cuit });
      }
      if (cadencia && lista.length >= 3) {
        for (let f = sumar(lista[lista.length - 1].fecha, cadencia); f <= fin; f = sumar(f, cadencia)) {
          const pago = proxHabil(sumar(f, plazo + extra));
          if (enRango(pago) && f > hoy) eventos.push({ fecha: pago, concepto: `${verbo} ${nombre} (factura estimada)`, categoria: cat, monto: (lado === 'pagar' ? -1 : 1) * Math.round(montoTipico * crec(f)), origen: 'factura estimada', cuit });
        }
      }
      if (plazos.length >= 3) aprendizajes.push(`${lado === 'pagar' ? 'A' : 'De'} ${nombre} ${lado === 'pagar' ? 'le pagás' : 'cobrás'} a ${plazo} días${cadencia ? `, con una factura cada ${cadencia} días` : ''}.`);
    }
  };
  conciliar(recibidos, 'pagar');
  conciliar(emitidos, 'cobrar');

  // 2) Recurrentes del extracto (no conciliados con facturas)
  const RECURRENTES: Categoria[] = ['sueldos', 'cargas_sociales', 'impuestos', 'alquiler', 'servicios', 'retiros', 'bancarios'];
  const ultimos4 = new Set<string>();
  for (let i = 0; i < 4; i++) ultimos4.add(sumar(hoy, -30.4 * i).slice(0, 7));
  const grupos = new Map<string, (Movimiento & { cat: Categoria })[]>();
  for (const p of pool) if (!p.usado && RECURRENTES.includes(p.m.cat) && p.m.monto < 0) {
    const k = clave(p.m.desc); grupos.set(k, [...(grupos.get(k) ?? []), p.m]);
  }
  let sueldoMensual = 0;
  for (const [, ms] of grupos) {
    const meses = new Set(ms.map(m => m.fecha.slice(0, 7)).filter(m => ultimos4.has(m)));
    if (meses.size < 3) continue;
    const ult = ms[ms.length - 1];
    const dia = Math.round(mediana(ms.slice(-4).map(m => +m.fecha.slice(8, 10))));
    if (ult.cat === 'sueldos') sueldoMensual += -ult.monto;
    for (let k = 0; k <= Math.ceil(H / 28) + 1; k++) {
      const base = s2d(hoy); base.setUTCDate(1); base.setUTCMonth(base.getUTCMonth() + k);
      const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
      base.setUTCDate(Math.min(dia, ultimoDia));
      const f = proxHabil(d2s(base));
      if (enRango(f)) eventos.push({ fecha: f, concepto: ult.desc, categoria: ult.cat, monto: Math.round(ult.monto * crec(f)), origen: 'recurrente' });
    }
    aprendizajes.push(`"${ult.desc}" se repite todos los meses cerca del día ${dia} (≈ $${fmt(-ult.monto)}).`);
  }

  // 3) Aguinaldo: 50% del sueldo mensual, a más tardar el 18/12 y el 30/06
  if (sueldoMensual > 0) {
    for (const md of ['12-18', '06-30']) for (const y of [+hoy.slice(0, 4), +hoy.slice(0, 4) + 1]) {
      const f = proxHabil(`${y}-${md}`);
      if (enRango(f)) eventos.push({ fecha: f, concepto: 'Aguinaldo (SAC), 50% de la nómina', categoria: 'aguinaldo', monto: -Math.round(sueldoMensual * 0.5 * crec(f)), origen: 'calendario legal' });
    }
  }

  // 4) Ventas: promedio por día de semana de las acreditaciones de las últimas 8 semanas
  const desde8 = sumar(hoy, -56);
  const porDia = new Array(7).fill(0);
  for (const m of cats) if (m.cat === 'ventas' && m.fecha > desde8 && m.monto > 0) porDia[s2d(m.fecha).getUTCDay()] += m.monto;
  const prom = porDia.map(v => v / 8);
  let arrastre = 0;
  for (let f = sumar(hoy, 1); f <= fin; f = sumar(f, 1)) {
    const w = s2d(f).getUTCDay();
    if (!habil(f)) { if (w !== 0 && w !== 6) arrastre += prom[1] / 2; continue; } // un feriado corre parte de la liquidación
    const v = (prom[w] + arrastre) * crec(f); arrastre = 0;
    if (v > 0) eventos.push({ fecha: f, concepto: 'Acreditación de ventas (tarjeta/QR)', categoria: 'ventas', monto: Math.round(v), origen: 'proyección de ventas' });
  }
  const ventasMes = prom.reduce((s, v) => s + v, 0) * 4.33;
  aprendizajes.unshift(`Tus ventas acreditadas promedian $${fmt(ventasMes)} por mes (últimas 8 semanas).`);

  // 5) Serie diaria
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha) || b.monto - a.monto);
  const serie: Dia[] = [];
  let saldo = saldoInicial, j = 0;
  for (let i = 1; i <= H; i++) {
    const f = sumar(hoy, i);
    let ent = 0, sal = 0;
    while (j < eventos.length && eventos[j].fecha === f) { const e = eventos[j++]; if (e.monto > 0) ent += e.monto; else sal += -e.monto; }
    saldo += ent - sal;
    serie.push({ fecha: f, saldo: Math.round(saldo), entradas: Math.round(ent), salidas: Math.round(sal) });
  }

  const horizontes = HORIZONTES.filter(h => h <= H).map(h => {
    const tramo = serie.slice(0, h);
    const min = tramo.reduce((a, b) => (b.saldo < a.saldo ? b : a));
    return { dias: h, saldoFinal: tramo[tramo.length - 1].saldo, minimo: min.saldo, fechaMinimo: min.fecha };
  });

  // Huecos: tramos consecutivos con saldo negativo
  const huecos: Hueco[] = [];
  for (let k = 0; k < serie.length; k++) {
    if (serie[k].saldo >= 0) continue;
    const i0 = k; let area = 0; let min = serie[k];
    while (k < serie.length && serie[k].saldo < 0) { area += -serie[k].saldo; if (serie[k].saldo < min.saldo) min = serie[k]; k++; }
    huecos.push({ inicio: serie[i0].fecha, fin: k < serie.length ? serie[k].fecha : null, minimo: min.saldo, fechaMinimo: min.fecha, dias: k - i0, areaNegativa: area });
  }
  const hueco = huecos[0] ?? null;

  // Historia mensual del extracto (para el gráfico de contexto)
  const hist = new Map<string, { entradas: number; salidas: number }>();
  for (const m of ordenados) { const k = m.fecha.slice(0, 7); const h = hist.get(k) ?? { entradas: 0, salidas: 0 }; if (m.monto > 0) h.entradas += m.monto; else h.salidas += -m.monto; hist.set(k, h); }

  return { hoy, saldoInicial, ipcMensual: op.ipcMensual, serie, eventos, horizontes, hueco, huecos, aprendizajes, contrapartes,
    historia: [...hist].map(([mes, v]) => ({ mes, ...v })) };
}

export const fmt = (n: number) => Math.round(n).toLocaleString('es-AR');
