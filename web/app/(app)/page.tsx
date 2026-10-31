'use client';
// Hoy: saldo, si hay hueco o estás bien, próximos vencimientos y la acción principal.
import Link from 'next/link';
import { ConDatos } from './_ui/comun';
import { GraficoSaldo } from './_ui/graficos';
import { difDias, enDias, fCorta, fLarga, fNum, millones, pesos, plural, sumarDias, type Evento } from './_ui/formato';
import { useDatos, type Vista } from './_ui/datos';
import s from './app.module.css';

export default function Hoy() {
  return <div className={s.pagina}><ConDatos>{v => <Contenido v={v} />}</ConDatos></div>;
}

const Alerta = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></svg>;
const Ok = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16.2 9.5" /></svg>;

function Contenido({ v }: { v: Vista }) {
  const p = v.pronostico;
  const h = p.hueco;
  const ex = v.excedente;
  const fin = sumarDias(p.hoy, 14);
  const proximos: Evento[] = p.eventos
    .filter(e => e.fecha > p.hoy && e.fecha <= fin && e.monto < 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.monto - b.monto)
    .slice(0, 7);
  const totalProx = p.eventos.filter(e => e.fecha > p.hoy && e.fecha <= fin && e.monto < 0).reduce((a, e) => a + e.monto, 0);
  const { completando } = useDatos();
  const alertas = (v.alertas?.alertas ?? []).filter(a => a.nivel !== 'info').slice(0, 4);

  return (
    <>
      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-saldo">
          <div className={s.hero}>
            <span className={s.eyebrow} id="t-saldo">Saldo en el banco · {fNum(p.hoy)}</span>
            <span className={`${s.heroNum} ${s.num} ${p.saldoInicial < 0 ? s.neg : ''}`}>{pesos(p.saldoInicial)}</span>
            <span className={s.heroSub}>{v.pyme}{v.ficticia ? ' (datos ficticios de demostración)' : ''}</span>
          </div>

          {h ? (
            <div className={`${s.estadoCaja} ${s.estNeg}`} role="alert">
              <Alerta />
              <strong>Te falta plata desde el {fLarga(h.inicio)} ({enDias(difDias(p.hoy, h.inicio))})</strong>
              <p>Llegás a <b className={s.num}>{millones(h.minimo)}</b> el {fCorta(h.fechaMinimo)} y estás {plural(h.dias, 'día')} en rojo.
                {p.huecos.length > 1 && ` Hay ${plural(p.huecos.length - 1, 'hueco')} más adelante.`}</p>
            </div>
          ) : (
            <div className={`${s.estadoCaja} ${s.estOk}`}>
              <Ok />
              <strong>Estás bien: no te quedás sin caja en 120 días</strong>
              <p>{(() => { const m = p.horizontes.at(-1); return m ? <>Tu punto más bajo es <b className={s.num}>{millones(m.minimo)}</b> el {fCorta(m.fechaMinimo)}.</> : null; })()}</p>
            </div>
          )}

          <div className={s.regla} aria-label="Saldo mínimo por horizonte">
            {p.horizontes.map(x => (
              <div key={x.dias} className={`${s.reglaItem} ${x.minimo < 0 ? s.reglaNeg : ''}`} style={{ cursor: 'default' }}>
                <span>{x.dias} días</span>
                <b className={s.num}>{millones(x.minimo)}</b>
                <small>mín. {fCorta(x.fechaMinimo)}</small>
              </div>
            ))}
          </div>

          <div className={s.btnRow}>
            {h ? <Link href="/proyeccion#cubrir" className={`${s.btn} ${s.btnPri}`}>Ver cómo cubrir el hueco</Link>
              : ex?.hay ? <Link href="/excedente" className={`${s.btn} ${s.btnPri}`}>Te sobran {millones(ex.monto)}: ver opciones</Link>
                : <Link href="/proyeccion" className={`${s.btn} ${s.btnPri}`}>Ver la proyección</Link>}
            <Link href="/datos" className={s.btn}>Actualizar datos</Link>
          </div>
        </section>

        <section className={s.card} aria-labelledby="t-prox">
          <div className={s.cardHead}>
            <div>
              <h2 className={s.h2} id="t-prox">Próximos pagos</h2>
              <p className={s.sub}>Hasta el {fCorta(fin)} · total <span className={s.num}>{millones(totalProx)}</span></p>
            </div>
          </div>
          {proximos.length ? (
            <ul className={s.lista}>
              {proximos.map((e, i) => (
                <li key={i} className={s.item}>
                  <span className={s.fecha}><b className={s.num}>{+e.fecha.slice(8, 10)}</b><small>{fCorta(e.fecha).split(' ')[0]}</small></span>
                  <span className={s.itemTexto}><strong title={e.concepto}>{e.concepto}</strong><small>{enDias(difDias(p.hoy, e.fecha))}</small></span>
                  <span className={`${s.monto} ${s.num}`}>{millones(e.monto)}</span>
                </li>
              ))}
            </ul>
          ) : <p className={s.sub}>No hay pagos en los próximos 14 días.</p>}
          <Link href="/proyeccion#movimientos" className={s.link} style={{ display: 'inline-flex', alignItems: 'center' }}>Ver todos los movimientos</Link>
        </section>
      </div>

      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-30">
          <div className={s.cardHead}>
            <div><h2 className={s.h2} id="t-30">Tu caja los próximos 30 días</h2><p className={s.sub}>Tocá o pasá el mouse para ver cada día.</p></div>
            <Link href="/proyeccion" className={s.link}>Ver 120 días</Link>
          </div>
          <GraficoSaldo p={p} horizonte={30} compacto conTabla={false} />
        </section>

        <section className={s.card} aria-labelledby="t-alertas">
          <h2 className={s.h2} id="t-alertas">Avisos</h2>
          {v.alertas == null && completando ? <p className={s.sub} role="status">Cargando avisos…</p> : v.alertas == null ? <p className={s.sub}>Los avisos de vencimientos no están disponibles para esta fuente.</p>
            : alertas.length ? (
              <ul className={s.lista}>
                {alertas.map(a => (
                  <li key={a.id} className={s.item} style={{ gridTemplateColumns: 'auto minmax(0,1fr)' }}>
                    <span className={`${s.chip} ${a.nivel === 'critica' ? s.chipNeg : s.chipWarn}`}>{a.nivel === 'critica' ? 'Urgente' : 'Atención'}</span>
                    <span className={s.itemTexto}><strong style={{ whiteSpace: 'normal' }}>{a.titulo}</strong><small>{a.detalle}</small></span>
                  </li>
                ))}
              </ul>
            ) : <p className={s.sub}>Sin vencimientos urgentes. Activá los avisos para enterarte sin abrir la app.</p>}
          <Link href="/datos#avisos" className={s.link}>Configurar avisos</Link>
        </section>
      </div>
    </>
  );
}
