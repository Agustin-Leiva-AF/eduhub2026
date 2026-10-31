'use client';
// Provider de datos de la app: carga el análisis (demo por defecto), lo cachea en sessionStorage y lo comparte.
// Fuente principal: /api/analizar (MP, boletas, nómina, alertas, excedente). /api/dashboard suma lo que solo él trae
// (eventos de ventas, meses por categoría, ventas promedio). Si uno de los dos falla, la app sigue con el otro.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Alertas, Excedente, Insumo, MesCat, Pronostico, Recomendacion, RespAnalizar, RespDashboard, Sello, Cita } from './formato';

export type Fuente =
  | { tipo: 'demo'; compromisos: boolean; escenario?: 'holgada' }
  | { tipo: 'mp' }
  | { tipo: 'archivos'; nombres: string[] };

type Estado = 'inicial' | 'cargando' | 'listo' | 'error';

export type Vista = {
  pyme: string; ficticia: boolean;
  pronostico: Pronostico;
  recomendacion: Recomendacion;
  alertas: Alertas | null;
  excedente: Excedente | null | undefined; // undefined: el servidor todavía no lo calcula
  mensual: MesCat[] | null;
  ventasMensuales: number | null;
  citas: Record<string, Cita>;
  insumos: Insumo[];
  ignorados: string[];
  resumen: { movimientos: number; recibidos: number; emitidos: number; boletas: number; empleados: number; mercadopago?: string };
  mensaje: string | null;
};

type Ctx = {
  estado: Estado; error: string | null; aviso: string | null; completando: boolean;
  fuente: Fuente | null; vista: Vista | null;
  sellos: Sello[];
  cargarDemo: (compromisos?: boolean, escenario?: 'holgada') => Promise<void>;
  cargarMP: () => Promise<void>;
  subir: (files: File[]) => Promise<void>;
  agregarSello: (s: Sello) => void;
  sumarFoto: (comprobante: object, lado: 'recibido' | 'emitido') => Promise<void>;
};

const C = createContext<Ctx | null>(null);
const CLAVE = 'cfo-app-v1';
const CLAVE_SELLOS = 'cfo-app-sellos';
const PYME_DEMO = 'La Esquina de Nueva Córdoba';
const PYME_MP = 'Carpintería Los Aromos';

const leer = <T,>(k: string): T | null => { try { const s = sessionStorage.getItem(k); return s ? JSON.parse(s) as T : null; } catch { return null; } };
const guardar = (k: string, v: unknown) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* sin storage o sin cuota */ } };

async function pedir<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, { method: 'POST', ...init });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `El servidor respondió ${res.status}.`);
  return j as T;
}

function armar(fuente: Fuente, a: RespAnalizar | null, d: RespDashboard | null): Vista | null {
  const base = a ?? d;
  if (!base) return null;
  const pyme = fuente.tipo === 'mp' ? PYME_MP : fuente.tipo === 'demo' ? PYME_DEMO : (d?.pyme && d.pyme !== 'Mi pyme' ? d.pyme : 'Mi pyme');
  // El pronóstico de /api/analizar no trae las acreditaciones de ventas; las del dashboard sirven para el detalle diario
  // solo cuando ambos parten de los mismos archivos (sin boletas ni nómina extra).
  const mismos = a && d && a.resumen.boletas === 0 && a.resumen.empleados === 0 && fuente.tipo !== 'mp';
  const pronostico = a ? (mismos ? { ...a.pronostico, eventos: d!.pronostico.eventos } : a.pronostico) : d!.pronostico;
  return {
    pyme, ficticia: fuente.tipo !== 'archivos',
    pronostico,
    recomendacion: (a ?? d)!.recomendacion,
    alertas: a?.alertas ?? null,
    excedente: a ? a.excedente : d?.excedente,
    mensual: fuente.tipo !== 'mp' ? d?.mensual ?? null : null,
    ventasMensuales: d?.ventasMensuales ?? null,
    citas: base.citas,
    insumos: (a ?? d)!.resumen.insumos,
    ignorados: (a ?? d)!.resumen.ignorados,
    resumen: { movimientos: base.resumen.movimientos, recibidos: base.resumen.recibidos, emitidos: base.resumen.emitidos, boletas: a?.resumen.boletas ?? 0, empleados: a?.resumen.empleados ?? 0, mercadopago: a?.resumen.mercadopago },
    mensaje: a?.mensaje.texto ?? null,
  };
}

