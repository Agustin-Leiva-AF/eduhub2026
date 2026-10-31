'use client';
// Tarjeta "¿Conviene invertir?": el Tesorero (skill Analista de Caja) da el score y la luz verde/amarilla/roja.
// Sin luz verde: qué hacer primero con la caja. Con luz verde: el Researcher reparte el excedente por tramos (modo educativo:
// categorías, nunca emisores ni productos). El perfil lo elige el usuario y el Researcher recalcula en el navegador.
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { investigar, type Perfil } from '@/lib/researcher';
import type { Vista } from './datos';
import { fCorta, millones, pct, pesos, plural, type Tesoreria } from './formato';
import { Icono } from './iconos';
import s from '../app.module.css';

const SEM = { verde: s.chipOk, amarillo: s.chipWarn, rojo: s.chipNeg } as const;
const tono = (pt: number) => (pt < 40 ? 'rojo' : pt < 70 ? 'amarillo' : 'verde') as keyof typeof SEM;

export function Tesorero({ v }: { v: Vista }) {
  const t = v.tesoreria;
  return (
    <section className={s.card} aria-labelledby="t-tesorero">
      <div className={s.cardHead}>
        <div>
          <h2 className={s.h2} id="t-tesorero">¿Conviene invertir? Lo decide tu tesorero</h2>
          <p className={s.sub}>El tesorero mira la salud de tu caja y da (o no) la luz verde. Con luz verde, el researcher te dice dónde poner cada parte de lo que sobra.</p>
        </div>
      </div>
      {!t ? <p className={s.sub}>Recalculá tus datos para ver el diagnóstico del tesorero.</p> : <Diagnostico t={t} hueco={!!v.pronostico.hueco} />}
    </section>
  );
}

function Diagnostico({ t, hueco }: { t: Tesoreria; hueco: boolean }) {
  const d = t.veredicto.decision;
  const est = d === 'invertir' ? s.estOk : d === 'cautela' ? s.estWarnT : s.estNeg;
  return (
    <>
      <div className={s.tesHead}>
        <div className={s.score} aria-label={`Score interno ${t.score.valor} de 100, categoría ${t.score.categoria}`}>
          <div className={s.scoreAro} style={{ ['--p' as string]: `${t.score.valor}%`, ['--c' as string]: `var(--${tono(t.score.valor) === 'verde' ? 'pos' : tono(t.score.valor) === 'amarillo' ? 'warn' : 'neg'})` }}>
            <b className={s.num}>{t.score.valor}</b><small>/100</small>
          </div>
          <div className={s.scoreTxt}>
            <span className={s.eyebrow}>Salud de tu caja</span>
            <strong>Categoría {t.score.categoria}{t.score.rango && <span className={s.sub}> · entre {t.score.rango[0]} y {t.score.rango[1]}</span>}</strong>
            <span className={s.sub}>{t.score.lectura}.</span>
            {t.score.preliminar && <span className={`${s.chip} ${s.chipMini} ${s.chipWarn}`} title={t.score.motivoPreliminar}>Preliminar</span>}
          </div>
        </div>
        <div className={`${s.estadoCaja} ${est}`} role={d === 'no_invertir' ? 'alert' : undefined}>
          <Icono n={d === 'invertir' ? 'ok' : 'alerta'} />
          <strong>{t.veredicto.titulo}</strong>
          <p>{t.veredicto.motivo}</p>
        </div>
      </div>

      <ul className={s.pilares}>
        {t.pilares.map(p => (
          <li key={p.id}>
            <details>
              <summary>
                <span>{p.nombre} <small>({p.peso}%)</small></span>
                {p.puntaje === null ? <span className={`${s.chip} ${s.chipMini}`}>Sin datos</span>
                  : <span className={s.pilarBarra} aria-label={`${p.puntaje} de 100`}><i className={s[`b_${tono(p.puntaje)}`]} style={{ width: `${Math.max(3, p.puntaje)}%` }} /><b className={s.num}>{p.puntaje}</b></span>}
              </summary>
              {p.falta && <p className={s.sub}>{p.falta}</p>}
              {p.indicadores.map(i => (
                <div key={i.id} className={s.indicador}>
                  <span>{i.nombre} <span className={`${s.chip} ${s.chipMini} ${SEM[i.semaforo]}`}>{i.valor}</span></span>
                  <small>{i.explica}</small>
                </div>
              ))}
            </details>
          </li>
        ))}
      </ul>
      {t.score.preliminar && t.score.motivoPreliminar && <p className={s.sub}>{t.score.motivoPreliminar} Por eso mostramos un rango.</p>}

      <div>
        <h3 className={s.h3}>{d === 'no_invertir' ? 'Qué hacer primero con tu plata' : 'Lo que dice el tesorero'}</h3>
        <ol className={s.acciones}>
          {t.acciones.map((a, i) => (
            <li key={i}>
              <strong>{a.titulo}</strong>
              <small>{a.porque}</small>
              <span><span className={`${s.chip} ${s.chipMini} ${s.chipAcc}`}>{a.impacto}</span> <span className={`${s.chip} ${s.chipMini}`}>{a.plazo}</span></span>
            </li>
          ))}
        </ol>
        {hueco && <div className={s.btnRow}><Link href="/proyeccion#cubrir" className={`${s.btn} ${s.btnPri}`}>Comparar cómo cubrir el hueco</Link></div>}
      </div>

      {t.bloque && <Researcher t={t} />}
      <p className={s.legal} role="note">{t.aviso}</p>
    </>
  );
}

