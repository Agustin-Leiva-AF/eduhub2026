// Contexto macro desde la caché local de OpenARG (data/openarg_cache.json, generada con scripts/build-openarg-cache.mjs).
// La demo no depende de la red: si la caché no está, la app no arranca (es un error de build, no de demo).
import cache from '../data/openarg_cache.json';

type Serie = { nombre: string; tabla: string; fuente: string; url: string; filas: Record<string, string | number>[] };
const series = (cache as { series: Serie[] }).series;
const buscar = (txt: string) => {
  const s = series.find(x => x.nombre.startsWith(txt));
  if (!s) throw new Error(`Serie OpenARG no encontrada en caché: ${txt}`);
  return s;
};
const ultima = (s: Serie) => s.filas[s.filas.length - 1];
const mes = (f: string | number) => {
  const [y, m] = String(f).slice(0, 7).split('-');
  return `${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][+m - 1]}-${y.slice(2)}`;
};

export type Cita = { dato: string; valor: string; periodo: string; fuente: string; tabla: string; url: string };
export type Contexto = {
  ipcMensual: number; tnaAdelantos: number; tnaDocumentos: number; tnaPlazoFijo: number;
  irregularidad: number; irregularidadAntes: number; pfRealSemestre: number;
  citas: Record<'ipc' | 'adelantos' | 'documentos' | 'plazoFijo' | 'irregularidad' | 'pfReal', Cita>;
};

export function contexto(): Contexto {
  const ipc = buscar('IPC nacional'), tasas = buscar('Tasas BCRA'), irr = buscar('Irregularidad');
  const i = ultima(ipc), t = ultima(tasas), r = ultima(irr), r0 = irr.filas[0];
  const ipcMensual = +i.ipc_ng_nacional_tasa_variacion_mensual;
  // Plazo fijo real del semestre: capitalización mensual de la TNA vs IPC acumulado, mismos meses
  const sem = tasas.filas.slice(-6), semIpc = ipc.filas.slice(-6);
  const pf = sem.reduce((a, f) => a * (1 + +f.tasas_interes_plazo_fijo_30_59_dias / 1200), 1);
  const inf = semIpc.reduce((a, f) => a * (1 + +f.ipc_ng_nacional_tasa_variacion_mensual), 1);
  const cita = (s: Serie, dato: string, valor: string, periodo: string): Cita => ({ dato, valor, periodo, fuente: s.fuente, tabla: s.tabla, url: s.url });
  const p = (x: number, d = 1) => `${x.toFixed(d).replace('.', ',')}%`;
  return {
    ipcMensual,
    tnaAdelantos: +t.tasas_interes_adelantos_cc,
    tnaDocumentos: +t.tasas_interes_activas_documentos,
    tnaPlazoFijo: +t.tasas_interes_plazo_fijo_30_59_dias,
    irregularidad: +r.sistema_finan_5_irregularidad_cartera_privada,
    irregularidadAntes: +r0.sistema_finan_5_irregularidad_cartera_privada,
    pfRealSemestre: pf / inf - 1,
    citas: {
      ipc: cita(ipc, 'Inflación mensual (INDEC)', p(ipcMensual * 100), mes(i.indice_tiempo)),
      adelantos: cita(tasas, 'Tasa adelantos en cuenta corriente (BCRA)', p(+t.tasas_interes_adelantos_cc) + ' TNA', mes(t.indice_tiempo)),
      documentos: cita(tasas, 'Tasa descuento de documentos (BCRA)', p(+t.tasas_interes_activas_documentos) + ' TNA', mes(t.indice_tiempo)),
      plazoFijo: cita(tasas, 'Tasa plazo fijo 30-59 días (BCRA)', p(+t.tasas_interes_plazo_fijo_30_59_dias) + ' TNA', mes(t.indice_tiempo)),
      irregularidad: cita(irr, 'Irregularidad cartera privada (BCRA)', `${p(+r0.sistema_finan_5_irregularidad_cartera_privada)} → ${p(+r.sistema_finan_5_irregularidad_cartera_privada)}`, `${mes(r0.indice_tiempo)} a ${mes(r.indice_tiempo)}`),
      pfReal: cita(tasas, 'Plazo fijo real, últimos 6 meses (BCRA + INDEC)', p((pf / inf - 1) * 100), `${mes(sem[0].indice_tiempo)} a ${mes(t.indice_tiempo)}`),
    },
  };
}