export function DatosProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('inicial');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fuente, setFuente] = useState<Fuente | null>(null);
  const [crudo, setCrudo] = useState<{ a: RespAnalizar | null; d: RespDashboard | null }>({ a: null, d: null });
  const [sellos, setSellos] = useState<Sello[]>([]);
  const [completando, setCompletando] = useState(false);
  const turno = useRef(0);

  const correr = useCallback(async (f: Fuente, analizar: RequestInit | null, dashboard: RequestInit | null) => {
    const t = ++turno.current;
    setEstado('cargando'); setError(null); setAviso(null);
    const pa = analizar ? pedir<RespAnalizar>('/api/analizar', analizar) : Promise.reject(new Error('omitido'));
    const pd = dashboard ? pedir<RespDashboard>('/api/dashboard', dashboard) : Promise.reject(new Error('omitido'));
    pa.catch(() => {}); pd.catch(() => {});
    // /api/analizar puede tardar (redacción con IA): si el dashboard llega antes, se muestra ya y se completa después.
    if (dashboard && analizar) {
      pd.then(d => {
        if (t !== turno.current) return;
        setFuente(f); setCrudo({ a: null, d }); setCompletando(true); setEstado('listo');
      }, () => {});
    }
    const [ra, rd] = await Promise.allSettled([pa, pd]);
    if (t !== turno.current) return; // llegó una carga más nueva
    setCompletando(false);
    const a = ra.status === 'fulfilled' ? ra.value : null;
    const d = rd.status === 'fulfilled' ? rd.value : null;
    if (!a && !d) {
      const motivo = ra.status === 'rejected' ? ra.reason : rd.status === 'rejected' ? rd.reason : null;
      setError(motivo instanceof Error && motivo.message !== 'omitido' ? motivo.message : 'No pude analizar los datos.');
      setEstado('error');
      return;
    }
    if (analizar && !a) setAviso('No pude calcular alertas ni excedente; muestro la proyección del extracto.');
    else if (dashboard && !d && f.tipo !== 'mp') setAviso('No pude armar el detalle por categoría; el resto está completo.');
    setFuente(f); setCrudo({ a, d }); setEstado('listo');
    guardar(CLAVE, { fuente: f, a, d });
  }, []);

  const json = (b: object): RequestInit => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

  const extras = useRef<object[]>([]);
  const cargarDemo = useCallback((compromisos = false, escenario?: 'holgada') => {
    extras.current = [];
    return correr({ tipo: 'demo', compromisos, escenario }, json({ demo: true, compromisos, escenario }), json({ demo: true, escenario }));
  }, [correr]);
  // Suma un comprobante leído por foto a la pyme demo y recalcula (/api/analizar valida `extras`; solo aplica con datos demo).
  const sumarFoto = useCallback((comprobante: object, lado: 'recibido' | 'emitido') => {
    extras.current = [...extras.current, { lado, comprobante }];
    const compromisos = fuente?.tipo === 'demo' ? fuente.compromisos : false;
    const escenario = fuente?.tipo === 'demo' ? fuente.escenario : undefined;
    return correr({ tipo: 'demo', compromisos, escenario }, json({ demo: true, compromisos, escenario, extras: extras.current }), json({ demo: true, escenario }));
  }, [correr, fuente]);
  const cargarMP = useCallback(() => correr({ tipo: 'mp' }, json({ demo: true, fuente: 'mp' }), null), [correr]);
  const subir = useCallback((files: File[]) => {
    const fa = new FormData(), fd = new FormData();
    for (const x of files) { fa.append('archivos', x); fd.append('archivos', x); }
    return correr({ tipo: 'archivos', nombres: files.map(x => x.name) }, { body: fa }, { body: fd });
  }, [correr]);

  const agregarSello = useCallback((s: Sello) => {
    setSellos(prev => { const n = [s, ...prev.filter(x => x.hash !== s.hash)]; guardar(CLAVE_SELLOS, n); return n; });
  }, []);

  // Primera carga: lo cacheado en la sesión o la pyme demo.
  useEffect(() => {
    const s = leer<{ fuente: Fuente; a: RespAnalizar | null; d: RespDashboard | null }>(CLAVE);
    const sl = leer<Sello[]>(CLAVE_SELLOS);
    if (sl) setSellos(sl);
    if (s?.fuente && (s.a || s.d)) { setFuente(s.fuente); setCrudo({ a: s.a, d: s.d }); setEstado('listo'); return; }
    cargarDemo(false);
  }, [cargarDemo]);

  const vista = useMemo(() => (fuente ? armar(fuente, crudo.a, crudo.d) : null), [fuente, crudo]);
  const valor = useMemo<Ctx>(() => ({ estado, error, aviso, completando, fuente, vista, sellos, cargarDemo, cargarMP, subir, agregarSello, sumarFoto }),
    [estado, error, aviso, completando, fuente, vista, sellos, cargarDemo, cargarMP, subir, agregarSello, sumarFoto]);
  return <C.Provider value={valor}>{children}</C.Provider>;
}

export function useDatos() {
  const c = useContext(C);
  if (!c) throw new Error('useDatos fuera de DatosProvider');
  return c;
}

export const nombreFuente = (f: Fuente | null) =>
  !f ? 'Sin datos' : f.tipo === 'mp' ? 'Mercado Pago (simulación)' : f.tipo === 'demo' ? (f.compromisos ? 'Pyme demo + boletas y nómina' : 'Pyme demo') : plural(f.nombres.length);
const plural = (n: number) => `${n} ${n === 1 ? 'archivo tuyo' : 'archivos tuyos'}`;
