'use client';
// Excedente: cuánto sobra de forma segura, por cuántos días, y qué CLASES genéricas de colocación encajan.
// No nombra emisores ni productos, no recomienda: deriva a un agente habilitado solo con consentimiento expreso.
import Link from 'next/link';
import { useState } from 'react';
import { ConDatos, SelloListo, sellar } from '../_ui/comun';
import { difDias, fCorta, fNum, millones, pct, pesos, plural, type Excedente, type Sello } from '../_ui/formato';
import { useDatos, type Vista } from '../_ui/datos';
import s from '../app.module.css';

const LEGAL = 'CFO de Bolsillo no es un agente de bolsa ni asesor financiero, no custodia fondos y no recomienda emisores ni productos. Las tasas son de referencia (BCRA) y no garantizan resultados. Las condiciones reales las informa cada entidad habilitada por la CNV o el BCRA.';
const CONSENT = 'Autorizo a CFO de Bolsillo a compartir mi proyección de caja y el excedente estimado con un agente habilitado por la CNV, para que me contacte. Entiendo que no es una recomendación de inversión.';

export default function PaginaExcedente() {
  return (
    <div className={s.pagina}>
      <div className={s.cabPagina}>
        <h1>Excedente</h1>
        <p>Si te sobra plata de forma segura, cuánto, por cuántos días, y qué tipos de colocación entran en esa ventana sin tocar tu colchón.</p>
      </div>
      <ConDatos>{v => <Contenido v={v} />}</ConDatos>
      <p className={s.legal} role="note">{LEGAL}</p>
    </div>
  );
}

function Contenido({ v }: { v: Vista }) {
  const ex = v.excedente;
  const { completando } = useDatos();
  if (!ex && completando) return <div className={s.hueso} style={{ height: 220 }} role="status" aria-label="Calculando el excedente" />;
  if (!ex) {
    return (
      <section className={s.card} aria-labelledby="t-pend">
        <h2 className={s.h2} id="t-pend">El cálculo de excedente todavía no está disponible</h2>
        <p className={s.sub}>El servidor no devolvió el excedente para este análisis. Cuando esté, vas a ver acá el monto que podés colocar sin riesgo de quedarte sin caja, la ventana de días, el colchón que reservamos y el rendimiento estimado, nominal y descontada la inflación.</p>
        <div className={s.btnRow}><Link href="/proyeccion" className={s.btn}>Ver la proyección</Link></div>
      </section>
    );
  }
  return ex.hay ? <ConExcedente v={v} ex={ex} /> : <SinExcedente v={v} ex={ex} />;
}

function Desglose({ ex }: { ex: Excedente }) {
  return (
    <dl className={s.desglose}>
      <div><dt>Saldo hoy</dt><dd className={s.num}>{pesos(ex.saldoActual)}</dd></div>
      <div><dt>Mínimo proyectado</dt><dd className={`${s.num} ${ex.minimoProyectado < 0 ? s.neg : ''}`}>{pesos(ex.minimoProyectado)}</dd></div>
      <div><dt>Colchón que no se toca</dt><dd className={s.num}>{pesos(ex.colchon)}</dd></div>
      <div><dt>Excedente disponible</dt><dd className={`${s.num} ${ex.monto > 0 ? s.pos : ''}`}>{pesos(ex.monto)}</dd></div>
    </dl>
  );
}

