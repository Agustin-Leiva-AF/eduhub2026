// Tesorero (skill "Analista de Caja"): mira la salud de la caja, arma un scoring interno 0-100 y decide si hay luz verde
// para invertir. Si no la hay, dice qué hacer primero; si la hay, arma el bloque que recibe el Researcher (paso 8 del skill).
// Determinístico y explicable: el LLM no interviene en puntajes ni en montos.
import { ETIQUETA, type Categoria } from './categorias';
import type { Recomendacion } from './advice';
import type { Alertas } from './alertas';
import type { Excedente } from './excedente';
import { fmt, type Pronostico } from './forecast';
import type { Cita, Contexto } from './openarg';

export type Semaforo = 'verde' | 'amarillo' | 'rojo';
export type Indicador = { id: string; nombre: string; valor: string; puntaje: number; semaforo: Semaforo; explica: string };
export type Pilar = { id: string; nombre: string; peso: number; puntaje: number | null; indicadores: Indicador[]; falta?: string };
export type Categoria5 = 'A' | 'B' | 'C' | 'D' | 'E';
export type Decision = 'invertir' | 'cautela' | 'no_invertir';
export type Accion = { titulo: string; porque: string; impacto: string; plazo: string };
export type Estabilidad = 'alta' | 'media' | 'baja';

// Bloque de salida hacia el Researcher, con la forma del paso 8 del skill.
export type ExcedenteTramo = { monto: number; moneda: 'ARS'; disponible_desde: string; se_necesita_el: string; dias_horizonte: number; uso_futuro: string };
export type BloqueResearcher = {
  fecha_corte: string;
  reserva_operativa: { monto: number; moneda: 'ARS'; criterio: string };
  deuda_cara_vigente: { tipo: string; saldo: number; tea: number }[];
  excedentes: ExcedenteTramo[];
  score: { valor: number; categoria: Categoria5; preliminar: boolean };
  estabilidad_flujo: Estabilidad;
};

export type Tesoreria = {
  score: { valor: number; rango: [number, number] | null; categoria: Categoria5; lectura: string; preliminar: boolean; motivoPreliminar?: string };
  pilares: Pilar[];
  estabilidad: Estabilidad;
  veredicto: { decision: Decision; titulo: string; motivo: string };
  acciones: Accion[];
  bloque: BloqueResearcher | null;
  tasas: { tnaPlazoFijo: number; ipcMensual: number; citas: { plazoFijo: Cita; ipc: Cita; pfReal: Cita } };
  aviso: string;
};

