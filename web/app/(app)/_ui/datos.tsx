'use client';
// Estado de trabajo de la app ("workspace"): junta todas las fuentes que cargó el usuario (archivos, Mercado Pago,
// saldo, movimientos y facturas a mano, fotos) y recalcula con UNA llamada a /api/analizar que las manda juntas.
// Se guarda en localStorage (con tope de tamaño) junto con el último resultado, para pintar al instante al volver.
// Modo demo explícito: la pyme ficticia nunca se mezcla con datos propios.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Alertas, ComprobanteIn, Excedente, Insumo, MesCat, Pronostico, Recomendacion, RespAnalizar, Sello, Cita } from './formato';
import { hoyLocal } from './formato';

/* ---------- tipos del workspace ---------- */
export type Lado = 'recibido' | 'emitido';
export type ArchivoWs = { id: string; nombre: string; texto: string | null; bytes: number; agregado: string };
export type MovWs = { id: string; fecha: string; desc: string; monto: number; agregado: string };
/** lado 'recibido': factura de un proveedor (tengo que pagar). 'emitido': factura mía a un cliente (me tienen que pagar). */
export type FacturaWs = { id: string; lado: Lado; saldada: boolean; origen: 'manual' | 'foto'; comprobante: ComprobanteIn; agregado: string };
export type Demo = { compromisos: boolean; escenario?: 'holgada'; mp?: boolean };
export type Workspace = {
  modo: 'vacio' | 'demo' | 'propio';
  demo: Demo | null;
  mp: boolean;
  archivos: ArchivoWs[];
  saldo: { fecha: string; monto: number; agregado: string } | null;
  movimientos: MovWs[];
  facturas: FacturaWs[];
};
const VACIO: Workspace = { modo: 'vacio', demo: null, mp: false, archivos: [], saldo: null, movimientos: [], facturas: [] };

export type MpEstado = {
  cargado: boolean; configurado: boolean; conectado: boolean; modo?: string;
  cuenta?: { id: string | number; apodo?: string }; via?: 'token' | 'oauth' | 'env' | null;
};

export type Vista = {
  pyme: string; ficticia: boolean;
  pronostico: Pronostico;
  recomendacion: Recomendacion;
  alertas: Alertas | null;
  excedente: Excedente | null | undefined; // undefined: el servidor no lo calculó
  mensual: MesCat[] | null;
  ventasMensuales: number | null;
  citas: Record<string, Cita>;
  insumos: Insumo[];
  ignorados: string[];
  avisos: string[];
  resumen: { movimientos: number; recibidos: number; emitidos: number; boletas: number; empleados: number; mercadopago?: string };
};

export type VistaCarga = 'menu' | 'saldo' | 'movimiento' | 'factura' | 'archivos' | 'mp';
export type Toast = { id: number; texto: string; tono?: 'ok' | 'error'; deshacer?: () => void };
type Calculo = { desde: number; fuentes: string[] };

type Ctx = {
  ws: Workspace; vista: Vista | null; listo: boolean;
  calculando: Calculo | null; error: string | null;
  mp: MpEstado;
  sellos: Sello[];
  carga: VistaCarga | null; abrirCarga: (v?: VistaCarga) => void; cerrarCarga: () => void;
  toast: Toast | null; avisar: (t: Omit<Toast, 'id'>) => void; cerrarToast: () => void;
  cargarDemo: (d?: Partial<Demo>) => void;
  empezarPropio: () => void;
  borrarTodo: () => void;
  ponerSaldo: (fecha: string, monto: number) => void;
  quitarSaldo: () => void;
  sumarMovimiento: (m: { fecha: string; desc: string; monto: number }) => void;
  sumarFactura: (f: { lado: Lado; saldada: boolean; origen: 'manual' | 'foto'; comprobante: ComprobanteIn }) => void;
  sumarArchivos: (files: File[]) => Promise<void>;
  quitar: (tipo: 'archivo' | 'movimiento' | 'factura', id: string) => void;
  conectarToken: (token: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  usarMP: () => void;
  desconectarMP: () => Promise<void>;
  recalcular: () => void;
  agregarSello: (s: Sello) => void;
};

const C = createContext<Ctx | null>(null);
const CLAVE_WS = 'cfo-ws-v2';
const CLAVE_RES = 'cfo-ultimo-v2';
const CLAVE_SELLOS = 'cfo-app-sellos';
const CLAVE_OAUTH = 'cfo-mp-oauth';
const TOPE_TEXTO = 1_500_000; // bytes de CSV que guardamos en el navegador para poder recalcular
const PYME_DEMO = 'La Esquina de Nueva Córdoba';
const PYME_MP_DEMO = 'Carpintería Los Aromos';

const leer = <T,>(k: string): T | null => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) as T : null; } catch { return null; } };
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const borrar = (k: string) => { try { localStorage.removeItem(k); } catch { /* sin storage */ } };
const nuevoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const ahora = () => new Date().toISOString();

