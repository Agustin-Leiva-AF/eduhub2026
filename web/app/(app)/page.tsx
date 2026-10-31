'use client';
// Inicio. Sin datos: arranque en 10 segundos (3 formas de cargar + demo en un clic).
// Con datos: saldo y alerta arriba, y los dos bloques que importan: próximos vencimientos y lo que podría generar el excedente.
import Link from 'next/link';
import { Checklist, ConDatos, Esqueleto } from './_ui/comun';
import { Generando } from './_ui/excedente';
import { GraficoSaldo } from './_ui/graficos';
import { difDias, enDias, ETQ_ORIGEN, fCorta, fLarga, fNum, millones, pesos, plural, sumarDias, type Evento } from './_ui/formato';
import { progreso, useDatos, type Vista } from './_ui/datos';
import { Icono, type NombreIcono } from './_ui/iconos';
import s from './app.module.css';

export default function Inicio() {
  const { listo, ws, vista, calculando } = useDatos();
  if (!listo) return <div className={s.pagina}><Esqueleto /></div>;
  if (ws.modo === 'vacio' && !vista) return <Bienvenida />;
  if (!vista && calculando && ws.modo === 'propio') return <div className={s.pagina}><Checklist compacto /><Esqueleto /></div>;
  return <div className={s.pagina}><ConDatos>{v => <Hoy v={v} />}</ConDatos></div>;
}

