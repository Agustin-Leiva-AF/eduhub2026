// Armado del bloque "dashboard" (historia mensual por categoría, proyección mensual, ventas promedio): lo comparten
// /api/dashboard y /api/analizar.
import { sumar, type Pronostico } from './forecast';
import type { Movimiento } from './parse';
import { categorizar, ETIQUETA, type Categoria } from './categorias';

export type MesCat = { mes: string; real: boolean; dias: number; diasMes: number; porCategoria: Partial<Record<Categoria, number>> };

const diasDelMes = (mes: string) => new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();

export function armarDashboard(p: Pronostico, movs: Movimiento[], pyme: string, demo: boolean) {
  const meses = new Map<string, MesCat>();
  const mesDe = (k: string, real: boolean) => {
    let m = meses.get(k);
    if (!m) { m = { mes: k, real, dias: 0, diasMes: diasDelMes(k), porCategoria: {} }; meses.set(k, m); }
    return m;
  };
  const sorted = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primero = sorted[0]?.fecha ?? p.hoy;
  for (const m of sorted) {
    const mc = mesDe(m.fecha.slice(0, 7), true);
    const c = categorizar(m.desc, m.monto);
    mc.porCategoria[c] = (mc.porCategoria[c] ?? 0) + m.monto; // con signo: entradas +, salidas -
  }
  // Días cubiertos por mes (real: del primer movimiento al corte; proyectado: de hoy+1 al horizonte)
  const finProy = sumar(p.hoy, p.serie.length);
  for (const [k, mc] of meses) {
    const ini = k + '-01' > primero ? k + '-01' : primero;
    const fin = k === p.hoy.slice(0, 7) ? p.hoy : k + '-' + String(mc.diasMes).padStart(2, '0');
    mc.dias = Math.round((Date.parse(fin) - Date.parse(ini)) / 86400000) + 1;
  }
  // Proyección mensual por categoría
  for (const e of p.eventos) {
    const k = e.fecha.slice(0, 7);
    const mc = mesDe(k, k <= p.hoy.slice(0, 7) && meses.get(k)?.real === true);
    // Si el mes de corte tiene días proyectados, no se mezcla con lo real: se agrupan aparte como proyección del resto del mes.
    if (mc.real) continue;
    mc.porCategoria[e.categoria] = (mc.porCategoria[e.categoria] ?? 0) + e.monto;
  }
  for (const [k, mc] of meses) if (!mc.real) {
    const ini = k + '-01' > p.hoy ? k + '-01' : sumar(p.hoy, 1);
    const fin = finProy < k + '-' + String(mc.diasMes).padStart(2, '0') ? finProy : k + '-' + String(mc.diasMes).padStart(2, '0');
    mc.dias = Math.round((Date.parse(fin) - Date.parse(ini)) / 86400000) + 1;
  }
  const mensual = [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  // Ventas mensuales promedio: acreditaciones de las últimas 8 semanas (mismo criterio que el motor)
  const desde8 = sumar(p.hoy, -56);
  const ventas8 = movs.filter(m => categorizar(m.desc, m.monto) === 'ventas' && m.fecha > desde8 && m.monto > 0).reduce((s, m) => s + m.monto, 0);
  const ventasMensuales = (ventas8 / 8) * 4.33;

  return { pyme: pyme || 'Mi pyme', demo, corte: p.hoy, mensual, etiquetas: ETIQUETA, ventasMensuales, eventos: p.eventos };
}
