'use client';
// Piezas compartidas: compuerta de carga/error, tabla ordenable, sellado con consentimiento.
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { progreso, useDatos, type Vista } from './datos';
import type { Sello } from './formato';
import { Icono } from './iconos';
import s from '../app.module.css';

export function Esqueleto({ etiqueta = 'Calculando tu caja' }: { etiqueta?: string }) {
  return (
    <div className={s.esqueleto} role="status" aria-label={etiqueta}>
      <span className={s.sr}>{etiqueta}…</span>
      <div className={`${s.cols} ${s.c21}`}>
        <div className={s.hueso} style={{ height: 210 }} />
        <div className={s.hueso} style={{ height: 210 }} />
      </div>
      <div className={s.hueso} style={{ height: 260 }} />
    </div>
  );
}

/** Esqueleto mientras calcula, estado vacío si no hay datos, error honesto si falla, y el contenido cuando hay datos. */
export function ConDatos({ children }: { children: (v: Vista) => ReactNode }) {
  const { vista, listo, ws, calculando, error, recalcular, abrirCarga, cargarDemo } = useDatos();
  if (!vista && (!listo || calculando || !error) && ws.modo !== 'vacio') return <Esqueleto />;
  if (!listo) return <Esqueleto />;
  if (!vista && ws.modo === 'vacio') return <SinDatos />;
  if (!vista) {
    return (
      <div className={s.errorBox} role="alert">
        No pude calcular tu caja con lo que cargaste.
        <p>{error ?? 'Todavía no hay resultado.'}</p>
        <div className={s.btnRow}>
          <button type="button" className={`${s.btn} ${s.btnPri}`} onClick={() => abrirCarga('saldo')}>Cargar mi saldo de hoy</button>
          <button type="button" className={s.btn} onClick={recalcular}>Reintentar</button>
          {ws.modo === 'demo' ? null : <button type="button" className={s.btn} onClick={() => cargarDemo()}>Ver la demo</button>}
        </div>
      </div>
    );
  }
  return (
    <>
      {error && !calculando && (
        <div className={s.errorBox} role="alert">No pude actualizar con el último cambio.
          <p>{error} Sigo mostrando el cálculo anterior.</p>
          <div className={s.btnRow}><button type="button" className={s.btn} onClick={recalcular}>Reintentar</button><Link href="/datos" className={s.btn}>Revisar lo que cargué</Link></div>
        </div>
      )}
      <div className={s.contenido} aria-busy={!!calculando} data-actualizando={!!calculando}>{children(vista)}</div>
    </>
  );
}

/** Para secciones que necesitan datos y todavía no hay. */
export function SinDatos() {
  const { abrirCarga, cargarDemo } = useDatos();
  return (
    <section className={s.vacio}>
      <h2 className={s.h2}>Todavía no cargaste datos</h2>
      <p>Con tu saldo de hoy y lo que tenés que pagar ya podemos proyectar tu caja. Tarda menos de un minuto.</p>
      <div className={s.btnRow}>
        <button type="button" className={`${s.btn} ${s.btnPri}`} onClick={() => abrirCarga()}>Cargar mis datos</button>
        <button type="button" className={s.btn} onClick={() => cargarDemo()}>Ver la demo</button>
      </div>
    </section>
  );
}