function SinExcedente({ v, ex }: { v: Vista; ex: Excedente }) {
  return (
    <>
      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-no">
          <div className={`${s.estadoCaja} ${v.pronostico.hueco ? s.estNeg : s.estAcc}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.2v.1" /></svg>
            <strong id="t-no">Hoy no te sobra plata para colocar</strong>
            <p>{ex.motivo ?? 'Tu caja proyectada no deja un margen seguro por encima del colchón.'}</p>
          </div>
          {v.pronostico.hueco && <div className={s.btnRow}><Link href="/proyeccion#cubrir" className={`${s.btn} ${s.btnPri}`}>Primero, cubrir el hueco</Link></div>}
        </section>
        <section className={s.card} aria-labelledby="t-cuentas"><h2 className={s.h2} id="t-cuentas">Las cuentas</h2><Desglose ex={ex} /></section>
      </div>
      {ex.clases.length > 0 && <Clases ex={ex} titulo="Tipos de colocación (para cuando sobre)" />}
      <p className={s.legal}>{ex.aviso}</p>
    </>
  );
}

function ConExcedente({ v, ex }: { v: Vista; ex: Excedente }) {
  const w = ex.ventana;
  const total = Math.max(1, v.pronostico.serie.length);
  const izq = w ? Math.max(0, Math.min(100, (difDias(v.pronostico.hoy, w.desde) / total) * 100)) : 0;
  const ancho = w ? Math.max(2, Math.min(100 - izq, (w.dias / total) * 100)) : 0;
  return (
    <>
      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-monto">
          <div className={s.hero}>
            <span className={s.eyebrow} id="t-monto">Podés colocar sin riesgo</span>
            <span className={`${s.heroNum} ${s.num}`}>{pesos(ex.monto)}</span>
            {w && <span className={s.heroSub}>por {plural(w.dias, 'día')}, del {fCorta(w.desde)} al {fCorta(w.hasta)}</span>}
          </div>
          {w && (
            <div className={s.ventana}>
              <div className={s.ventanaBarra} role="img" aria-label={`Ventana de ${w.dias} días dentro de los próximos ${total}`}><i style={{ left: `${izq}%`, width: `${ancho}%` }} /></div>
              <div className={s.ventanaEtq}><span>hoy {fNum(v.pronostico.hoy).slice(0, 5)}</span><span>{total} días</span></div>
            </div>
          )}
          {ex.rendimiento && (
            <div className={s.kpis} style={{ gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
              <div className={s.kpi} style={{ background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <span>Rendimiento nominal</span><b className={`${s.num} ${s.pos}`}>{pesos(ex.rendimiento.pesos)}</b><small>a {pct(ex.rendimiento.tna)} TNA de referencia</small>
              </div>
              <div className={s.kpi} style={{ background: 'var(--surface-2)', borderColor: 'transparent' }}>
                <span>Descontada la inflación</span><b className={`${s.num} ${ex.rendimiento.realPesos < 0 ? s.neg : s.pos}`}>{pesos(ex.rendimiento.realPesos)}</b><small>{ex.rendimiento.realPesos < 0 ? 'pierde contra la inflación proyectada' : 'le gana a la inflación proyectada'}</small>
              </div>
            </div>
          )}
        </section>
        <section className={s.card} aria-labelledby="t-cuentas">
          <h2 className={s.h2} id="t-cuentas">Cómo lo calculamos</h2>
          <Desglose ex={ex} />
          <p className={s.sub}>El colchón cubre tus gastos fijos aunque las ventas vengan peor. El excedente es lo que queda por encima del mínimo proyectado y del colchón durante toda la ventana.</p>
        </section>
      </div>
      <Clases ex={ex} titulo="Tipos de colocación que encajan" />
      <Contacto v={v} ex={ex} />
      <p className={s.legal}>{ex.aviso}</p>
    </>
  );
}

function Clases({ ex, titulo }: { ex: Excedente; titulo: string }) {
  const orden = [...ex.clases].sort((a, b) => Number(b.encaja) - Number(a.encaja));
  return (
    <section className={s.card} aria-labelledby="t-clases">
      <div><h2 className={s.h2} id="t-clases">{titulo}</h2><p className={s.sub}>Clases genéricas, sin emisores ni productos. TNA de referencia del BCRA.</p></div>
      <ul className={s.clases} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {orden.map(c => (
          <li key={c.id} className={`${s.clase} ${c.encaja ? '' : s.claseNo}`}>
            <span className={s.badges}>
              <span className={`${s.chip} ${c.encaja ? s.chipOk : ''}`}>{c.encaja ? '✓ Entra en tu ventana' : 'No entra en la ventana'}</span>
              <span className={`${s.chip} ${c.riesgo === 'medio' ? s.chipWarn : ''}`}>Riesgo {c.riesgo}</span>
            </span>
            <strong style={{ fontFamily: 'var(--f-d)', fontSize: 16 }}>{c.nombre}</strong>
            <span className={`${s.tna} ${s.num}`}>{c.tnaRef != null ? pct(c.tnaRef) : 's/d'}<small>TNA ref.</small></span>
            <dl className={s.atributos}>
              <dt>Plazo mínimo</dt><dd>{c.plazoMinDias <= 1 ? 'sin plazo' : `${c.plazoMinDias} días`}</dd>
              <dt>Liquidez</dt><dd>{c.liquidez}</dd>
            </dl>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{c.nota}</p>
            {c.cita && <a href={c.cita.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>{c.cita.fuente} · {c.cita.periodo}</a>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Contacto({ v, ex }: { v: Vista; ex: Excedente }) {
  const { agregarSello } = useDatos();
  const [abierto, setAbierto] = useState(false);
  const [ok, setOk] = useState(false);
  const [env, setEnv] = useState(false);
  const [sello, setSello] = useState<Sello | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function enviar() {
    if (!ok) return;
    setEnv(true); setErr(null);
    try {
      const titulo = `Contacto por excedente de ${pesos(ex.monto)}${ex.ventana ? ` por ${ex.ventana.dias} días` : ''}`;
      const x = await sellar(v, 'alyc-demo', { id: 'excedente', titulo }, CONSENT, { excedente: { monto: ex.monto, colchon: ex.colchon, ventana: ex.ventana } });
      setSello(x); agregarSello(x);
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setErr(/destino/i.test(m) ? 'El servidor todavía no tiene habilitado el destino "agente habilitado". No se compartió nada.' : m || 'No pude enviar el pedido.');
    } finally { setEnv(false); }
  }

  return (
    <section className={s.card} aria-labelledby="t-contacto">
      <div><h2 className={s.h2} id="t-contacto">¿Querés que te contacte un agente?</h2>
        <p className={s.sub}>Un agente habilitado por la CNV te explica las alternativas y sus condiciones. Solo compartimos tu proyección si lo autorizás.</p></div>
      {sello ? <SelloListo sello={sello} /> : !abierto ? (
        <div className={s.btnRow}><button type="button" className={`${s.btn} ${s.btnPri}`} onClick={() => setAbierto(true)}>Quiero que me contacte un agente habilitado</button></div>
      ) : (
        <>
          <label className={s.consent}>
            <input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} />
            <span>{CONSENT}</span>
          </label>
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnPri}`} disabled={!ok || env} onClick={enviar}>{env ? 'Sellando…' : 'Autorizar y sellar el pedido'}</button>
            <button type="button" className={s.btn} onClick={() => { setAbierto(false); setOk(false); }}>Cancelar</button>
          </div>
        </>
      )}
      {err && <div className={s.errorBox} role="alert">No se envió el pedido.<p>{err}</p></div>}
    </section>
  );
}
