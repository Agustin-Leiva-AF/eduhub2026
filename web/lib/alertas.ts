// Alertas y notificaciones: lo que está por vencer, leído sobre el mismo pronóstico que usa la caja.
// Determinístico: el LLM no interviene en montos ni en niveles.
import { fmt, sumar, type Evento, type Pronostico } from './forecast';
import type { Boleta } from './parse';

export type Nivel = 'critica' | 'atencion' | 'info';
export type Alerta = {
  id: string; nivel: Nivel; tipo: 'vencida' | 'vence' | 'semana_cargada' | 'hueco';
  titulo: string; detalle: string; fecha?: string; monto?: number;
  concepto?: string; // sin fechas relativas: las notificaciones rearman el texto el día que salen
};
export type Alertas = {
  alertas: Alerta[];
  resumen: { vencidas: number; vence7: number; vence30: number; criticas: number };
};

// Categorías que son obligaciones con fecha (no ventas ni cobros).
const OBLIGACIONES = new Set(['sueldos', 'aguinaldo', 'cargas_sociales', 'impuestos', 'alquiler', 'servicios', 'proveedores', 'otros']);
const DIA = 86400000;
const difDias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
const dm = (s: string) => `${+s.slice(8, 10)}/${+s.slice(5, 7)}`;
const cuando = (n: number) => (n <= 0 ? 'hoy' : n === 1 ? 'mañana' : `en ${n} días`);
const orden: Record<Nivel, number> = { critica: 0, atencion: 1, info: 2 };

export function alertar(p: Pronostico, boletas: Boleta[] = [], opciones: { ventana?: number } = {}): Alertas {
  const ventana = opciones.ventana ?? 14;
  const alertas: Alerta[] = [];
  const saldoEn = (f: string) => p.serie.find(d => d.fecha === f)?.saldo ?? p.saldoInicial;
  const salidas = p.eventos.filter((e): e is Evento => e.monto < 0 && OBLIGACIONES.has(e.categoria));

  // 1) Boletas ya vencidas: no se pueden esperar
  const vencidas = boletas.filter(b => b.vencimiento <= p.hoy);
  if (vencidas.length) {
    const total = vencidas.reduce((s, b) => s + b.importe, 0);
    alertas.push({
      id: 'vencidas', nivel: 'critica', tipo: 'vencida', monto: total, concepto: `${vencidas.length} boleta${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''}`,
      titulo: `${vencidas.length} boleta${vencidas.length > 1 ? 's' : ''} vencida${vencidas.length > 1 ? 's' : ''} por $${fmt(total)}`,
      detalle: `${vencidas.map(b => `${b.concepto} (${dm(b.vencimiento)})`).join(', ')}. El pronóstico las cuenta como pagadas mañana; suelen sumar intereses por mora.`,
    });
  }

  // 2) Vencimientos dentro de la ventana, uno por evento
  for (const e of salidas) {
    const dias = difDias(p.hoy, e.fecha);
    if (dias > ventana || e.origen === 'boleta vencida') continue;
    const monto = -e.monto;
    const sinFondos = saldoEn(e.fecha) < 0;
    const estimado = e.origen === 'factura estimada' || e.origen === 'recurrente';
    alertas.push({
      id: `${e.fecha}-${e.concepto}`, tipo: 'vence', fecha: e.fecha, monto, concepto: e.concepto,
      nivel: sinFondos ? 'critica' : dias <= 3 && !estimado ? 'atencion' : 'info',
      titulo: `${e.concepto}: $${fmt(monto)} ${cuando(dias)} (${dm(e.fecha)})`,
      detalle: sinFondos
        ? `Ese día tu saldo proyectado queda en -$${fmt(-saldoEn(e.fecha))}: no te alcanza.`
        : `Después de pagarlo proyectás $${fmt(saldoEn(e.fecha))}.${estimado ? ' Es una estimación por tu historial.' : ''}`,
    });
  }

  // 3) La semana que más junta: si pesa más de la mitad del saldo, hay que prepararse
  let mejor: { desde: string; total: number } | null = null;
  for (let i = 1; i <= Math.min(ventana, 120); i++) {
    const desde = sumar(p.hoy, i), hasta = sumar(desde, 6);
    const total = salidas.filter(e => e.fecha >= desde && e.fecha <= hasta).reduce((s, e) => s - e.monto, 0);
    if (!mejor || total > mejor.total) mejor = { desde, total };
  }
  if (mejor && p.saldoInicial > 0 && mejor.total > p.saldoInicial * 0.5) {
    alertas.push({
      id: `semana-${mejor.desde}`, nivel: 'atencion', tipo: 'semana_cargada', fecha: mejor.desde, monto: mejor.total, concepto: 'Semana con muchos pagos',
      titulo: `La semana del ${dm(mejor.desde)} concentra $${fmt(mejor.total)} de pagos`,
      detalle: `Es el ${Math.round((mejor.total / p.saldoInicial) * 100)}% de tu saldo de hoy. Conviene reservar la plata o escalonar pagos.`,
    });
  }

  // 3b) Hueco de caja próximo (el detalle y las salidas están en la recomendación)
  if (p.hueco) {
    const dias = difDias(p.hoy, p.hueco.inicio);
    alertas.push({
      id: `hueco-${p.hueco.inicio}`, tipo: 'hueco', fecha: p.hueco.inicio, monto: -p.hueco.minimo, concepto: 'Te quedás sin caja',
      nivel: dias <= 30 ? 'critica' : 'atencion',
      titulo: `Te quedás sin caja el ${dm(p.hueco.inicio)} (${cuando(dias)})`,
      detalle: `Faltan hasta $${fmt(-p.hueco.minimo)} el ${dm(p.hueco.fechaMinimo)}; son ${p.hueco.dias} día${p.hueco.dias > 1 ? 's' : ''} en rojo.`,
    });
  }

  alertas.sort((a, b) => orden[a.nivel] - orden[b.nivel] || (a.fecha ?? '').localeCompare(b.fecha ?? ''));
  const suma = (hasta: number) => salidas.filter(e => difDias(p.hoy, e.fecha) <= hasta).reduce((s, e) => s - e.monto, 0);
  return {
    alertas,
    resumen: { vencidas: vencidas.length, vence7: Math.round(suma(7)), vence30: Math.round(suma(30)), criticas: alertas.filter(a => a.nivel === 'critica').length },
  };
}