const AVISO = 'Este diagnóstico es orientativo y no reemplaza el análisis de tu contador ni la evaluación de un banco. El score es interno: no es una calificación crediticia oficial ni reemplaza la Central de Deudores del BCRA.';
const LECTURA: Record<Categoria5, string> = {
  A: 'Estás en condiciones de negociar mejores tasas y plazos',
  B: 'Buena base, con 1 o 2 puntos para ajustar',
  C: 'Te dan crédito, pero caro. Ordená antes de pedir',
  D: 'Riesgo alto: priorizá la caja antes que crecer',
  E: 'Urgente: hay riesgo de no cubrir pagos próximos',
};
const NOMINA = new Set<Categoria>(['sueldos', 'cargas_sociales']);
const DIAS_MES = 30.4;
const millones = (n: number) => `$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;
const dm = (s: string) => `${+s.slice(8, 10)}/${+s.slice(5, 7)}`;
const dec = (x: number, d = 1) => x.toFixed(d).replace('.', ',');

/** Escala por tramos del skill: p[0]→0, p[1]→40 (fin del rojo), p[2]→70 (fin del amarillo), p[3]→100. Sirve para
 *  métricas crecientes (p ascendente) y decrecientes (p descendente); interpola lineal dentro de cada tramo. */
export function escalar(x: number, p: [number, number, number, number]): number {
  const y = [0, 40, 70, 100];
  const asc = p[3] > p[0];
  const t = asc ? x : -x, q = asc ? p : p.map(v => -v);
  if (t <= q[0]) return 0;
  if (t >= q[3]) return 100;
  for (let i = 0; i < 3; i++) if (t <= q[i + 1]) return Math.round(y[i] + (y[i + 1] - y[i]) * (t - q[i]) / (q[i + 1] - q[i]));
  return 100;
}
const semaforo = (pt: number): Semaforo => (pt < 40 ? 'rojo' : pt < 70 ? 'amarillo' : 'verde');
const ind = (id: string, nombre: string, valor: string, puntaje: number, explica: string): Indicador => ({ id, nombre, valor, puntaje, semaforo: semaforo(puntaje), explica });
const promedio = (xs: Indicador[]) => (xs.length ? Math.round(xs.reduce((s, i) => s + i.puntaje, 0) / xs.length) : null);
const categoria = (v: number): Categoria5 => (v >= 80 ? 'A' : v >= 65 ? 'B' : v >= 50 ? 'C' : v >= 35 ? 'D' : 'E');

/** Escalera de excedentes: cuánta plata sobra por encima de la reserva y hasta cuándo, en tramos de 30, 90 y 120 días.
 *  Lo que se necesita antes va al tramo corto (más líquido); nunca se le asigna a un tramo más plata de la que sobra en
 *  TODO su plazo. */
export function escalera(p: Pronostico, reserva: number, cortes = [30, 90]): ExcedenteTramo[] {
  const serie = p.serie;
  if (!serie.length) return [];
  const hs = [...cortes.filter(c => c < serie.length), serie.length];
  const minHasta = (h: number) => {
    let m = { saldo: p.saldoInicial, fecha: p.hoy };
    for (const d of serie.slice(0, h)) if (d.saldo < m.saldo) m = d;
    return m;
  };
  const disponible = (h: number) => Math.max(0, minHasta(h).saldo - reserva);
  const tramos: ExcedenteTramo[] = [];
  let previo = Math.max(0, p.saldoInicial - reserva);
  hs.forEach((h, i) => {
    const libreTodoElPlazo = disponible(h);
    // La plata que sobra hasta el corte anterior pero no hasta este se necesita cuando el saldo toca su mínimo en este tramo.
    const monto = previo - libreTodoElPlazo;
    const lim = minHasta(h).fecha;
    if (monto > 0) tramos.push(tramo(p, monto, lim));
    previo = libreTodoElPlazo;
    if (i === hs.length - 1 && libreTodoElPlazo > 0) {
      tramos.push({ monto: Math.round(libreTodoElPlazo), moneda: 'ARS', disponible_desde: p.hoy, se_necesita_el: serie[serie.length - 1].fecha, dias_horizonte: serie.length, uso_futuro: `sin destino previsto en los ${serie.length} días proyectados` });
    }
  });
  // Tramos chicos (< 3% del total o < $100.000) se suman al tramo anterior, que es más corto y por lo tanto más prudente.
  const total = tramos.reduce((s, t) => s + t.monto, 0);
  const out: ExcedenteTramo[] = [];
  for (const t of tramos) {
    if (out.length && (t.monto < 100_000 || t.monto < total * 0.03)) out[out.length - 1].monto += t.monto;
    else out.push({ ...t });
  }
  return out;
}

function tramo(p: Pronostico, monto: number, fecha: string): ExcedenteTramo {
  const dias = Math.max(1, Math.round((Date.parse(fecha) - Date.parse(p.hoy)) / 86400000));
  // Para qué se necesita: las salidas más grandes de la semana que termina en ese mínimo.
  const desde = new Date(Date.parse(fecha) - 7 * 86400000).toISOString().slice(0, 10);
  const porCat = new Map<Categoria, number>();
  for (const e of p.eventos) if (e.monto < 0 && e.fecha > desde && e.fecha <= fecha) porCat.set(e.categoria, (porCat.get(e.categoria) ?? 0) - e.monto);
  const top = [...porCat].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c]) => ETIQUETA[c].toLowerCase());
  return { monto: Math.round(monto), moneda: 'ARS', disponible_desde: p.hoy, se_necesita_el: fecha, dias_horizonte: dias, uso_futuro: top.length ? top.join(' y ') : 'pagos de esa semana' };
}

export function diagnosticar(p: Pronostico, ex: Excedente | null, r: Recomendacion, al: Alertas | null, ctx: Contexto): Tesoreria {
  const serie = p.serie;
  const meses = Math.max(1, serie.length / DIAS_MES);
  const egresoDiario = serie.reduce((s, d) => s + d.salidas, 0) / Math.max(1, serie.length);
  const nominaMes = p.eventos.filter(e => e.monto < 0 && NOMINA.has(e.categoria)).reduce((s, e) => s - e.monto, 0) / meses;
  const reserva = ex?.colchon ?? 0;
  const minimo = Math.min(p.saldoInicial, ...serie.map(d => d.saldo));
  const saldo = p.saldoInicial;

  // --- Liquidez (25%) ---
  const liq: Indicador[] = [];
  if (egresoDiario > 0) {
    const dc = saldo / egresoDiario;
    liq.push(ind('dias_caja', 'Días de caja', `${Math.round(dc)} días`, escalar(dc, [0, 15, 30, 60]),
      `Si mañana no entrara un peso, con lo que tenés pagás ${Math.max(0, Math.round(dc))} días de gastos.${dc > 90 ? ' Es mucha plata quieta: con inflación, pierde valor.' : ''}`));
  }
  if (nominaMes > 0) {
    const cn = saldo / nominaMes;
    liq.push(ind('cobertura_nomina', 'Cobertura de sueldos', `${dec(cn)} veces`, escalar(cn, [0, 1, 1.5, 3]),
      cn < 1 ? `Hoy no te alcanza para pagar un mes de sueldos y cargas (${millones(nominaMes)}) con lo que hay en caja.` : `Con la caja de hoy pagás ${dec(cn)} meses de sueldos y cargas.`));
  }
  if (reserva > 0) {
    const mr = minimo / reserva;
    liq.push(ind('margen_reserva', 'Punto más bajo frente a la reserva', minimo < 0 ? `${millones(minimo).replace('$', '−$')}` : `${Math.round(mr * 100)}% de la reserva`, escalar(mr, [-1, 0, 1, 2]),
      minimo < 0 ? `En los próximos ${serie.length} días tu caja llega a quedar en rojo. La reserva que conviene tener es ${millones(reserva)}.`
        : mr < 1 ? `Tu punto más bajo (${millones(minimo)}) queda debajo de la reserva de ${millones(reserva)}: no hay colchón completo.`
          : `Aun en tu peor día proyectado (${millones(minimo)}) seguís arriba de la reserva de ${millones(reserva)}.`));
  }

  // --- Calidad del flujo (20%) ---
  const flujo: Indicador[] = [];
  const hist = p.historia.filter(h => h.entradas > 0);
  let cv = NaN;
  if (hist.length >= 3) {
    const xs = hist.map(h => h.entradas), m = xs.reduce((a, b) => a + b, 0) / xs.length;
    cv = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) / m;
    flujo.push(ind('estabilidad', 'Estabilidad de ingresos', `varían ${Math.round(cv * 100)}%`, escalar(cv, [0.4, 0.25, 0.15, 0.05]),
      cv < 0.15 ? 'Lo que entra por mes es parecido de un mes a otro: eso da previsibilidad.' : 'Lo que entra cambia bastante de un mes a otro: hace falta más colchón.'));
    const neg = hist.filter(h => h.entradas < h.salidas).length;
    flujo.push(ind('meses_negativos', 'Meses en que salió más de lo que entró', `${neg} de ${hist.length}`, escalar(neg / hist.length, [0.6, 0.4, 0.2, 0]),
      neg ? `En ${neg} de los últimos ${hist.length} meses gastaste más de lo que entró.` : 'Todos los meses entró más de lo que salió.'));
  }

  // --- Previsión de pagos (20%): proxy del "comportamiento de pago" con lo que se ve en la proyección ---
  const pagos: Indicador[] = [];
  const diasRojo = p.huecos.reduce((s, h) => s + h.dias, 0);
  pagos.push(ind('dias_rojo', 'Días en rojo proyectados', `${diasRojo} días`, escalar(diasRojo, [30, 10, 1, 0]),
    diasRojo ? `Si nada cambia, vas a estar ${diasRojo} días sin plata para pagar. El banco puede rechazar pagos o cheques.` : 'No vemos días en rojo en la proyección.'));
  const vencidas = al?.resumen.vencidas ?? 0;
  pagos.push(ind('vencidas', 'Boletas vencidas', String(vencidas), escalar(vencidas, [3, 1, 0.5, 0]),
    vencidas ? 'Tenés pagos vencidos: suman intereses y es lo primero que mira un banco.' : 'No hay boletas vencidas cargadas.'));

  const pilares: Pilar[] = [
    { id: 'liquidez', nombre: 'Liquidez', peso: 25, puntaje: promedio(liq), indicadores: liq },
    { id: 'flujo', nombre: 'Calidad del flujo', peso: 20, puntaje: promedio(flujo), indicadores: flujo, ...(!flujo.length && { falta: 'Hacen falta al menos 3 meses de movimientos.' }) },
    { id: 'pagos', nombre: 'Previsión de pagos', peso: 20, puntaje: promedio(pagos), indicadores: pagos },
    { id: 'deuda', nombre: 'Endeudamiento y solvencia', peso: 20, puntaje: null, indicadores: [], falta: 'Cargá tus préstamos, descubiertos y bienes para medirlo.' },
    { id: 'formalidad', nombre: 'Formalidad', peso: 15, puntaje: null, indicadores: [], falta: 'Hace falta cruzar facturación con acreditaciones del banco.' },
  ];
  const medidos = pilares.filter(x => x.puntaje !== null);
  const pesoMedido = medidos.reduce((s, x) => s + x.peso, 0);
  const valor = pesoMedido ? Math.round(medidos.reduce((s, x) => s + x.puntaje! * x.peso, 0) / pesoMedido) : 0;
  const preliminar = pesoMedido < 100 || hist.length < 3;
  const rango: [number, number] | null = preliminar ? [Math.max(0, valor - 6), Math.min(100, valor + 6)] : null;
  const cat = categoria(valor);

  const estabilidad: Estabilidad = !Number.isFinite(cv) ? 'baja' : cv < 0.1 ? 'alta' : cv < 0.25 ? 'media' : 'baja';

  // --- Veredicto del tesorero ---
  let decision: Decision, titulo: string, motivo: string;
  if (p.hueco) {
    decision = 'no_invertir'; titulo = 'Todavía no: primero cubrí el hueco';
    motivo = `El ${dm(p.hueco.inicio)} te falta plata (llegás a ${millones(p.hueco.minimo).replace('$', '−$')}). Invertir ahora sería poner en riesgo pagos que ya tenés.`;
  } else if (!ex?.hay || ex.monto <= 0) {
    decision = 'no_invertir'; titulo = 'Todavía no: primero armá la reserva';
    motivo = ex?.motivo ?? 'Tu caja proyectada no deja plata por encima de la reserva.';
  } else if (cat === 'D' || cat === 'E') {
    decision = 'no_invertir'; titulo = 'Todavía no: la caja está frágil';
    motivo = `El score da ${valor} (${cat}). Aunque hoy sobre algo, conviene usarlo para ordenar la caja antes de inmovilizarlo.`;
  } else if (cat === 'C' || estabilidad === 'baja') {
    decision = 'cautela'; titulo = 'Luz amarilla: solo opciones conservadoras';
    motivo = `Te sobran ${millones(ex.monto)} sobre la reserva, pero ${cat === 'C' ? `el score es ${valor} (C)` : 'tus ingresos varían mucho'}. El Researcher queda limitado al perfil conservador.`;
  } else {
    decision = 'invertir'; titulo = 'Luz verde: podés invertir el excedente';
    motivo = `Sin huecos en ${serie.length} días, reserva de ${millones(reserva)} cubierta y score ${valor} (${cat}). Le paso los excedentes al Researcher.`;
  }

  // --- Plan de acción (top 3), por impacto ---
  const acciones: Accion[] = [];
  if (p.hueco) {
    const op = r.opciones.find(o => o.id === r.elegida) ?? r.opciones[0];
    if (op) acciones.push({ titulo: op.titulo, porque: op.detalle, impacto: op.cubre ? `Evitás ${p.hueco.dias} días en rojo` : 'Achica el faltante', plazo: `Antes del ${dm(p.hueco.inicio)}` });
    const adel = r.opciones.find(o => o.id === 'adelanto');
    if (adel && adel !== op) acciones.push({ titulo: 'Dejá acordado un descubierto antes de necesitarlo', porque: 'Un descubierto acordado es mucho más barato y seguro que uno no acordado, y evita rechazos de pagos.', impacto: `Costo estimado $${fmt(adel.costo)} si lo usás`, plazo: 'Esta semana' });
  }
  if (vencidas) acciones.push({ titulo: 'Pagá o regularizá las boletas vencidas', porque: 'Suman intereses por mora y bajan tu calificación en el banco.', impacto: 'Sube el pilar de previsión de pagos', plazo: 'Lo antes posible' });
  if (reserva > 0 && saldo < reserva) {
    const semanal = (reserva - saldo) / 12;
    acciones.push({ titulo: `Armá la reserva de ${millones(reserva)}`, porque: 'Es un mes de gastos fijos: la plata que te salva si un cliente paga tarde.', impacto: `Separando ${millones(semanal)} por semana, la completás en 3 meses`, plazo: '12 semanas' });
  }
  if (Number.isFinite(cv) && cv >= 0.25) acciones.push({ titulo: 'Bajá la dependencia de pocos meses buenos', porque: 'Tus ingresos varían mucho; sumar clientes o ventas regulares hace la caja previsible.', impacto: 'Sube el pilar de calidad del flujo', plazo: '3 a 6 meses' });
  if (decision !== 'no_invertir') {
    acciones.push({ titulo: 'Mantené la reserva quieta y líquida', porque: `Los ${millones(reserva)} de reserva no se invierten en nada con riesgo de precio: son tu seguro.`, impacto: 'Protege los pagos de los próximos 30 días', plazo: 'Siempre' });
    if (pilares.some(x => x.puntaje === null)) acciones.push({ titulo: 'Cargá tus deudas y bienes', porque: 'Sin eso no puedo medir endeudamiento ni solvencia, y el score queda preliminar.', impacto: 'Score completo y más confiable', plazo: '10 minutos' });
  }
  acciones.push({ titulo: 'Consultá tu situación en la Central de Deudores del BCRA', porque: 'Es lo primero que mira un banco. La consulta por CUIT es pública y gratuita.', impacto: 'Sabés con qué te van a evaluar', plazo: 'Hoy' });

  // --- Bloque para el Researcher (solo con luz verde o amarilla) ---
  const bloque: BloqueResearcher | null = decision === 'no_invertir' ? null : {
    fecha_corte: p.hoy,
    reserva_operativa: { monto: reserva, moneda: 'ARS', criterio: 'el mayor entre un mes de egresos fijos y un cuarto del egreso mensual' },
    deuda_cara_vigente: [],
    excedentes: escalera(p, reserva),
    score: { valor, categoria: cat, preliminar },
    estabilidad_flujo: estabilidad,
  };

  return {
    score: { valor, rango, categoria: cat, lectura: LECTURA[cat], preliminar, ...(preliminar && { motivoPreliminar: `Mide ${pesoMedido}% del score: faltan ${pilares.filter(x => x.puntaje === null).map(x => x.nombre.toLowerCase()).join(' y ')}.` }) },
    pilares, estabilidad,
    veredicto: { decision, titulo, motivo },
    acciones: acciones.slice(0, 3),
    bloque,
    tasas: { tnaPlazoFijo: ctx.tnaPlazoFijo, ipcMensual: ctx.ipcMensual, citas: { plazoFijo: ctx.citas.plazoFijo, ipc: ctx.citas.ipc, pfReal: ctx.citas.pfReal } },
    aviso: AVISO,
  };
}
