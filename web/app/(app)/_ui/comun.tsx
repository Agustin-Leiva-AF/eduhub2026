'use client';
// Piezas compartidas: compuerta de carga/error, tabla ordenable, sellado con consentimiento.
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useDatos, type Vista } from './datos';
import type { Sello } from './formato';
import s from '../app.module.css';

/** Muestra esqueleto mientras carga, error honesto si falla, y el contenido cuando hay datos. */
export function ConDatos({ children }: { children: (v: Vista) => ReactNode }) {
  const { vista, estado, error, aviso, cargarDemo } = useDatos();
  if (!vista && (estado === 'cargando' || estado === 'inicial')) {
    return (
      <div className={s.esqueleto} role="status" aria-label="Analizando tu caja">
        <span className={s.sr}>Analizando tu caja…</span>
        <div className={s.hueso} style={{ height: 120 }} />
        <div className={s.hueso} style={{ height: 72 }} />
        <div className={s.hueso} style={{ height: 260 }} />
      </div>
    );
  }
  if (!vista) {
    return (
      <div className={s.errorBox} role="alert">
        No pude analizar tu caja.
        <p>{error ?? 'Error desconocido.'} Probá de nuevo o cargá otros archivos.</p>
        <div className={s.btnRow}>
          <button type="button" className={`${s.btn} ${s.btnPri}`} onClick={() => cargarDemo(false)}>Reintentar con la pyme demo</button>
          <Link href="/datos" className={s.btn}>Cargar mis datos</Link>
        </div>
      </div>
    );
  }
  return (
    <>
      {estado === 'error' && error && <div className={s.errorBox} role="alert">No pude actualizar los datos.<p>{error} Sigo mostrando el último análisis.</p></div>}
      {aviso && estado === 'listo' && <div className={s.avisoBox} role="status">{aviso}</div>}
      <div style={{ display: 'contents' }} aria-busy={estado === 'cargando'}>{children(vista)}</div>
    </>
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
