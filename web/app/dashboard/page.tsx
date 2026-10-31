'use client';
// Dashboard de CFO de Bolsillo: toda la caja en una pantalla para el dueño o su contador.
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Dia, Evento, Hueco, Pronostico, Contraparte } from '@/lib/forecast';
import type { Recomendacion, Opcion } from '@/lib/advice';
import type { Cita } from '@/lib/openarg';
import type { Categoria } from '@/lib/categorias';
import s from './dashboard.module.css';

type MesCat = { mes: string; real: boolean; dias: number; diasMes: number; porCategoria: Partial<Record<Categoria, number>> };
type Datos = {
  pyme: string; demo: boolean; corte: string;
  resumen: { movimientos: number; recibidos: number; emitidos: number; ignorados: string[]; insumos: { nombre: string; sha256: string }[] };
  pronostico: Pronostico; recomendacion: Recomendacion; citas: Record<string, Cita>;
  mensual: MesCat[]; etiquetas: Record<string, string>; ventasMensuales: number;
};
type Sello = { hash: string; modo: string; url?: string; tx?: string };

/* ---------- formato argentino ---------- */
const $ = (n: number) => `${n < 0 ? '-' : ''}$ ${Math.round(Math.abs(n)).toLocaleString('es-AR')}`;
const M = (n: number) => `${n < 0 ? '-' : ''}$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DIAS_L = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const dt = (f: string) => new Date(f + 'T00:00:00Z');
const corta = (f: string) => `${DIAS[dt(f).getUTCDay()]} ${+f.slice(8, 10)}/${+f.slice(5, 7)}`;
const larga = (f: string) => `${DIAS_L[dt(f).getUTCDay()]} ${+f.slice(8, 10)}/${+f.slice(5, 7)}/${f.slice(0, 4)}`;
const ddmmyyyy = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
const sumarDias = (f: string, n: number) => new Date(dt(f).getTime() + n * 86400000).toISOString().slice(0, 10);

/* ---------- utilidades de escala ---------- */
function ticks(min: number, max: number, n = 5): number[] {
  const span = max - min || 1;
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
function useAncho<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth)));
    ro.observe(el);
    setW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ====================================================================== */
export default function Dashboard() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tema, setTema] = useState<'auto' | 'claro' | 'oscuro'>('auto');
  const archivo = useRef<HTMLInputElement>(null);

  const pedir = useCallback(async (init: RequestInit) => {
    setCargando(true); setError(null);
    try {
      const res = await fetch('/api/dashboard', { method: 'POST', ...init });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'No pude analizar los archivos.');
      setDatos(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.');
    } finally { setCargando(false); }
  }, []);
  const demo = useCallback(() => pedir({ headers: { 'content-type': 'application/json' }, body: JSON.stringify({ demo: true }) }), [pedir]);
  useEffect(() => { demo(); }, [demo]);

  function subir(files: FileList | null) {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append('archivos', f);
    pedir({ body: fd });
    if (archivo.current) archivo.current.value = '';
  }
  const ciclo = () => setTema(t => (t === 'auto' ? 'oscuro' : t === 'oscuro' ? 'claro' : 'auto'));

  return (
    <div className={s.root} data-theme={tema === 'auto' ? undefined : tema === 'claro' ? 'light' : 'dark'}>
      <header className={s.top}>
        <div className={s.brand}>
          <small>CFO de Bolsillo · Dashboard</small>
          <strong>{datos ? datos.pyme : 'Cargando…'}</strong>
        </div>
        {datos && <span className={`${s.corte} ${s.num}`}>datos al {ddmmyyyy(datos.corte)}</span>}
        {datos?.demo && <span className={s.badge} role="note">Datos ficticios de la demo</span>}
        {datos && !datos.demo && <span className={s.badge} role="note">Archivos cargados por vos</span>}
        <span className={s.spacer} />
        <div className={s.acciones}>
          <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={demo} disabled={cargando}>Usar pyme demo</button>
          <button type="button" className={s.btn} onClick={() => archivo.current?.click()} disabled={cargando}>Subir CSV</button>
          <input ref={archivo} className={s.fileInput} type="file" multiple accept=".csv,text/csv" aria-label="Subir extracto y comprobantes en CSV" onChange={e => subir(e.target.files)} tabIndex={-1} />
          <button type="button" className={s.btn} onClick={ciclo} aria-label={`Tema: ${tema}. Cambiar`}>Tema: {tema}</button>
        </div>
      </header>

      <main className={s.main}>
        {error && <div className={s.error} role="alert">{error}</div>}
        {cargando && !datos && <div className={s.estado} role="status">Analizando tu caja…</div>}
        {datos && <Panel d={datos} cargando={cargando} />}
        {!datos && !cargando && !error && <div className={s.estado}>Elegí la pyme demo o subí el extracto del banco y Mis Comprobantes (recibidos y emitidos) en CSV.</div>}
      </main>

      <div className={s.aviso} role="note">Información para decidir, no asesoramiento financiero.</div>
    </div>
  );
}

function Panel({ d, cargando }: { d: Datos; cargando: boolean }) {
  const p = d.pronostico;
  const [horizonte, setHorizonte] = useState(120);
  const h = (n: number) => p.horizontes.find(x => x.dias === n);
  const primero = p.huecos[0] ?? null;
  return (
    <div style={{ display: 'contents', opacity: cargando ? 0.6 : 1 }}>
      <section className={s.kpis} aria-label="Indicadores clave">
        <Tile label="Saldo hoy" value={M(p.saldoInicial)} neg={p.saldoInicial < 0} sub={`al ${ddmmyyyy(p.hoy)} · ${$(p.saldoInicial)}`} />
        {[30, 60, 90, 120].map(n => {
          const x = h(n);
          return x ? <Tile key={n} label={`Mínimo a ${n} días`} value={M(x.minimo)} neg={x.minimo < 0} sub={`el ${corta(x.fechaMinimo)}`} /> : null;
        })}
        <Tile label="Primer día en rojo" value={primero ? corta(primero.inicio) : 'Sin hueco'} neg={!!primero}
          sub={primero ? `${primero.dias} ${primero.dias === 1 ? 'día' : 'días'} en rojo · mín. ${M(primero.minimo)}${p.huecos.length > 1 ? ` · +${p.huecos.length - 1} hueco${p.huecos.length > 2 ? 's' : ''}` : ''}` : 'la caja no baja de cero en 120 días'} />
        <Tile label="Ventas mensuales promedio" value={M(d.ventasMensuales)} sub="acreditaciones, últimas 8 semanas" />
      </section>

      <section className={s.card} aria-labelledby="t-saldo">
        <div className={s.cardHead}>
          <div>
            <h2 id="t-saldo">Saldo diario proyectado</h2>
            <p className={s.sub}>Caja del banco día a día. Lo que cae bajo cero es descubierto no acordado.</p>
          </div>
          <div className={s.seg} role="radiogroup" aria-label="Horizonte de proyección">
            {[15, 30, 60, 90, 120].map(n => (
              <button key={n} type="button" role="radio" aria-checked={horizonte === n} onClick={() => setHorizonte(n)}>{n} días</button>
            ))}
          </div>
        </div>
        <GraficoSaldo p={p} horizonte={horizonte} />
      </section>

      <section className={s.card} aria-labelledby="t-cat">
        <Categorias d={d} />
      </section>

      <div className={s.grid2}>
        <section className={s.card} aria-labelledby="t-prox"><Proximos p={p} /></section>
        <section className={s.card} aria-labelledby="t-contra"><Contrapartes lista={p.contrapartes} /></section>
      </div>

      <div className={s.gridCover}>
        <section className={s.card} aria-labelledby="t-cubrir"><Cubrir d={d} /></section>
        <section className={s.card} aria-labelledby="t-macro">
          <h2 id="t-macro">Contexto macro (OpenARG)</h2>
          <p className={s.sub}>Datos públicos de BCRA e INDEC, caché local.</p>
          <div className={s.macro}>
            {(['ipc', 'adelantos', 'documentos', 'pfReal', 'irregularidad'] as const).map(k => {
              const c = d.citas[k];
              return c ? (
                <div className={s.macroItem} key={k}>
                  <span className={s.macroDato}>{c.dato}</span>
                  <span className={s.macroVal}>{c.valor}</span>
                  <span className={s.macroMeta}>Período {c.periodo} · <a href={c.url} target="_blank" rel="noopener noreferrer">Fuente: {c.fuente}</a></span>
                </div>
              ) : null;
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, neg }: { label: string; value: string; sub?: string; neg?: boolean }) {
  return (
    <div className={s.tile}>
      <span className={s.tileLabel}>{label}</span>
      <span className={`${s.tileValue} ${neg ? s.neg : ''}`}>{value}</span>
      {neg && <span className={s.negTag}><span aria-hidden>▼</span> En rojo</span>}
      {sub && <span className={s.tileSub}>{sub}</span>}
    </div>
  );
}

/* ====================================================================== */
/* Gráfico principal: saldo diario                                         */
function GraficoSaldo({ p, horizonte }: { p: Pronostico; horizonte: number }) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = W < 520 ? 300 : 360;
  const m = { l: W < 520 ? 52 : 64, r: 16, t: 28, b: 30 };

  const pts: (Dia & { corte?: boolean })[] = useMemo(
    () => [{ fecha: p.hoy, saldo: p.saldoInicial, entradas: 0, salidas: 0, corte: true }, ...p.serie.slice(0, horizonte)], [p, horizonte]);
  const porFecha = useMemo(() => {
    const mp = new Map<string, Evento[]>();
    for (const e of p.eventos) mp.set(e.fecha, [...(mp.get(e.fecha) ?? []), e]);
    return mp;
  }, [p.eventos]);

  const n = pts.length;
  const iw = Math.max(10, W - m.l - m.r), ih = H - m.t - m.b;
  const vals = pts.map(x => x.saldo);
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals);
  const pad = (mx - mn) * 0.08;
  const lo = mn < 0 ? mn - (mx - mn) * 0.14 : 0, hi = mx + pad;
  const x = (i: number) => m.l + (i / (n - 1)) * iw;
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * ih;
  const y0 = y(0);
  const linea = pts.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.saldo).toFixed(1)}`).join('');
  const area = `${linea}L${x(n - 1).toFixed(1)},${y0.toFixed(1)}L${x(0).toFixed(1)},${y0.toFixed(1)}Z`;
  const yt = ticks(lo, hi, W < 520 ? 4 : 5);
  // marcas del eje x: primer día de cada mes (y el de 15 si cabe)
  const xt = pts.map((q, i) => ({ q, i })).filter(({ q, i }) => i > 0 && (q.fecha.slice(8) === '01' || (horizonte <= 30 && (+q.fecha.slice(8)) % 5 === 0)))
    .filter(({ i }) => x(i) - x(0) > 36);
  const hasNeg = vals.some(v => v < 0);

  const ultima = pts[n - 1].fecha;
  const huecos = p.huecos.filter(hu => hu.inicio <= ultima).map(hu => {
    const i0 = pts.findIndex(q => q.fecha === hu.inicio);
    const iF = hu.fin ? pts.findIndex(q => q.fecha === hu.fin) : -1;
    const i1 = iF < 0 ? n - 1 : iF;
    const iMin = pts.findIndex(q => q.fecha === hu.fechaMinimo);
    // si el horizonte corta el hueco, el mínimo visible es el del tramo
    let vi = iMin, vmin = hu.minimo;
    if (iMin < 0 || iMin > i1) {
      vi = i0; for (let k = i0; k <= i1; k++) if (pts[k].saldo < pts[vi].saldo) vi = k;
      vmin = pts[vi].saldo;
    }
    return { hu, i0, i1, vi, vmin };
  });

  const resumen = `Saldo proyectado a ${horizonte} días: hoy ${M(p.saldoInicial)}, mínimo ${M(Math.min(...vals))}, final ${M(pts[n - 1].saldo)}.` +
    (huecos.length ? ` ${huecos.length} hueco${huecos.length > 1 ? 's' : ''} en rojo: ${huecos.map(k => `desde el ${corta(k.hu.inicio)}, mínimo ${M(k.vmin)}`).join('; ')}.` : ' Sin huecos.');

  const mover = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    setIdx(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1)))));
  };
  const act = idx !== null && idx < n ? pts[idx] : null;
  const evs = act ? (porFecha.get(act.fecha) ?? []).slice().sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto)) : [];
  const tipLeft = act ? (x(idx!) > W * 0.55 ? x(idx!) - 262 : x(idx!) + 14) : 0;

  return (
    <div ref={ref} className={s.chartBox}>
      <div className={s.legend} aria-hidden>
        <span><i className={`${s.sw} ${s.swLine}`} style={{ borderColor: 'var(--accent)' }} /> Saldo proyectado</span>
        <span><i className={`${s.sw} ${s.swLine}`} style={{ borderColor: 'var(--danger)' }} /> Tramo en rojo</span>
        <span><i className={s.sw} style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)' }} /> Hueco de caja</span>
      </div>
      {W > 0 && (
        <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" tabIndex={0} aria-label={resumen}
          onPointerMove={e => mover(e.clientX, e.currentTarget)} onPointerDown={e => mover(e.clientX, e.currentTarget)} onPointerLeave={() => setIdx(null)}
          onFocus={() => setIdx(i => i ?? 0)} onBlur={() => setIdx(null)}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') { setIdx(i => Math.min(n - 1, (i ?? -1) + 1)); e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { setIdx(i => Math.max(0, (i ?? 1) - 1)); e.preventDefault(); }
            else if (e.key === 'Escape') setIdx(null);
          }}>
          <defs>
            <clipPath id={`${uid}a`}><rect x={m.l} y={0} width={iw} height={Math.max(0, y0)} /></clipPath>
            <clipPath id={`${uid}b`}><rect x={m.l} y={y0} width={iw} height={Math.max(0, H - y0)} /></clipPath>
          </defs>
          {/* grilla y eje y */}
          {yt.map(v => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{M(v)}</text>
            </g>
          ))}
          {/* zona negativa */}
          {hasNeg && <rect x={m.l} y={y0} width={iw} height={Math.max(0, H - m.b - y0)} fill="var(--danger-bg)" />}
          {huecos.map((k, j) => (
            <rect key={j} x={x(k.i0)} y={m.t} width={Math.max(2, x(k.i1) - x(k.i0))} height={ih} fill="var(--danger-bg)" />
          ))}
          {/* área y línea */}
          <path d={area} clipPath={`url(#${uid}a)`} fill="var(--accent)" fillOpacity={0.14} />
          <path d={area} clipPath={`url(#${uid}b)`} fill="var(--danger)" fillOpacity={0.3} />
          <path d={linea} clipPath={`url(#${uid}a)`} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
          <path d={linea} clipPath={`url(#${uid}b)`} fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinejoin="round" />
          {/* línea de cero */}
          <line x1={m.l} x2={m.l + iw} y1={y0} y2={y0} stroke="var(--ink2)" strokeWidth={1.25} strokeDasharray="5 4" />
          <text x={m.l + 4} y={y0 - 5} className={s.axisLabel}>$ 0</text>
          {hasNeg && <text x={m.l + 6} y={H - m.b - 6} textAnchor="start" className={s.axisLabel}>Zona en rojo</text>}
          {/* eje x */}
          {xt.map(({ q, i }) => (
            <g key={q.fecha}>
              <line x1={x(i)} x2={x(i)} y1={m.t + ih} y2={m.t + ih + 4} stroke="var(--muted)" />
              <text x={x(i)} y={H - 8} textAnchor="middle">{+q.fecha.slice(8)} {MESES[+q.fecha.slice(5, 7) - 1]}</text>
            </g>
          ))}
          <text x={x(0)} y={H - 8} textAnchor="start">hoy</text>
          {/* anotación de huecos */}
          {huecos.map((k, j) => {
            const cx = x(k.vi), cy = y(k.vmin);
            const sig = huecos[j + 1];
            const ancla = cx > m.l + iw - 110 || (sig && x(sig.vi) - cx < 200) ? 'end' : cx < m.l + 110 ? 'start' : 'middle';
            const dx = ancla === 'end' ? -4 : ancla === 'start' ? 4 : 0;
            return (
              <g key={`h${j}`}>
                <circle cx={cx} cy={cy} r={5} fill="var(--danger)" stroke="var(--surface)" strokeWidth={2} />
                <text x={cx + dx} y={Math.min(H - m.b - 2, cy + 20)} textAnchor={ancla} className={s.annot}>Hueco {huecos.length > 1 ? j + 1 : ''}: {M(k.vmin)}</text>
                <text x={cx + dx} y={Math.min(H - m.b + 10, cy + 33)} textAnchor={ancla}>{corta(k.hu.fechaMinimo)} · {k.hu.dias} {k.hu.dias === 1 ? 'día' : 'días'}</text>
              </g>
            );
          })}
          {/* hover */}
          {act && (
            <g pointerEvents="none">
              <line x1={x(idx!)} x2={x(idx!)} y1={m.t} y2={m.t + ih} stroke="var(--ink2)" strokeWidth={1} />
              <circle cx={x(idx!)} cy={y(act.saldo)} r={5} fill={act.saldo < 0 ? 'var(--danger)' : 'var(--accent)'} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {act && W > 0 && (
        <div className={s.tooltip} style={{ left: Math.max(4, tipLeft), top: 40 }} role="status">
          <div className={s.tipHead}>{larga(act.fecha)}{act.corte ? ' · hoy' : ''}</div>
          <div className={s.tipRow}><span>Saldo</span><b className={`${s.num} ${act.saldo < 0 ? s.neg : ''}`}>{$(act.saldo)}{act.saldo < 0 ? ' (en rojo)' : ''}</b></div>
          {!act.corte && <>
            <div className={s.tipRow}><span>Entradas</span><span className={s.num}>{$(act.entradas)}</span></div>
            <div className={s.tipRow}><span>Salidas</span><span className={s.num}>{$(-act.salidas)}</span></div>
          </>}
          {evs.length > 0 && <div className={s.tipSep} />}
          {evs.slice(0, 6).map((e, i) => (
            <div className={s.tipRow} key={i}><span title={e.concepto}>{e.concepto}</span><span className={s.num}>{M(e.monto)}</span></div>
          ))}
          {evs.length > 6 && <div className={s.tipRow}><span>y {evs.length - 6} movimientos más</span></div>}
        </div>
      )}
      <details className={s.details}>
        <summary>Ver datos del gráfico en tabla</summary>
        <div className={s.scroller} style={{ maxHeight: 260 }}>
          <table className={s.tabla}>
            <caption className={s.sr}>Saldo diario proyectado</caption>
            <thead><tr><th scope="col" className={s.plain}>Fecha</th><th scope="col" className={`${s.plain} ${s.right}`}>Entradas</th><th scope="col" className={`${s.plain} ${s.right}`}>Salidas</th><th scope="col" className={`${s.plain} ${s.right}`}>Saldo</th></tr></thead>
            <tbody>{pts.slice(1).map(q => (
              <tr key={q.fecha}><th scope="row" style={{ fontWeight: 400 }}>{corta(q.fecha)}</th><td className={`${s.right} ${s.num}`}>{$(q.entradas)}</td><td className={`${s.right} ${s.num}`}>{$(-q.salidas)}</td><td className={`${s.right} ${s.num} ${q.saldo < 0 ? s.neg : ''}`}>{$(q.saldo)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

/* ====================================================================== */
/* Entradas y salidas por categoría: historia real + meses proyectados      */
type Grupo = { id: string; nombre: string; color: string };
const G: Record<string, Grupo> = {
  ventas: { id: 'ventas', nombre: 'Ventas (tarjeta/QR)', color: 'var(--c-ventas)' },
  cobros: { id: 'cobros', nombre: 'Cobros a clientes', color: 'var(--c-cobros)' },
  otros_ent: { id: 'otros_ent', nombre: 'Otras entradas', color: 'var(--c-otros)' },
  proveedores: { id: 'proveedores', nombre: 'Proveedores', color: 'var(--c-proveedores)' },
  personal: { id: 'personal', nombre: 'Personal (sueldos, SAC, cargas)', color: 'var(--c-personal)' },
  impuestos: { id: 'impuestos', nombre: 'Impuestos', color: 'var(--c-impuestos)' },
  fijos: { id: 'fijos', nombre: 'Alquiler y servicios', color: 'var(--c-fijos)' },
  otros_sal: { id: 'otros_sal', nombre: 'Retiros, bancarios y otros', color: 'var(--c-otros-sal)' },
};
const ENT = ['ventas', 'cobros', 'otros_ent'], SAL = ['proveedores', 'personal', 'impuestos', 'fijos', 'otros_sal'];
function grupoDe(cat: string, signo: 1 | -1): string {
  if (signo > 0) return cat === 'ventas' ? 'ventas' : cat === 'cobro_clientes' ? 'cobros' : 'otros_ent';
  if (cat === 'proveedores') return 'proveedores';
  if (cat === 'sueldos' || cat === 'aguinaldo' || cat === 'cargas_sociales') return 'personal';
  if (cat === 'impuestos') return 'impuestos';
  if (cat === 'alquiler' || cat === 'servicios') return 'fijos';
  return 'otros_sal';
}
type Barra = { mes: string; etiqueta: string; real: boolean; parcial: boolean; dias: number; diasMes: number; valores: Record<string, number>; total: number };

function armar(mensual: MesCat[], lado: 'ent' | 'sal'): Barra[] {
  const signo = lado === 'ent' ? 1 : -1;
  const hist = mensual.filter(x => x.real).slice(-6);
  const proy = mensual.filter(x => !x.real);
  return [...hist, ...proy].map(x => {
    const valores: Record<string, number> = {};
    for (const [cat, v] of Object.entries(x.porCategoria)) {
      if (!v || Math.sign(v) !== signo) continue;
      const g = grupoDe(cat, signo);
      valores[g] = (valores[g] ?? 0) + Math.abs(v);
    }
    const mm = +x.mes.slice(5, 7);
    return { mes: x.mes, etiqueta: MESES[mm - 1] + (mm === 1 ? ` ${x.mes.slice(2, 4)}` : ''), real: x.real, parcial: x.dias < x.diasMes - 3, dias: x.dias, diasMes: x.diasMes, valores, total: Object.values(valores).reduce((a, b) => a + b, 0) };
  });
}

function Categorias({ d }: { d: Datos }) {
  const [tabla, setTabla] = useState(false);
  const ent = useMemo(() => armar(d.mensual, 'ent'), [d.mensual]);
  const sal = useMemo(() => armar(d.mensual, 'sal'), [d.mensual]);
  const hayParcial = [...ent, ...sal].some(b => b.parcial);
  return (
    <>
      <div className={s.cardHead}>
        <div>
          <h2 id="t-cat">Entradas y salidas por categoría</h2>
          <p className={s.sub}>Barras lisas: extracto real. Barras rayadas: meses proyectados por el motor de caja.</p>
        </div>
        <button type="button" className={s.btn} onClick={() => setTabla(t => !t)} aria-pressed={tabla}>{tabla ? 'Ver gráficos' : 'Ver como tabla'}</button>
      </div>
      <div className={s.legend} aria-hidden>
        <span><i className={`${s.sw}`} style={{ background: 'var(--ink2)' }} /> Real</span>
        <span><i className={`${s.sw} ${s.swHatch}`} /> Proyectado</span>
      </div>
      <div className={s.grid2}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 13 }}>Entradas por mes</h3>
          {tabla ? <TablaBarras barras={ent} grupos={ENT} titulo="Entradas por mes y categoría" /> : <BarrasApiladas barras={ent} grupos={ENT} titulo="Entradas por mes" />}
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 13 }}>Salidas por mes</h3>
          {tabla ? <TablaBarras barras={sal} grupos={SAL} titulo="Salidas por mes y categoría" /> : <BarrasApiladas barras={sal} grupos={SAL} titulo="Salidas por mes" />}
        </div>
      </div>
      {hayParcial && <p className={s.sub} style={{ marginTop: 8 }}>* Mes incompleto: solo cubre los días indicados en el detalle.</p>}
    </>
  );
}

function Leyenda({ grupos, barras }: { grupos: string[]; barras: Barra[] }) {
  return (
    <div className={s.legend}>
      {grupos.filter(g => barras.some(b => b.valores[g])).map(g => <span key={g}><i className={s.sw} style={{ background: G[g].color }} />{G[g].nombre}</span>)}
    </div>
  );
}

function pathTopRound(x0: number, y0: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x0},${y0 + h}V${y0 + rr}Q${x0},${y0} ${x0 + rr},${y0}H${x0 + w - rr}Q${x0 + w},${y0} ${x0 + w},${y0 + rr}V${y0 + h}Z`;
}

function BarrasApiladas({ barras, grupos, titulo }: { barras: Barra[]; grupos: string[]; titulo: string }) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [act, setAct] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = 280;
  const m = { l: W < 420 ? 44 : 52, r: 6, t: 32, b: 48 };
  const n = barras.length;
  const iw = Math.max(10, W - m.l - m.r), ih = H - m.t - m.b;
  const max = Math.max(1, ...barras.map(b => b.total));
  const yt = ticks(0, max * 1.05, 4);
  const top = yt[yt.length - 1] ?? max;
  const y = (v: number) => m.t + (1 - v / top) * ih;
  const paso = iw / n, bw = Math.min(40, paso * 0.66);
  const cx = (i: number) => m.l + paso * i + paso / 2;
  const iCorte = barras.findIndex(b => !b.real);
  const resumen = `${titulo}: ${barras.map(b => `${b.etiqueta} ${b.real ? 'real' : 'proyectado'} ${M(b.total)}`).join(', ')}.`;
  const a = act !== null ? barras[act] : null;
  return (
    <div ref={ref} className={s.chartBox}>
      <Leyenda grupos={grupos} barras={barras} />
      {W > 0 && (
        <svg className={s.svg} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={resumen} onPointerLeave={() => setAct(null)}>
          <defs>
            <pattern id={`${uid}h`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={6} height={6} fill="var(--surface)" fillOpacity={0.5} />
              <rect width={2.2} height={6} fill="var(--surface)" />
            </pattern>
          </defs>
          {yt.map(v => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--muted)' : 'var(--grid)'} />
              <text x={m.l - 6} y={y(v) + 4} textAnchor="end">{M(v)}</text>
            </g>
          ))}
          {iCorte > 0 && (
            <g>
              <line x1={m.l + paso * iCorte} x2={m.l + paso * iCorte} y1={m.t - 8} y2={H - 14} stroke="var(--ink2)" strokeDasharray="4 4" />
              <text x={m.l + paso * iCorte - 6} y={H - 4} textAnchor="end" className={s.axisLabel}>← Real</text>
              <text x={m.l + paso * iCorte + 6} y={H - 4} textAnchor="start" className={s.axisLabel}>Proyectado →</text>
            </g>
          )}
          {barras.map((b, i) => {
            let acum = 0;
            const segs = grupos.filter(g => b.valores[g]).map(g => { const v = b.valores[g]; const y1 = y(acum + v), y0 = y(acum); acum += v; return { g, y1, h: y0 - y1 }; });
            return (
              <g key={b.mes} tabIndex={0} role="img" aria-label={`${b.etiqueta}, ${b.real ? 'real' : 'proyectado'}: ${M(b.total)}`} opacity={act !== null && act !== i ? 0.55 : 1}
                onPointerEnter={() => setAct(i)} onFocus={() => setAct(i)} onBlur={() => setAct(null)}>
                <rect x={m.l + paso * i} y={m.t - 8} width={paso} height={ih + 8} fill="transparent" />
                {segs.map((sg, k) => {
                  const ultimo = k === segs.length - 1;
                  const dr = ultimo ? pathTopRound(cx(i) - bw / 2, sg.y1, bw, sg.h, 4) : `M${cx(i) - bw / 2},${sg.y1}h${bw}v${sg.h}h${-bw}Z`;
                  return (
                    <g key={sg.g}>
                      <path d={dr} fill={G[sg.g].color} stroke="var(--surface)" strokeWidth={2} />
                      {!b.real && <path d={dr} fill={`url(#${uid}h)`} />}
                    </g>
                  );
                })}
                <text x={cx(i)} y={H - m.b + 16} textAnchor="middle" className={b.real ? undefined : s.axisLabel}>{b.etiqueta}{b.parcial ? '*' : ''}</text>
                {W > 360 && b.total > 0 && <text x={cx(i)} y={y(b.total) - 5} textAnchor="middle" style={{ fontSize: 10 }}>{(b.total / 1e6).toFixed(1).replace('.', ',')}</text>}
              </g>
            );
          })}
        </svg>
      )}
      {a && W > 0 && (
        <div className={s.tooltip} style={{ left: Math.max(4, Math.min(W - 254, cx(act!) - 125)), top: 28 }} role="status">
          <div className={s.tipHead}>{MESES[+a.mes.slice(5, 7) - 1]} {a.mes.slice(0, 4)} · {a.real ? 'real' : 'proyectado'}{a.parcial ? ` (${a.dias} de ${a.diasMes} días)` : ''}</div>
          {grupos.filter(g => a.valores[g]).map(g => (
            <div className={s.tipRow} key={g}><span><i className={s.sw} style={{ background: G[g].color, marginRight: 6 }} />{G[g].nombre}</span><span className={s.num}>{M(a.valores[g])}</span></div>
          ))}
          <div className={s.tipSep} />
          <div className={s.tipRow}><span>Total</span><b className={s.num}>{M(a.total)}</b></div>
        </div>
      )}
    </div>
  );
}

