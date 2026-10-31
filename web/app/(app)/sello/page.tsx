'use client';
// Sello: las carpetas selladas en esta sesión, su huella, el registro en la red de prueba y la verificación.
import Link from 'next/link';
import { useState } from 'react';
import { useDatos } from '../_ui/datos';
import s from '../app.module.css';

type Verif = { coincide: boolean; hashRecalculado: string | null; registro: { existe: boolean; modo: string; fecha?: string; url?: string } };
const fechaHora = (iso?: string) => (iso ? new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 's/d');

export default function Sello() {
  const { sellos } = useDatos();
  const [hash, setHash] = useState('');
  const [v, setV] = useState<{ estado: 'ok'; r: Verif } | { estado: 'error'; m: string } | { estado: 'buscando' } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const valido = /^0x[0-9a-f]{64}$/.test(hash.trim().toLowerCase());

  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido) return;
    setV({ estado: 'buscando' });
    try {
      const r = await fetch(`/api/constancia?hash=${hash.trim().toLowerCase()}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `El servidor respondió ${r.status}.`);
      setV({ estado: 'ok', r: j });
    } catch (err) { setV({ estado: 'error', m: err instanceof Error ? err.message : 'No pude verificar.' }); }
  }
  async function copiar(h: string) {
    try { await navigator.clipboard.writeText(h); setCopiado(h); setTimeout(() => setCopiado(null), 1800); } catch { setCopiado(null); }
  }

  return (
    <div className={s.pagina}>
      <div className={s.cabPagina}>
        <h1>Sello verificable</h1>
        <p>Cuando autorizás compartir tu carpeta, calculamos su huella y la registramos en una red pública de prueba. La entidad que la recibe puede comprobar que nadie la modificó.</p>
      </div>

      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-sellos">
          <h2 className={s.h2} id="t-sellos">Carpetas selladas</h2>
          {sellos.length === 0 ? (
            <div className={s.vacio}>
              <p>Todavía no sellaste ninguna carpeta en esta sesión. Se sella cuando pedís que un banco o un agente te contacte.</p>
              <div className={s.btnRow}>
                <Link href="/proyeccion#cubrir" className={`${s.btn} ${s.btnPri}`}>Cubrir un hueco</Link>
                <Link href="/excedente" className={s.btn}>Colocar un excedente</Link>
              </div>
            </div>
          ) : (
            <ul className={s.lista}>
              {sellos.map(x => (
                <li key={x.hash} style={{ display: 'grid', gap: 8, padding: '12px 0', borderTop: '1px solid var(--line)' }}>
                  <div className={s.cardHead}>
                    <div><strong style={{ fontWeight: 600 }}>{x.motivo}</strong><p className={s.sub}>{x.destino === 'alyc-demo' ? 'Agente habilitado (demo)' : x.destino === 'banco-demo' ? 'Banco de la demo' : x.destino} · {fechaHora(x.fecha)}</p></div>
                    <span className={`${s.chip} ${x.modo === 'testnet' ? s.chipOk : s.chipWarn}`}>{x.modo === 'testnet' ? 'Base Sepolia' : 'Registro simulado'}</span>
                  </div>
                  <div className={s.hash}>
                    <code>{x.hash}</code>
                    <button type="button" className={s.link} onClick={() => copiar(x.hash)} aria-label="Copiar huella">{copiado === x.hash ? 'Copiada' : 'Copiar'}</button>
                  </div>
                  <div className={s.btnRow}>
                    <Link href={`/entidad/${x.hash}`} className={s.btn}>Verificar como entidad</Link>
                    {x.url && <a href={x.url} className={s.btn} target="_blank" rel="noopener noreferrer">Ver transacción ↗</a>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={s.card} aria-labelledby="t-como">
          <h2 className={s.h2} id="t-como">Cómo funciona</h2>
          <ol className={s.pasos}>
            <li><span><b>Autorizás</b> compartir tu proyección con una entidad puntual (Ley 25.326).</span></li>
            <li><span><b>Armamos la carpeta</b>: proyección, huellas de tus archivos, opción elegida y consentimiento.</span></li>
            <li><span><b>Calculamos su huella</b> (SHA-256) y la registramos en Base Sepolia, una red de prueba pública.</span></li>
            <li><span><b>La entidad verifica</b>: recalcula la huella y la compara con el registro.</span></li>
          </ol>
        </section>
      </div>

      <section className={s.card} aria-labelledby="t-verif">
        <div><h2 className={s.h2} id="t-verif">Verificar una huella</h2><p className={s.sub}>Pegá el hash que te compartieron (empieza con 0x y tiene 64 caracteres).</p></div>
        <form onSubmit={verificar} className={s.btnRow} style={{ alignItems: 'stretch' }}>
          <label htmlFor="hash" className={s.sr}>Huella a verificar</label>
          <input id="hash" value={hash} onChange={e => setHash(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off"
            style={{ flex: '1 1 260px', minWidth: 0, minHeight: 44, padding: '0 12px', borderRadius: 12, border: '1px solid var(--line-2)', background: 'var(--surface)', color: 'var(--ink)', fontFamily: 'var(--f-m)', fontSize: 13 }} />
          <button type="submit" className={`${s.btn} ${s.btnPri}`} disabled={!valido || v?.estado === 'buscando'}>{v?.estado === 'buscando' ? 'Verificando…' : 'Verificar'}</button>
        </form>
        {hash && !valido && <p className={s.sub} role="status">El formato no es válido todavía.</p>}
        <div role="status" aria-live="polite">
          {v?.estado === 'error' && <div className={s.errorBox}>No pude verificar.<p>{v.m}</p></div>}
          {v?.estado === 'ok' && (
            v.r.coincide && v.r.registro.existe ? (
              <div className={s.selloBox}>
                <strong>Carpeta íntegra y registrada</strong>
                <p>La huella recalculada coincide con el registro {v.r.registro.modo === 'testnet' ? 'en Base Sepolia' : 'simulado'} del {fechaHora(v.r.registro.fecha)}.</p>
                <div className={s.btnRow}>
                  <Link href={`/entidad/${hash.trim().toLowerCase()}`} className={s.btn}>Abrir la carpeta</Link>
                  {v.r.registro.url && <a href={v.r.registro.url} className={s.btn} target="_blank" rel="noopener noreferrer">Ver en el explorador ↗</a>}
                </div>
              </div>
            ) : (
              <div className={s.errorBox}>{v.r.registro.existe ? 'La carpeta no coincide con el registro.' : 'No encontré esa huella registrada.'}
                <p>{v.r.registro.existe ? 'Alguien pudo haber modificado el contenido.' : 'Revisá que la hayas copiado completa y que se haya sellado en este mismo servidor.'}</p></div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