/** Lo que ya está cargado y lo que falta, en 4 pasos. */
export function Checklist({ compacto = false }: { compacto?: boolean }) {
  const { ws, vista, abrirCarga } = useDatos();
  const pasos = progreso(ws, vista);
  const hechos = pasos.filter(p => p.hecho).length;
  return (
    <div className={`${s.checklist} ${compacto ? s.checklistCompacto : ''}`}>
      <div className={s.checkCab}>
        <span className={s.eyebrow}>Tus datos · {hechos} de {pasos.length}</span>
        <span className={s.checkBarra} aria-hidden><i style={{ width: `${(hechos / pasos.length) * 100}%` }} /></span>
      </div>
      <ol>
        {pasos.map(p => (
          <li key={p.id} data-hecho={p.hecho}>
            {p.hecho
              ? <span className={s.checkItem}><Icono n="ok" size={20} /><span><b>{p.label}</b><small>{p.ayuda}</small></span><span className={s.sr}>: listo</span></span>
              : <button type="button" className={s.checkItem} onClick={() => abrirCarga(p.carga)}><span className={s.checkVacio} aria-hidden /><span><b>{p.label}</b><small>{p.ayuda}</small></span><span className={s.checkMas}>Cargar</span></button>}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Qué le falta al cálculo para ser más preciso (resumen.avisos del servidor). */
export function Faltantes({ v, titulo = 'Para que el cálculo sea más preciso' }: { v: Vista; titulo?: string }) {
  const { abrirCarga } = useDatos();
  if (!v.avisos.length) return null;
  return (
    <div className={s.faltan}>
      <strong>{titulo}</strong>
      <ul>{v.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
      <button type="button" className={s.link} onClick={() => abrirCarga()}>Cargar lo que falta</button>
    </div>
  );
}

/* ---------- Tabla ordenable ---------- */
export type Col<T> = { id: string; label: string; num?: boolean; val: (r: T) => string | number; cell?: (r: T) => ReactNode; cls?: string };
export function TablaOrdenable<T>({ cols, rows, inicial, caption, vacio, clave, alta = false }: { cols: Col<T>[]; rows: T[]; inicial: { id: string; dir: 1 | -1 }; caption: string; vacio: string; clave: (r: T, i: number) => string; alta?: boolean }) {
  const [ord, setOrd] = useState(inicial);
  const col = cols.find(c => c.id === ord.id) ?? cols[0];
  const filas = useMemo(() => [...rows].sort((a, b) => {
    const va = col.val(a), vb = col.val(b);
    const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return c * ord.dir;
  }), [rows, col, ord.dir]);
  return (
    <div className={`${s.scroller} ${alta ? s.scrollerAlto : ''}`} tabIndex={0} role="region" aria-label={caption}>
      <table className={s.tabla}>
        <caption className={s.sr}>{caption}</caption>
        <thead><tr>
          {cols.map(c => (
            <th key={c.id} scope="col" className={c.num ? s.der : undefined} aria-sort={ord.id === c.id ? (ord.dir === 1 ? 'ascending' : 'descending') : 'none'}>
              <button type="button" onClick={() => setOrd(o => ({ id: c.id, dir: o.id === c.id ? (o.dir === 1 ? -1 : 1) : 1 }))}>
                {c.label}<span aria-hidden>{ord.id === c.id ? (ord.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
              </button>
            </th>
          ))}
        </tr></thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={cols.length} style={{ color: 'var(--muted)' }}>{vacio}</td></tr>}
          {filas.map((r, i) => <tr key={clave(r, i)}>{cols.map(c => <td key={c.id} className={`${c.num ? s.der : ''} ${c.cls ?? ''}`}>{c.cell ? c.cell(r) : c.val(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Sellado con consentimiento (/api/constancia) ---------- */
export async function sellar(v: Vista, destino: string, opcion: { id: string; titulo: string }, consentimiento: string, extra?: object): Promise<Sello> {
  const p = v.pronostico;
  const res = await fetch('/api/constancia', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pyme: v.ficticia ? `${v.pyme} (ficticia)` : v.pyme, destino, opcion, consentimiento, insumos: v.insumos,
      pronostico: { hoy: p.hoy, saldoInicial: p.saldoInicial, horizontes: p.horizontes, hueco: p.hueco, serie: p.serie.map(x => ({ fecha: x.fecha, saldo: x.saldo })) },
      ...extra,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? `El servidor respondió ${res.status}.`);
  return { hash: j.hash, modo: j.modo, url: j.url, tx: j.tx, fecha: j.fecha ?? new Date().toISOString(), motivo: opcion.titulo, destino };
}

export function SelloListo({ sello }: { sello: Sello }) {
  return (
    <div className={s.selloBox} role="status">
      <strong>Carpeta sellada</strong>
      <p>Registro {sello.modo === 'testnet' ? 'en Base Sepolia (red de prueba)' : 'simulado (la demo no tiene red de prueba configurada)'}.</p>
      <code className={s.mono}>{sello.hash}</code>
      <div className={s.btnRow}>
        <Link className={s.btn} href={`/entidad/${sello.hash}`}>Verificar como entidad</Link>
        <Link className={s.btn} href="/sello">Ver en Sello</Link>
        {sello.url && <a className={s.btn} href={sello.url} target="_blank" rel="noopener noreferrer">Ver en el explorador ↗</a>}
      </div>
    </div>
  );
}