function TablaBarras({ barras, grupos, titulo }: { barras: Barra[]; grupos: string[]; titulo: string }) {
  const gs = grupos.filter(g => barras.some(b => b.valores[g]));
  return (
    <div className={s.scroller}>
      <table className={s.tabla}>
        <caption className={s.sr}>{titulo}</caption>
        <thead><tr>
          <th scope="col" className={s.plain}>Mes</th>
          {gs.map(g => <th scope="col" key={g} className={`${s.plain} ${s.right}`}>{G[g].nombre}</th>)}
          <th scope="col" className={`${s.plain} ${s.right}`}>Total</th>
        </tr></thead>
        <tbody>{barras.map(b => (
          <tr key={b.mes}>
            <th scope="row" style={{ fontWeight: 400, whiteSpace: 'nowrap' }}>{b.etiqueta}{b.parcial ? '*' : ''} <span className={s.chip}>{b.real ? 'real' : 'proyectado'}</span></th>
            {gs.map(g => <td key={g} className={`${s.right} ${s.num}`}>{b.valores[g] ? M(b.valores[g]) : '–'}</td>)}
            <td className={`${s.right} ${s.num}`}><b>{M(b.total)}</b></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ====================================================================== */
/* Tablas ordenables                                                       */
type Col<T> = { id: string; label: string; num?: boolean; val: (r: T) => string | number; cell?: (r: T) => ReactNode; cls?: string };
function TablaOrdenable<T>({ cols, rows, inicial, caption, vacio, key_ }: { cols: Col<T>[]; rows: T[]; inicial: { id: string; dir: 1 | -1 }; caption: string; vacio: string; key_: (r: T, i: number) => string }) {
  const [ord, setOrd] = useState(inicial);
  const col = cols.find(c => c.id === ord.id) ?? cols[0];
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = col.val(a), vb = col.val(b);
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return c * ord.dir;
  }), [rows, col, ord.dir]);
  return (
    <div className={s.scroller} tabIndex={0} role="region" aria-label={caption}>
      <table className={s.tabla}>
        <caption className={s.sr}>{caption}</caption>
        <thead><tr>
          {cols.map(c => (
            <th key={c.id} scope="col" className={c.num ? s.right : undefined} aria-sort={ord.id === c.id ? (ord.dir === 1 ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={() => setOrd(o => ({ id: c.id, dir: o.id === c.id ? (o.dir === 1 ? -1 : 1) : 1 }))}>
                {c.label}<span aria-hidden>{ord.id === c.id ? (ord.dir === 1 ? ' ▲' : ' ▼') : ''}</span>
              </button>
            </th>
          ))}
        </tr></thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={cols.length} style={{ color: 'var(--muted)' }}>{vacio}</td></tr>}
          {sorted.map((r, i) => <tr key={key_(r, i)}>{cols.map(c => <td key={c.id} className={`${c.num ? `${s.right} ${s.num}` : ''} ${c.cls ?? ''}`}>{c.cell ? c.cell(r) : c.val(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

const ORIGEN: Record<string, string> = {
  'factura pendiente': 'Factura pendiente', 'factura estimada': 'Estimada', 'recurrente': 'Recurrente',
  'proyección de ventas': 'Estimada', 'calendario legal': 'Calendario legal', 'descuento de factura': 'Factura descontada',
};
const monto = (n: number) => <span className={n < 0 ? s.neg : undefined}>{$(n)}</span>;

function Proximos({ p }: { p: Pronostico }) {
  const [conVentas, setConVentas] = useState(false);
  const fin = sumarDias(p.hoy, 30);
  const rows = useMemo(() => p.eventos.filter(e => e.fecha > p.hoy && e.fecha <= fin && (conVentas || e.categoria !== 'ventas')), [p, fin, conVentas]);
  const ETQ: Record<string, string> = { ventas: 'Ventas', cobro_clientes: 'Cobros a clientes', sueldos: 'Sueldos', aguinaldo: 'Aguinaldo', cargas_sociales: 'Cargas sociales', impuestos: 'Impuestos', alquiler: 'Alquiler', servicios: 'Servicios', proveedores: 'Proveedores', retiros: 'Retiros de socios', bancarios: 'Gastos bancarios', otros: 'Otros' };
  const cols: Col<Evento>[] = [
    { id: 'fecha', label: 'Fecha', val: e => e.fecha, cell: e => <span className={s.num}>{corta(e.fecha)}</span> },
    { id: 'concepto', label: 'Concepto', val: e => e.concepto, cls: s.concepto ?? '' },
    { id: 'cat', label: 'Categoría', val: e => ETQ[e.categoria] ?? e.categoria },
    { id: 'monto', label: 'Monto', num: true, val: e => e.monto, cell: e => monto(e.monto) },
    { id: 'origen', label: 'Origen', val: e => ORIGEN[e.origen] ?? e.origen, cell: e => <span className={s.chip}>{ORIGEN[e.origen] ?? e.origen}</span> },
  ];
  const tot = rows.reduce((a, e) => a + e.monto, 0);
  return (
    <>
      <h2 id="t-prox">Próximos 30 días</h2>
      <p className={s.sub}>Pagos y cobros hasta el {ddmmyyyy(fin)}. Tocá un encabezado para ordenar.</p>
      <div className={s.toolbar}>
        <label><input type="checkbox" checked={conVentas} onChange={e => setConVentas(e.target.checked)} /> Incluir acreditaciones diarias de ventas</label>
        <span className={s.num}>{rows.length} movimientos · neto {M(tot)}</span>
      </div>
      <TablaOrdenable cols={cols} rows={rows} inicial={{ id: 'fecha', dir: 1 }} caption="Próximos 30 días: pagos y cobros" vacio="No hay movimientos en la ventana." key_={(e, i) => `${e.fecha}${e.concepto}${i}`} />
    </>
  );
}

function Contrapartes({ lista }: { lista: Contraparte[] }) {
  const cols: Col<Contraparte>[] = [
    { id: 'nombre', label: 'Contraparte', val: c => c.nombre, cls: s.concepto ?? '' },
    { id: 'lado', label: 'Relación', val: c => c.lado, cell: c => <span className={s.chip}>{c.lado === 'pagar' ? 'Proveedor' : 'Cliente'}</span> },
    { id: 'plazo', label: 'Plazo', num: true, val: c => c.plazoDias, cell: c => `${c.plazoDias} días` },
    { id: 'cad', label: 'Cadencia', num: true, val: c => c.cadenciaDias ?? 0, cell: c => (c.cadenciaDias ? `cada ${c.cadenciaDias} días` : 's/d') },
    { id: 'monto', label: 'Monto típico', num: true, val: c => c.montoTipico, cell: c => $(c.montoTipico) },
    { id: 'pend', label: 'Pendientes', num: true, val: c => c.pendientes, cell: c => `${c.pendientes} de ${c.facturas}` },
  ];
  return (
    <>
      <h2 id="t-contra">Contrapartes</h2>
      <p className={s.sub}>Plazo y cadencia aprendidos conciliando facturas de ARCA contra el banco.</p>
      <TablaOrdenable cols={cols} rows={lista} inicial={{ id: 'monto', dir: -1 }} caption="Contrapartes: plazo aprendido, cadencia, monto típico y facturas pendientes" vacio="Sin comprobantes cargados." key_={c => c.cuit + c.lado} />
    </>
  );
}

/* ====================================================================== */
/* Cómo cubrir el hueco + sellado                                          */
const CONSENTIMIENTO = 'Autorizo a CFO de Bolsillo a compartir mi proyección de caja y la evidencia que la respalda con la entidad indicada, para que me contacte con una propuesta de financiamiento.';

function Cubrir({ d }: { d: Datos }) {
  const r = d.recomendacion, p = d.pronostico;
  const [elegida, setElegida] = useState<Opcion['id'] | null>(r.elegida);
  const [ok, setOk] = useState(false);
  const [env, setEnv] = useState(false);
  const [sello, setSello] = useState<Sello | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setElegida(r.elegida); setOk(false); setSello(null); setErr(null); }, [r]);

  const op = r.opciones.find(o => o.id === elegida) ?? null;
  async function pedir() {
    if (!op || !ok) return;
    setEnv(true); setErr(null);
    try {
      const res = await fetch('/api/constancia', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pyme: d.demo ? `${d.pyme} (ficticia)` : d.pyme, destino: 'banco-demo', opcion: { id: op.id, titulo: op.titulo },
          consentimiento: CONSENTIMIENTO, insumos: d.resumen.insumos,
          pronostico: { hoy: p.hoy, saldoInicial: p.saldoInicial, horizontes: p.horizontes, hueco: p.hueco, serie: p.serie.map(x => ({ fecha: x.fecha, saldo: x.saldo })) },
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'No pude sellar la carpeta.');
      setSello(j);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error inesperado.'); }
    finally { setEnv(false); }
  }

  return (
    <>
      <h2 id="t-cubrir">Cómo cubrir el hueco</h2>
      <p className={s.sub} role={p.hueco ? 'alert' : undefined}>{r.alerta.replace('⚠️ ', '')}</p>
      {r.opciones.length > 0 ? (
        <div className={s.grid3} role="radiogroup" aria-label="Opciones para cubrir el hueco">
          {r.opciones.map(o => (
            <label key={o.id} className={s.opcion} data-sel={elegida === o.id}>
              <input type="radio" name="opcion" checked={elegida === o.id} onChange={() => setElegida(o.id)} />
              <div className={s.badges}>
                {o.id === r.elegida && <span className={`${s.pill} ${s.pillRec}`}>Más conveniente</span>}
                <span className={`${s.pill} ${o.cubre ? s.pillOk : s.pillNo}`}>{o.cubre ? '✓ Cubre el hueco' : '✕ No lo cubre del todo'}</span>
              </div>
              <span className={s.opcionTitulo}>{o.titulo}</span>
              <span className={s.opcionCosto}>{o.costo === 0 ? 'Sin costo' : $(o.costo)}</span>
              <span className={s.tileSub}>{o.costo === 0 ? 'costo financiero estimado' : 'costo financiero estimado'}</span>
              <p>{o.detalle}</p>
              {o.citas.map(c => <a key={c.dato} href={c.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 12 }}>{c.dato}: {c.valor}</a>)}
            </label>
          ))}
        </div>
      ) : <p>No necesitás financiamiento en los próximos 120 días.</p>}

      {r.opciones.length > 0 && (
        <div className={s.cta}>
          {sello ? (
            <div className={s.sello} role="status">
              <strong>Carpeta sellada y lista para el banco</strong>
              <span>Huella (hash):</span>
              <span className={s.mono}>{sello.hash}</span>
              <span>Registro: {sello.modo === 'testnet' ? 'Base Sepolia (testnet)' : 'simulado (demo sin testnet)'}</span>
              <span><Link href={`/entidad/${sello.hash}`} target="_blank">Abrir el panel de la entidad</Link>{sello.url && <> · <a href={sello.url} target="_blank" rel="noopener noreferrer">Ver en el explorador</a></>}</span>
            </div>
          ) : (
            <>
              <label className={s.consent}>
                <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
                <span>{CONSENTIMIENTO} (Banco de la demo)</span>
              </label>
              <div>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={!ok || !op || env} onClick={pedir}>{env ? 'Sellando…' : 'Pedir que un banco me contacte'}</button>
                {op && <span className={s.tileSub} style={{ marginLeft: 10 }}>Opción elegida: {op.titulo}</span>}
              </div>
            </>
          )}
          {err && <div className={s.error} role="alert">{err}</div>}
        </div>
      )}
    </>
  );
}
