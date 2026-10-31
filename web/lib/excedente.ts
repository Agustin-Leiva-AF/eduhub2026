// Excedente de caja: cuánta plata sobra de forma segura y por cuánto tiempo, y qué CLASES de colocación
// (nunca emisores ni productos con nombre) encajan en esa ventana. La derivación a una ALyC es aparte y con consentimiento.
import { fmt, type Pronostico } from './forecast';
import type { Cita, Contexto } from './openarg';

export type ClaseColocacion = {
  id: 'liquidez_diaria' | 'plazo_fijo' | 'caucion' | 'renta_fija_corta';
  nombre: string;                       // genérico: "Fondo de liquidez diaria", "Plazo fijo", "Caución", "Renta fija a corto plazo"
  plazoMinDias: number;
  liquidez: 'inmediata' | '24 h' | 'al vencimiento';
  riesgo: 'bajo' | 'medio';
  tnaRef: number | null;                // % TNA de referencia (BCRA vía OpenARG) o null si no hay dato
  encaja: boolean;                      // el plazo mínimo entra en la ventana sin tocar el colchón
  nota: string;                         // una línea en lenguaje simple
  cita?: Cita;
};

export type Excedente = {
  hay: boolean;
  saldoActual: number;
  colchon: number;                      // reserva intocable (p. ej. un mes de egresos fijos)
  monto: number;                        // excedente invertible con seguridad (0 si no hay)
  ventana: { desde: string; hasta: string; dias: number } | null;
  minimoProyectado: number;
  rendimiento: { tna: number; pesos: number; realPesos: number } | null; // pesos en la ventana; real = descontada la inflación proyectada
  clases: ClaseColocacion[];
  motivo?: string;                      // por qué no hay excedente
  aviso: string;
};


// Parámetros de la reserva: el mayor entre un mes de egresos fijos y un % del egreso mensual medio.
const PCT_EGRESO_MENSUAL = 0.25;
const FIJOS = new Set(['sueldos', 'cargas_sociales', 'alquiler', 'impuestos']);
const DIAS_MES = 30.4;
const AVISO = 'Esto es una estimación con tus números, no asesoramiento financiero. Antes de colocar plata, comparás condiciones con la entidad que elijas y no tocás la reserva.';

const fechaCorta = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;
const pesos = (n: number) => `$${fmt(n)}`;

// Reserva intocable: máx(egresos fijos mensuales promedio del horizonte, 25% del egreso mensual medio proyectado).
// Los fijos salen de los eventos proyectados (sueldos, cargas, alquiler, impuestos: nómina cargada, boletas o recurrentes
// aprendidos del extracto), promediados por mes para no depender de qué mes trae un impuesto.
function calcularColchon(p: Pronostico): number {
  const meses = Math.max(1, p.serie.length / DIAS_MES);
  const fijos = p.eventos.filter(e => e.monto < 0 && FIJOS.has(e.categoria)).reduce((s, e) => s - e.monto, 0) / meses;
  const egresos = p.serie.reduce((s, d) => s + d.salidas, 0) / meses;
  return Math.round(Math.max(fijos, egresos * PCT_EGRESO_MENSUAL));
}