const PERFILES: Perfil[] = ['conservador', 'moderado', 'agresivo'];

function Researcher({ t }: { t: Tesoreria }) {
  const [tolerancia, setTolerancia] = useState<Perfil>('moderado');
  const inf = useMemo(() => investigar(t.bloque!, t.tasas, tolerancia), [t, tolerancia]);
  const total = inf.tramos.reduce((a, x) => a + x.tramo.monto, 0);
  return (
    <div className={s.research}>
      <div className={s.cardHead}>
        <div>
          <span className={s.eyebrow}>Researcher · modo educativo</span>
          <h3 className={s.h3}>Dónde poner los {millones(total)} que tenés arriba de la reserva</h3>
        </div>
        <div className={s.seg} role="radiogroup" aria-label="Cuánto riesgo te animás a tomar">
          {PERFILES.map(p => <button key={p} type="button" role="radio" aria-checked={tolerancia === p} onClick={() => setTolerancia(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}
        </div>
      </div>
      <p className={s.sub}>{inf.perfil.explica}{inf.tramos.length > 1 && ` Solo ${millones(inf.tramos[inf.tramos.length - 1].tramo.monto)} te sobran los ${inf.tramos[inf.tramos.length - 1].tramo.dias_horizonte} días; el resto lo vas a necesitar antes, por eso va a plazos más cortos.`}</p>
      <p className={s.enUnaLinea}>{inf.enUnaLinea}</p>
      <ul className={s.prioridades}>{inf.prioridades.map((x, i) => <li key={i}>{x}</li>)}</ul>

      <div className={s.tramos}>
        {inf.tramos.map((x, i) => (
          <article key={i} className={s.tramo}>
            <header>
              <b className={`${s.num} ${s.tramoMonto}`}>{millones(x.tramo.monto)}</b>
              <span className={`${s.chip} ${s.chipMini} ${s.chipAcc}`}>{x.horizonteTexto}</span>
            </header>
            <p className={s.sub}>Se necesita el <b>{fCorta(x.tramo.se_necesita_el)}</b> ({plural(x.tramo.dias_horizonte, 'día')}) para {x.tramo.uso_futuro}.</p>
            <ul className={s.catLista}>
              {x.clases.map(c => (
                <li key={c.nombre}>
                  <strong>{c.nombre}</strong>
                  <small>{c.nota}</small>
                  <span className={s.catMeta}>Liquidez: {c.liquidez} · Riesgo {c.riesgo}{c.tna !== null && <> · {pct(c.tna)} TNA</>}</span>
                </li>
              ))}
            </ul>
            {x.rendimiento && (
              <p className={s.tramoRinde}>
                Referencia: <b className={`${s.num} ${s.pos}`}>+{pesos(x.rendimiento.pesos)}</b> en {plural(x.tramo.dias_horizonte, 'día')}
                {' '}({x.rendimiento.referencia}, {pct(x.rendimiento.tna)}). Descontada la inflación: <b className={`${s.num} ${x.rendimiento.realPesos < 0 ? s.neg : s.pos}`}>{x.rendimiento.realPesos >= 0 ? '+' : ''}{pesos(x.rendimiento.realPesos)}</b>.
              </p>
            )}
            <p className={s.sub}><b>Riesgo principal:</b> {x.riesgoPrincipal}</p>
            {x.noEntran.length > 0 && <p className={s.sub}><b>No entra:</b> {x.noEntran.join(' · ')}.</p>}
          </article>
        ))}
      </div>

      <p className={s.sub}>{inf.equilibrio} <span title={`${t.tasas.citas.plazoFijo.fuente} · ${t.tasas.citas.ipc.fuente}`}>Fuentes: {t.tasas.citas.plazoFijo.dato} ({t.tasas.citas.plazoFijo.periodo}), {t.tasas.citas.ipc.dato} ({t.tasas.citas.ipc.periodo}), vía OpenARG.</span></p>
      <details className={s.plegable}>
        <summary>Lo que puede salir mal</summary>
        <ul>{inf.puedeSalirMal.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </details>
      <details className={s.plegable}>
        <summary>Glosario</summary>
        <dl>{inf.glosario.map(g => <div key={g.t}><dt>{g.t}</dt><dd>{g.d}</dd></div>)}</dl>
      </details>
      <p className={s.avisoBox} role="note">{inf.aviso}</p>
    </div>
  );
}