/* ---------- sin datos ---------- */
function Bienvenida() {
  const { abrirCarga, cargarDemo } = useDatos();
  const acciones: { v: 'mp' | 'archivos' | 'menu'; i: NombreIcono; t: string; d: string }[] = [
    { v: 'mp', i: 'mp', t: 'Conectar Mercado Pago', d: 'Traemos tus cobros y pagos de los últimos 90 días.' },
    { v: 'archivos', i: 'archivo', t: 'Subir archivos', d: 'Extracto del banco, comprobantes de ARCA, boletas.' },
    { v: 'menu', i: 'factura', t: 'Cargar a mano', d: 'Tu saldo, un gasto o una factura. Cuatro datos.' },
  ];
  return (
    <div className={`${s.pagina} ${s.bienvenida}`}>
      <section className={s.promesa} aria-labelledby="t-promesa">
        <span className={s.eyebrow}>CFO de Bolsillo</span>
        <h1 id="t-promesa">Sabé hoy si te va a alcanzar la plata. Y qué hacer con la que sobra.</h1>
        <p>Proyectamos tu caja día por día para los próximos 120 días: qué vence, cuándo te falta y cuánto te sobra para que rinda.</p>
        <div className={s.btnRow}>
          <button type="button" className={`${s.btn} ${s.btnDemo}`} onClick={() => cargarDemo()}>
            <Icono n="demo" size={18} />Ver demo en 1 clic
          </button>
          <span className={s.sub}>Con un negocio inventado, sin cargar nada.</span>
        </div>
      </section>

      <section aria-labelledby="t-empezar" className={s.empezar}>
        <h2 className={s.h2} id="t-empezar">Empezá con tus datos</h2>
        <ul className={s.acciones3}>
          {acciones.map(a => (
            <li key={a.v}>
              <button type="button" className={s.accionGrande} onClick={() => abrirCarga(a.v)}>
                <span className={s.accionIco}><Icono n={a.i} size={26} /></span>
                <strong>{a.t}</strong>
                <small>{a.d}</small>
                <span className={s.accionIr} aria-hidden>Empezar →</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Checklist />

      <section className={s.glosario} aria-label="Palabras que vas a ver">
        <div><b>Saldo</b><span>La plata que tenés hoy, en el banco y en Mercado Pago.</span></div>
        <div><b>Vencimiento</b><span>El día que tenés que pagar algo: una factura, un impuesto, los sueldos.</span></div>
        <div><b>Excedente</b><span>Lo que te sobra después de cubrir todo y una reserva. Puede rendir mientras no lo usás.</span></div>
      </section>
      <p className={s.legal}>Tus datos quedan en este navegador; los mandamos al servidor solo para hacer la cuenta. No compartimos nada sin tu permiso.</p>
    </div>
  );
}

/* ---------- con datos ---------- */
const OBLIG = new Set(['sueldos', 'aguinaldo', 'cargas_sociales', 'impuestos', 'alquiler', 'servicios', 'proveedores', 'otros', 'retiros', 'bancarios']);

function Hoy({ v }: { v: Vista }) {
  const p = v.pronostico;
  const h = p.hueco;
  const { ws } = useDatos();
  const min = p.horizontes.at(-1);
  const incompleto = ws.modo === 'propio' && progreso(ws, v).some(x => !x.hecho);
  return (
    <>
      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-saldo">
          <div className={s.hero}>
            <span className={s.eyebrow} id="t-saldo">Tu saldo hoy · {fNum(p.hoy)}</span>
            <span className={`${s.heroNum} ${s.num} ${p.saldoInicial < 0 ? s.neg : ''}`}>{pesos(p.saldoInicial)}</span>
            <span className={s.heroSub}>{v.pyme}{v.ficticia ? ' (negocio inventado para la demo)' : ''}</span>
          </div>
          {h ? (
            <div className={`${s.estadoCaja} ${s.estNeg}`} role="alert">
              <Icono n="alerta" />
              <strong>Te falta plata desde el {fLarga(h.inicio)} ({enDias(difDias(p.hoy, h.inicio))})</strong>
              <p>Llegás a <b className={s.num}>{millones(h.minimo)}</b> el {fCorta(h.fechaMinimo)} y estás {plural(h.dias, 'día')} en rojo.
                {p.huecos.length > 1 && ` Hay ${plural(p.huecos.length - 1, 'hueco')} más adelante.`}</p>
            </div>
          ) : (
            <div className={`${s.estadoCaja} ${s.estOk}`}>
              <Icono n="ok" />
              <strong>Te alcanza: no te quedás sin plata en 120 días</strong>
              {min && <p>Lo más bajo que llega tu caja es <b className={s.num}>{millones(min.minimo)}</b>, el {fCorta(min.fechaMinimo)}.</p>}
            </div>
          )}
          <div className={s.btnRow}>
            {h ? <Link href="/proyeccion#cubrir" className={`${s.btn} ${s.btnPri}`}>Ver cómo cubrir el hueco</Link>
              : <Link href="/proyeccion" className={s.btn}>Ver la proyección completa</Link>}
          </div>
        </section>
        {/* Al lado del saldo: lo que falta cargar (si falta algo) o, en escritorio, el gráfico de 30 días. */}
        {incompleto ? <Checklist compacto /> : <div className={s.soloEscritorio}><Grafico30 v={v} id="t-30a" /></div>}
      </div>

      <div className={`${s.cols} ${s.c2}`}>
        <Vencimientos v={v} />
        <Generando v={v} />
      </div>

      <div className={incompleto ? undefined : s.soloMovil}><Grafico30 v={v} id="t-30b" /></div>
    </>
  );
}

function Grafico30({ v, id }: { v: Vista; id: string }) {
  return (
    <section className={s.card} aria-labelledby={id}>
      <div className={s.cardHead}>
        <div><h2 className={s.h2} id={id}>Tu caja los próximos 30 días</h2><p className={s.sub}>Tocá o pasá el mouse para ver cada día.</p></div>
        <Link href="/proyeccion" className={s.link}>Ver 120 días</Link>
      </div>
      <GraficoSaldo p={v.pronostico} horizonte={30} compacto conTabla={false} />
    </section>
  );
}

function Vencimientos({ v }: { v: Vista }) {
  const p = v.pronostico;
  const { abrirCarga } = useDatos();
  const fin = sumarDias(p.hoy, 30);
  const todos: Evento[] = p.eventos
    .filter(e => e.fecha > p.hoy && e.fecha <= fin && e.monto < 0 && OBLIG.has(e.categoria))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.monto - b.monto);
  const lista = todos.slice(0, 6);
  const total = todos.reduce((a, e) => a + e.monto, 0);
  const vencidas = v.alertas?.alertas.find(a => a.tipo === 'vencida');
  const saldoEn = (f: string) => p.serie.find(d => d.fecha === f)?.saldo ?? null;

  return (
    <section className={`${s.card} ${s.protagonista}`} aria-labelledby="t-venc">
      <div className={s.cardHead}>
        <div>
          <h2 className={s.h2} id="t-venc">Próximos vencimientos</h2>
          <p className={s.sub}>{todos.length ? <>En los próximos 30 días pagás <b className={s.num}>{millones(-total)}</b> en {plural(todos.length, 'vencimiento')}.</> : 'Lo que tenés que pagar y cuándo.'}</p>
        </div>
        <button type="button" className={s.btnChico} onClick={() => abrirCarga('factura')}>+ Factura</button>
      </div>
      {vencidas && (
        <div className={`${s.estadoCaja} ${s.estNeg}`} role="alert">
          <Icono n="alerta" />
          <strong>{vencidas.titulo}</strong>
          <p>{vencidas.detalle}</p>
        </div>
      )}
      {lista.length ? (
        <ul className={s.lista}>
          {lista.map((e, i) => {
            const despues = saldoEn(e.fecha);
            const dias = difDias(p.hoy, e.fecha);
            const estimado = e.origen === 'factura estimada' || e.origen === 'recurrente' || e.origen === 'proyección de ventas';
            const estado = despues != null && despues < 0 ? { t: 'No alcanza', c: s.chipNeg } : dias <= 3 ? { t: enDias(dias).replace(/^en /, 'En '), c: s.chipWarn } : estimado ? { t: 'Estimado', c: '' } : { t: ETQ_ORIGEN[e.origen] ?? 'Programado', c: s.chipAcc };
            return (
              <li key={i} className={`${s.item} ${s.itemVenc}`}>
                <span className={s.fecha}><b className={s.num}>{+e.fecha.slice(8, 10)}</b><small>{fCorta(e.fecha).split(' ')[0]}</small></span>
                <span className={s.itemTexto}>
                  <strong title={e.concepto}>{e.concepto}</strong>
                  <small><span className={`${s.chip} ${s.chipMini} ${estado.c}`}>{estado.t}</span>{despues != null && <span className={s.quedan}>te quedan <b className={`${s.num} ${despues < 0 ? s.neg : ''}`}>{millones(despues)}</b></span>}</small>
                </span>
                <span className={`${s.monto} ${s.num}`}>{millones(e.monto)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={s.vacioChico}>
          <p>No vemos pagos en los próximos 30 días. Si tenés facturas, impuestos o sueldos por pagar, cargalos y te avisamos antes de que venzan.</p>
          <button type="button" className={`${s.btn} ${s.btnPri}`} onClick={() => abrirCarga('factura')}>Cargar una factura</button>
        </div>
      )}
      {todos.length > lista.length && <p className={s.sub}>Y {plural(todos.length - lista.length, 'vencimiento')} más.</p>}
      <div className={s.btnRow}>
        <Link href="/proyeccion#movimientos" className={s.link}>Ver todos los movimientos</Link>
        <Link href="/datos#avisos" className={s.link}>Avisarme antes de cada vencimiento</Link>
      </div>
    </section>
  );
}