/** Hay algo para calcular. */
export const hayFuentes = (w: Workspace) =>
  w.modo === 'demo' || w.mp || w.archivos.some(a => a.texto) || !!w.saldo || w.movimientos.length > 0 || w.facturas.some(f => !f.saldada);

/** Etiquetas de lo que se manda, para el progreso. */
export function fuentesDe(w: Workspace): string[] {
  if (w.modo === 'demo') return [w.demo?.mp ? 'Mercado Pago simulado' : 'Pyme demo', ...(w.demo?.compromisos ? ['boletas y nómina'] : [])];
  const f: string[] = [];
  if (w.mp) f.push('Mercado Pago');
  const n = w.archivos.filter(a => a.texto).length;
  if (n) f.push(n === 1 ? '1 archivo' : `${n} archivos`);
  if (w.saldo) f.push('saldo');
  if (w.movimientos.length) f.push(w.movimientos.length === 1 ? '1 movimiento' : `${w.movimientos.length} movimientos`);
  const fa = w.facturas.filter(x => !x.saldada).length;
  if (fa) f.push(fa === 1 ? '1 factura' : `${fa} facturas`);
  return f;
}

// La API valida strings (no null): limpiamos lo que venga vacío de la foto o del formulario.
function limpiar(c: ComprobanteIn) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c)) if (v !== null && v !== undefined && v !== '') o[k] = v;
  return o;
}

