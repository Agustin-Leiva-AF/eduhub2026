// Formato es-AR y tipos de las respuestas que consume la app. Solo tipos de lib/ (nada de código de servidor).
import type { Pronostico, Evento } from '@/lib/forecast';
import type { Recomendacion } from '@/lib/advice';
import type { Cita } from '@/lib/openarg';
import type { Alertas } from '@/lib/alertas';
import type { Categoria } from '@/lib/categorias';
import type { Excedente } from '@/lib/excedente';

export type { Pronostico, Evento, Recomendacion, Cita, Alertas, Categoria, Excedente };

export type Insumo = { nombre: string; sha256: string };
export type MesCat = { mes: string; real: boolean; dias: number; diasMes: number; porCategoria: Partial<Record<Categoria, number>> };

// POST /api/dashboard
export type RespDashboard = {
  pyme: string; demo: boolean; corte: string;
  resumen: { movimientos: number; recibidos: number; emitidos: number; ignorados: string[]; insumos: Insumo[] };
  pronostico: Pronostico; recomendacion: Recomendacion; citas: Record<string, Cita>;
  mensual: MesCat[]; ventasMensuales: number;
  excedente?: Excedente;
};
// POST /api/analizar
export type RespAnalizar = {
  resumen: { movimientos: number; recibidos: number; emitidos: number; boletas: number; empleados: number; ignorados: string[]; insumos: Insumo[]; mercadopago?: 'api' | 'simulacion' | 'mixto' };
  pronostico: Pronostico; alertas: Alertas; recomendacion: Recomendacion;
  mensaje: { texto: string; fuente: 'ia' | 'reglas' }; citas: Record<string, Cita>;
  excedente?: Excedente;
};
export type Sello = { hash: string; modo: 'testnet' | 'simulado' | string; url?: string; tx?: string; fecha?: string; motivo: string; destino: string };

/* ---------- números ---------- */
const nf0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** "$ 1.234.567" con signo menos tipográfico. */
export const pesos = (n: number) => `${n < 0 ? '−' : ''}$ ${nf0.format(Math.abs(Math.round(n)))}`;
/** "$ 1,2 M" para millones; debajo de un millón, monto completo. */
export const millones = (n: number) => Math.abs(n) < 1e6 ? pesos(n) : `${n < 0 ? '−' : ''}$ ${nf1.format(Math.abs(n) / 1e6)} M`;
/** Eje de gráficos: "$1,2 M", "$800 k", "$0". */
export const ejeM = (n: number) => {
  if (n === 0) return '$0';
  const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e6) return `${s}$${nf1.format(a / 1e6).replace(/,0$/, '')} M`;
  return `${s}$${nf0.format(a / 1e3)} k`;
};
export const pct = (n: number, d = 1) => `${n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;

/* ---------- fechas (ISO "2026-10-31") ---------- */
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dt = (f: string) => new Date(f.slice(0, 10) + 'T00:00:00Z');
export const fCorta = (f: string) => `${DIAS[dt(f).getUTCDay()]} ${+f.slice(8, 10)}/${+f.slice(5, 7)}`;
export const fLarga = (f: string) => `${DIAS_L[dt(f).getUTCDay()]} ${+f.slice(8, 10)} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][+f.slice(5, 7) - 1]}`;
export const fNum = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
export const fDia = (f: string) => `${+f.slice(8, 10)} ${MESES[+f.slice(5, 7) - 1]}`;
export const sumarDias = (f: string, n: number) => new Date(dt(f).getTime() + n * 86400000).toISOString().slice(0, 10);
export const difDias = (a: string, b: string) => Math.round((dt(b).getTime() - dt(a).getTime()) / 86400000);
export const enDias = (n: number) => (n <= 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
export const plural = (n: number, s: string, p = s + 's') => `${n} ${n === 1 ? s : p}`;

export const ETQ_CAT: Record<string, string> = {
  ventas: 'Ventas', cobro_clientes: 'Cobros a clientes', sueldos: 'Sueldos', aguinaldo: 'Aguinaldo', cargas_sociales: 'Cargas sociales',
  impuestos: 'Impuestos', alquiler: 'Alquiler', servicios: 'Servicios', proveedores: 'Proveedores', retiros: 'Retiros de socios',
  bancarios: 'Gastos bancarios', otros: 'Otros',
};
export const ETQ_ORIGEN: Record<string, string> = {
  'factura pendiente': 'Factura pendiente', 'factura estimada': 'Estimada', recurrente: 'Recurrente', 'proyección de ventas': 'Estimada',
  'calendario legal': 'Calendario legal', 'descuento de factura': 'Factura descontada', 'boleta cargada': 'Boleta', 'boleta vencida': 'Boleta vencida',
  'nómina cargada': 'Nómina',
};