export function calcularExcedente(p: Pronostico, ctx: Contexto): Excedente {
  const saldoActual = Math.round(p.saldoInicial);
  const colchon = calcularColchon(p);
  const serie = p.serie;

  // Ventana segura: hasta el último día antes de que el saldo proyectado baje del colchón (tope: el horizonte).
  let k = serie.findIndex(d => d.saldo < colchon);
  if (k < 0) k = serie.length;
  // Sin egresos aprendidos la reserva da 0 y todo el saldo parecería excedente: sin historial no se calcula.
  const sinHistorial = colchon <= 0;
  const sinVentana = sinHistorial || k === 0 || saldoActual < colchon;
  const tramo = sinVentana ? [] : serie.slice(0, k);
  const minimoProyectado = tramo.length ? Math.min(saldoActual, ...tramo.map(d => d.saldo)) : Math.min(saldoActual, ...serie.map(d => d.saldo));
  const monto = sinVentana ? 0 : Math.max(0, minimoProyectado - colchon);
  const ventana = !sinVentana && monto > 0 ? { desde: p.hoy, hasta: tramo[tramo.length - 1].fecha, dias: tramo.length } : null;

  const cPF = ctx.citas.plazoFijo;
  const tna = ctx.tnaPlazoFijo;
  const def: Omit<ClaseColocacion, 'encaja'>[] = [
    { id: 'liquidez_diaria', nombre: 'Fondo de liquidez diaria', plazoMinDias: 0, liquidez: 'inmediata', riesgo: 'bajo', tnaRef: tna,
      nota: 'Rescatás cuando quieras. La tasa mostrada es la del plazo fijo, que usamos como referencia aproximada: la real varía y no tenemos un dato propio.', cita: cPF },
    { id: 'plazo_fijo', nombre: 'Plazo fijo', plazoMinDias: 30, liquidez: 'al vencimiento', riesgo: 'bajo', tnaRef: tna,
      nota: 'Plata inmovilizada al menos 30 días a tasa conocida de antemano.', cita: cPF },
    { id: 'caucion', nombre: 'Caución', plazoMinDias: 1, liquidez: 'al vencimiento', riesgo: 'bajo', tnaRef: null,
      nota: 'Préstamo garantizado a 1-7 días, para sobrantes muy cortos. No tenemos una tasa de referencia cargada: consultala al momento de operar.' },
    { id: 'renta_fija_corta', nombre: 'Renta fija a corto plazo', plazoMinDias: 60, liquidez: '24 h', riesgo: 'medio', tnaRef: null,
      nota: 'Instrumentos de deuda de corto plazo: pueden rendir más, pero el precio varía y podés perder en el camino. Sin tasa de referencia cargada.' },
  ];
  const clases: ClaseColocacion[] = def.map(c => ({ ...c, encaja: !!ventana && c.plazoMinDias <= ventana.dias }));

  let rendimiento: Excedente['rendimiento'] = null;
  let aviso = AVISO;
  if (ventana) {
    // Mejor clase que encaja con tasa de referencia; si empatan, el plazo fijo (dato real) antes que el proxy del fondo.
    const orden: ClaseColocacion['id'][] = ['plazo_fijo', 'liquidez_diaria'];
    const mejor = clases.filter(c => c.encaja && c.tnaRef !== null)
      .sort((a, b) => b.tnaRef! - a.tnaRef! || orden.indexOf(a.id) - orden.indexOf(b.id))[0];
    if (mejor) {
      const bruto = monto * mejor.tnaRef! / 100 * ventana.dias / 365;
      const inflacion = monto * (Math.pow(1 + ctx.ipcMensual, ventana.dias / DIAS_MES) - 1);
      rendimiento = { tna: mejor.tnaRef!, pesos: Math.round(bruto), realPesos: Math.round(bruto - inflacion) };
      if (rendimiento.realPesos < 0) {
        mejor.nota += ` Ojo: con la inflación proyectada, en ${ventana.dias} días perdés ${pesos(-rendimiento.realPesos)} de poder de compra (nominalmente ganás ${pesos(rendimiento.pesos)}); en el último semestre el plazo fijo rindió ${ctx.citas.pfReal.valor} real.`;
      }
    }
    if (ventana.dias < serie.length) {
      aviso += ` La ventana es corta: el ${fechaCorta(serie[k].fecha)} la caja proyectada baja de la reserva.`;
    }
  }

  let motivo: string | undefined;
  if (!ventana) {
    if (sinHistorial) motivo = 'Todavía no tengo tus gastos: con solo el saldo no puedo saber cuánto te sobra de forma segura. Cargá movimientos o conectá Mercado Pago para calcularlo.';
    else if (saldoActual < colchon || k === 0) motivo = `Hoy tu caja (${pesos(saldoActual)}) no supera la reserva de ${pesos(colchon)}, el mayor entre un mes de gastos fijos y un cuarto de tus egresos mensuales. No hay excedente para colocar.`;
    else motivo = `Tu caja no queda por encima de la reserva de ${pesos(colchon)} en el tramo seguro. No hay excedente para colocar.`;
  }

  return { hay: !!ventana, saldoActual, colchon, monto: Math.round(monto), ventana, minimoProyectado: Math.round(minimoProyectado), rendimiento, clases, ...(motivo && { motivo }), aviso };
}