function pedido(w: Workspace): RequestInit {
  const base: Record<string, unknown> = {};
  if (w.modo === 'demo') {
    base.demo = true;
    base.compromisos = !!w.demo?.compromisos;
    if (w.demo?.escenario) base.escenario = w.demo.escenario;
    if (w.demo?.mp) base.fuente = 'mp';
  } else {
    if (w.mp) base.fuente = 'mp';
    // `manual` va siempre en modo propio (aunque esté vacío): un JSON sin fuentes el servidor lo toma como demo.
    const manual: Record<string, unknown> = {};
    if (w.saldo) manual.saldo = { fecha: w.saldo.fecha, monto: w.saldo.monto };
    if (w.movimientos.length) manual.movimientos = w.movimientos.map(({ fecha, desc, monto }) => ({ fecha, desc, monto }));
    const comprobantes = w.facturas.filter(f => !f.saldada).map(f => ({ lado: f.lado, comprobante: limpiar(f.comprobante) }));
    if (comprobantes.length) manual.comprobantes = comprobantes;
    base.manual = manual;
  }
  const archivos = w.modo === 'propio' ? w.archivos.filter(a => a.texto) : [];
  if (archivos.length) {
    const fd = new FormData();
    for (const a of archivos) fd.append('archivos', new File([a.texto!], a.nombre, { type: 'text/csv' }));
    for (const [k, v] of Object.entries(base)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
    return { method: 'POST', body: fd };
  }
  return { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(base) };
}

function armar(w: Workspace, a: RespAnalizar, mp: MpEstado): Vista {
  const d = a.dashboard;
  const demo = w.modo === 'demo';
  const pyme = demo ? (w.demo?.mp ? PYME_MP_DEMO : d?.pyme && d.pyme !== 'Mi pyme' ? d.pyme : PYME_DEMO)
    : w.mp && mp.cuenta?.apodo ? mp.cuenta.apodo : 'Tu negocio';
  const eventos = d?.eventos?.length ? d.eventos : a.pronostico.eventos;
  return {
    pyme, ficticia: demo,
    pronostico: { ...a.pronostico, eventos },
    recomendacion: a.recomendacion,
    alertas: a.alertas ?? null,
    excedente: a.excedente,
    mensual: d?.mensual?.length ? d.mensual : null,
    ventasMensuales: d?.ventasMensuales ?? null,
    citas: a.citas ?? {},
    insumos: a.resumen.insumos ?? [],
    ignorados: a.resumen.ignorados ?? [],
    avisos: a.resumen.avisos ?? [],
    resumen: { movimientos: a.resumen.movimientos, recibidos: a.resumen.recibidos, emitidos: a.resumen.emitidos, boletas: a.resumen.boletas ?? 0, empleados: a.resumen.empleados ?? 0, mercadopago: a.resumen.mercadopago },
  };
}

// Guarda el workspace recortando los CSV más viejos si se pasa del tope (quedan listados para volver a subirlos).
function persistir(w: Workspace) {
  let total = 0;
  const archivos = [...w.archivos].reverse().map(a => {
    if (!a.texto) return a;
    total += a.texto.length;
    return total > TOPE_TEXTO ? { ...a, texto: null } : a;
  }).reverse();
  if (!guardar(CLAVE_WS, { ...w, archivos })) guardar(CLAVE_WS, { ...w, archivos: archivos.map(a => ({ ...a, texto: null })) });
}

export function DatosProvider({ children }: { children: ReactNode }) {
  const [ws, setWs] = useState<Workspace>(VACIO);
  const [res, setRes] = useState<RespAnalizar | null>(null);
  const [listo, setListo] = useState(false); // ya se leyó el storage
  const [calculando, setCalculando] = useState<Calculo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mp, setMp] = useState<MpEstado>({ cargado: false, configurado: false, conectado: false });
  const [sellos, setSellos] = useState<Sello[]>([]);
  const [carga, setCarga] = useState<VistaCarga | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [rev, setRev] = useState(0); // sube con cada cambio que pide recalcular
  const turno = useRef(0);
  const wsRef = useRef(ws);
  wsRef.current = ws;

  const avisar = useCallback((t: Omit<Toast, 'id'>) => setToast({ ...t, id: Date.now() }), []);
  const cerrarToast = useCallback(() => setToast(null), []);

  /** Cambia el workspace y agenda el recálculo. Cargar algo propio estando en la demo sale de la demo. */
  const cambiar = useCallback((f: (w: Workspace) => Workspace, salirDemo = true) => {
    setWs(prev => {
      const base = salirDemo && prev.modo !== 'propio' ? { ...VACIO, modo: 'propio' as const } : prev;
      const n = f(base);
      persistir(n);
      return n;
    });
    setRev(r => r + 1);
  }, []);

  const calcular = useCallback(async (w: Workspace) => {
    const t = ++turno.current;
    if (!hayFuentes(w)) { setCalculando(null); setRes(null); setError(null); borrar(CLAVE_RES); return; }
    setCalculando({ desde: Date.now(), fuentes: fuentesDe(w) }); setError(null);
    try {
      const r = await fetch('/api/analizar', pedido(w));
      const j = await r.json().catch(() => ({}));
      if (t !== turno.current) return;
      if (!r.ok) throw new Error((j as { error?: string }).error ?? `El servidor respondió ${r.status}.`);
      setRes(j as RespAnalizar);
      if (!guardar(CLAVE_RES, j)) borrar(CLAVE_RES);
    } catch (e) {
      if (t !== turno.current) return;
      const m = e instanceof Error ? e.message : '';
      setError(m && !/fetch/i.test(m) ? m : 'Se cortó la conexión con el servidor. Revisá tu internet y probá de nuevo.');
    } finally {
      if (t === turno.current) setCalculando(null);
    }
  }, []);

  // Recalcula (con un respiro para juntar cambios seguidos) cada vez que cambia el workspace.
  useEffect(() => {
    if (!rev) return;
    const id = setTimeout(() => calcular(wsRef.current), 200);
    return () => clearTimeout(id);
  }, [rev, calcular]);

  const recalcular = useCallback(() => setRev(r => r + 1), []);

  const leerMP = useCallback(async () => {
    try {
      const r = await fetch('/api/mp/estado', { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMp({ cargado: true, configurado: false, conectado: false }); return null; }
      const e: MpEstado = { cargado: true, configurado: !!j.configurado, conectado: !!j.conectado, modo: j.modo, cuenta: j.cuenta, via: j.via ?? null };
      setMp(e);
      return e;
    } catch { setMp({ cargado: true, configurado: false, conectado: false }); return null; }
  }, []);

  // Arranque: storage, ?demo=1 para presentaciones, vuelta del OAuth (?mp=conectado|error).
  useEffect(() => {
    const w = leer<Workspace>(CLAVE_WS);
    const r = leer<RespAnalizar>(CLAVE_RES);
    const sl = leer<Sello[]>(CLAVE_SELLOS);
    if (sl) setSellos(sl);
    const q = new URLSearchParams(window.location.search);
    const pideDemo = q.get('demo');
    const vueltaMP = q.get('mp');
    if (pideDemo || vueltaMP) { q.delete('demo'); q.delete('mp'); history.replaceState(null, '', window.location.pathname + (q.size ? `?${q}` : '') + window.location.hash); }

    let inicial: Workspace = w && w.modo ? { ...VACIO, ...w } : VACIO;
    if (pideDemo === '1' || pideDemo === 'true' || pideDemo === 'holgada') {
      inicial = { ...VACIO, modo: 'demo', demo: { compromisos: false, ...(pideDemo === 'holgada' && { escenario: 'holgada' }) } };
      persistir(inicial);
    } else if (r && hayFuentes(inicial)) setRes(r);
    setWs(inicial);
    setListo(true);

    leerMP().then(e => {
      const pedido = leer<boolean>(CLAVE_OAUTH);
      if (vueltaMP === 'error') { borrar(CLAVE_OAUTH); avisar({ texto: 'Mercado Pago no autorizó la conexión. Probá de nuevo o pegá tu Access Token.', tono: 'error' }); }
      else if ((vueltaMP === 'conectado' || pedido) && e?.conectado) {
        borrar(CLAVE_OAUTH);
        avisar({ texto: 'Conectamos tu cuenta de Mercado Pago. Trayendo cobros y pagos…', tono: 'ok' });
        setWs(prev => { const n = { ...(prev.modo === 'propio' ? prev : { ...VACIO, modo: 'propio' as const }), mp: true }; persistir(n); return n; });
        setRev(x => x + 1);
        return;
      }
    });
    if (hayFuentes(inicial)) setRev(x => x + 1); // refresca en segundo plano lo cacheado
  }, [leerMP, avisar]);

  /* ---------- acciones ---------- */
  const cargarDemo = useCallback((d: Partial<Demo> = {}) => {
    cambiar(() => ({ ...VACIO, modo: 'demo', demo: { compromisos: false, ...d } }), false);
  }, [cambiar]);
  const empezarPropio = useCallback(() => {
    setRes(null); setError(null); borrar(CLAVE_RES);
    cambiar(() => ({ ...VACIO }), false);
  }, [cambiar]);
  const borrarTodo = useCallback(() => {
    turno.current++;
    setRes(null); setError(null); setCalculando(null); setSellos([]);
    [CLAVE_WS, CLAVE_RES, CLAVE_SELLOS, CLAVE_OAUTH].forEach(borrar);
    setWs(VACIO);
    if (mp.via === 'token' || mp.via === 'oauth') fetch('/api/mp/token', { method: 'DELETE' }).then(() => leerMP()).catch(() => {});
    avisar({ texto: 'Borramos tus datos de este navegador.', tono: 'ok' });
  }, [avisar, leerMP, mp.via]);

  const ponerSaldo = useCallback((fecha: string, monto: number) => {
    const antes = wsRef.current;
    cambiar(w => ({ ...w, saldo: { fecha, monto, agregado: ahora() } }));
    avisar({ texto: 'Saldo cargado. Recalculando tu proyección…', tono: 'ok', deshacer: antes.modo === 'propio' ? () => cambiar(w => ({ ...w, saldo: antes.saldo })) : undefined });
  }, [cambiar, avisar]);
  const quitarSaldo = useCallback(() => cambiar(w => ({ ...w, saldo: null })), [cambiar]);

  const sumarMovimiento = useCallback((m: { fecha: string; desc: string; monto: number }) => {
    const id = nuevoId();
    cambiar(w => ({ ...w, movimientos: [...w.movimientos, { ...m, id, agregado: ahora() }] }));
    avisar({ texto: `${m.monto >= 0 ? 'Ingreso' : 'Egreso'} cargado. Recalculando…`, tono: 'ok', deshacer: () => cambiar(w => ({ ...w, movimientos: w.movimientos.filter(x => x.id !== id) })) });
  }, [cambiar, avisar]);

  const sumarFactura = useCallback((f: { lado: Lado; saldada: boolean; origen: 'manual' | 'foto'; comprobante: ComprobanteIn }) => {
    const id = nuevoId();
    cambiar(w => ({ ...w, facturas: [...w.facturas, { ...f, id, agregado: ahora() }] }));
    avisar({ texto: f.saldada ? 'Factura guardada como ya saldada: no cambia la proyección.' : 'Factura cargada. Recalculando…', tono: 'ok', deshacer: () => cambiar(w => ({ ...w, facturas: w.facturas.filter(x => x.id !== id) })) });
  }, [cambiar, avisar]);

  const sumarArchivos = useCallback(async (files: File[]) => {
    const leidos = await Promise.all(files.map(async f => ({ id: nuevoId(), nombre: f.name, texto: await f.text(), bytes: f.size, agregado: ahora() })));
    cambiar(w => ({ ...w, archivos: [...w.archivos.filter(a => !leidos.some(l => l.nombre === a.nombre)), ...leidos] }));
    avisar({ texto: `${leidos.length === 1 ? `Subiste ${leidos[0].nombre}` : `Subiste ${leidos.length} archivos`}. Recalculando…`, tono: 'ok' });
  }, [cambiar, avisar]);

  const quitar = useCallback((tipo: 'archivo' | 'movimiento' | 'factura', id: string) => {
    const antes = wsRef.current;
    cambiar(w => tipo === 'archivo' ? { ...w, archivos: w.archivos.filter(x => x.id !== id) }
      : tipo === 'movimiento' ? { ...w, movimientos: w.movimientos.filter(x => x.id !== id) }
        : { ...w, facturas: w.facturas.filter(x => x.id !== id) });
    avisar({ texto: 'Lo sacamos. Recalculando…', deshacer: () => cambiar(() => antes) });
  }, [cambiar, avisar]);

  const conectarToken = useCallback(async (token: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const r = await fetch('/api/mp/token', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
      if (r.status === 404) return { ok: false, error: 'Este servidor todavía no acepta tokens de Mercado Pago. Probá con la demo mientras tanto.' };
      const j = await r.json().catch(() => ({}));
      const pista = 'Revisá que sea el Access Token de producción y que lo hayas copiado completo.';
      if (!r.ok || !j.conectado) return { ok: false, error: j.error ? `${String(j.error).replace(/\.$/, '')}. ${pista}` : `Mercado Pago no aceptó el token (error ${r.status}). ${pista}` };
      setMp(m => ({ ...m, cargado: true, conectado: true, cuenta: j.cuenta, via: 'token', modo: 'api' }));
      setWs(prev => { const n = { ...(prev.modo === 'propio' ? prev : { ...VACIO, modo: 'propio' as const }), mp: true }; persistir(n); return n; });
      setRev(x => x + 1);
      avisar({ texto: 'Cuenta conectada. Trayendo tus cobros y pagos…', tono: 'ok' });
      return { ok: true };
    } catch { return { ok: false, error: 'Se cortó la conexión. Revisá tu internet y probá de nuevo.' }; }
  }, [avisar]);

  const usarMP = useCallback(() => {
    cambiar(w => ({ ...w, mp: true }));
    avisar({ texto: 'Sumamos Mercado Pago. Trayendo cobros y pagos…', tono: 'ok' });
  }, [cambiar, avisar]);

  const desconectarMP = useCallback(async () => {
    try { await fetch('/api/mp/token', { method: 'DELETE' }); } catch { /* igual lo sacamos del cálculo */ }
    await leerMP();
    cambiar(w => ({ ...w, mp: false }), false);
    avisar({ texto: 'Desconectamos Mercado Pago. Ya no usamos sus datos.' });
  }, [cambiar, leerMP, avisar]);

  const agregarSello = useCallback((s: Sello) => {
    setSellos(prev => { const n = [s, ...prev.filter(x => x.hash !== s.hash)]; guardar(CLAVE_SELLOS, n); return n; });
  }, []);

  const abrirCarga = useCallback((v: VistaCarga = 'menu') => setCarga(v), []);
  const cerrarCarga = useCallback(() => setCarga(null), []);

  const vista = useMemo(() => (res && ws.modo !== 'vacio' ? armar(ws, res, mp) : null), [res, ws, mp]);

  const valor = useMemo<Ctx>(() => ({
    ws, vista, listo, calculando, error, mp, sellos, carga, abrirCarga, cerrarCarga, toast, avisar, cerrarToast,
    cargarDemo, empezarPropio, borrarTodo, ponerSaldo, quitarSaldo, sumarMovimiento, sumarFactura, sumarArchivos, quitar,
    conectarToken, usarMP, desconectarMP, recalcular, agregarSello,
  }), [ws, vista, listo, calculando, error, mp, sellos, carga, abrirCarga, cerrarCarga, toast, avisar, cerrarToast,
    cargarDemo, empezarPropio, borrarTodo, ponerSaldo, quitarSaldo, sumarMovimiento, sumarFactura, sumarArchivos, quitar,
    conectarToken, usarMP, desconectarMP, recalcular, agregarSello]);
  return <C.Provider value={valor}>{children}</C.Provider>;
}

export function useDatos() {
  const c = useContext(C);
  if (!c) throw new Error('useDatos fuera de DatosProvider');
  return c;
}

/** Hay una cuenta de Mercado Pago utilizable: conectada en este navegador o configurada en el servidor. */
export const mpDisponible = (mp: MpEstado) => mp.conectado || mp.via === 'env';

/** Marca de OAuth en curso: al volver de Mercado Pago, sumamos la cuenta aunque no llegue el ?mp=conectado. */
export const marcarOAuth = () => guardar(CLAVE_OAUTH, true);

/** Checklist de lo cargado: lo que ya sabemos de la caja. */
export function progreso(ws: Workspace, v: Vista | null) {
  const r = v?.resumen;
  const saldo = !!ws.saldo || ws.mp || (r?.movimientos ?? 0) > 0 || ws.modo === 'demo';
  const movimientos = ws.movimientos.length > 0 || (r?.movimientos ?? 0) > 0 || ws.mp;
  const facturas = ws.facturas.length > 0 || (r ? r.recibidos + r.emitidos > 0 : false);
  const vencimientos = (r?.boletas ?? 0) > 0 || ws.facturas.some(f => !!f.comprobante.fecha_vencimiento)
    || (v?.pronostico.eventos.some(e => e.monto < 0 && e.origen !== 'proyección de ventas' && e.origen !== 'recurrente') ?? false);
  return [
    { id: 'saldo', label: 'Saldo', hecho: saldo, ayuda: 'Cuánta plata tenés hoy', carga: 'saldo' as const },
    { id: 'movimientos', label: 'Movimientos', hecho: movimientos, ayuda: 'Lo que entró y salió', carga: 'archivos' as const },
    { id: 'facturas', label: 'Facturas', hecho: facturas, ayuda: 'Lo que te deben y lo que debés', carga: 'factura' as const },
    { id: 'vencimientos', label: 'Vencimientos', hecho: vencimientos, ayuda: 'Cuándo hay que pagar', carga: 'factura' as const },
  ];
}

export const nombreFuente = (ws: Workspace) =>
  ws.modo === 'vacio' ? 'Sin datos todavía' : ws.modo === 'demo' ? (ws.demo?.mp ? 'Demo · Mercado Pago simulado' : 'Demo · pyme ficticia') : fuentesDe(ws).join(' · ') || 'Tus datos';

export { hoyLocal };
