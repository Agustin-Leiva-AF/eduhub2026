'use client';
// Datos: de dónde sale el análisis (demo, Mercado Pago, CSV, foto), qué archivos se leyeron con su huella, y avisos.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Avisos from '../../components/chat/Avisos';
import { nombreFuente, useDatos } from '../_ui/datos';
import { fNum, millones, pesos } from '../_ui/formato';
import s from '../app.module.css';

type EstadoMP =
  | { tipo: 'cargando' }
  | { tipo: 'sin-ruta' }
  | { tipo: 'pendiente'; detalle?: string }
  | { tipo: 'ok'; conectado: boolean; modo?: string }
  | { tipo: 'error'; detalle: string };

type Comprobante = { tipo?: string | null; fecha_emision?: string | null; fecha_vencimiento?: string | null; cuit_emisor?: string | null; razon_social_emisor?: string | null; numero?: string | null; total?: number | null };

export default function Datos() {
  const { vista, fuente, estado, error, cargarDemo, cargarMP, subir, sumarFoto } = useDatos();
  const ocupado = estado === 'cargando';
  const [mp, setMp] = useState<EstadoMP>({ tipo: 'cargando' });
  const [sobre, setSobre] = useState(false);
  const csv = useRef<HTMLInputElement>(null);
  const img = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<{ estado: 'leyendo' } | { estado: 'ok'; c: Comprobante; nombre: string } | { estado: 'error'; motivo: string } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch('/api/mp/estado').then(async r => {
      const j = await r.json().catch(() => ({} as Record<string, unknown>));
      if (!vivo) return;
      if (r.status === 404) setMp({ tipo: 'sin-ruta' });
      else if (r.status === 501) setMp({ tipo: 'pendiente', detalle: typeof j.error === 'string' ? j.error : undefined });
      else if (!r.ok) setMp({ tipo: 'error', detalle: typeof j.error === 'string' ? j.error : `El servidor respondió ${r.status}.` });
      else if (j.configurado === false && !j.conectado) setMp({ tipo: 'pendiente' });
      else setMp({ tipo: 'ok', conectado: Boolean(j.conectado), modo: typeof j.modo === 'string' ? j.modo : undefined });
    }).catch(() => vivo && setMp({ tipo: 'error', detalle: 'Sin conexión con el servidor.' }));
    return () => { vivo = false; };
  }, []);

  function elegirCsv(files: FileList | null) {
    if (!files?.length) return;
    subir(Array.from(files));
  }

  async function leerFoto(f: File) {
    setFoto({ estado: 'leyendo' });
    try {
      const fd = new FormData(); fd.append('foto', f);
      const r = await fetch('/api/foto', { method: 'POST', body: fd });
      if (r.status === 404) { setFoto({ estado: 'error', motivo: 'La lectura de fotos no está disponible en este servidor.' }); return; }
      const d: { ok?: boolean; motivo?: string; comprobante?: Comprobante } | null = await r.json().catch(() => null);
      if (!d?.ok || !d.comprobante) { setFoto({ estado: 'error', motivo: d?.motivo ?? 'No pude leer la foto.' }); return; }
      setFoto({ estado: 'ok', c: d.comprobante, nombre: f.name });
    } catch { setFoto({ estado: 'error', motivo: 'Se cortó la conexión al subir la foto.' }); }
  }

  async function copiar(h: string) {
    try { await navigator.clipboard.writeText(h); setCopiado(h); setTimeout(() => setCopiado(null), 1800); } catch { setCopiado(null); }
  }

  const usandoMP = fuente?.tipo === 'mp';
  return (
    <div className={s.pagina}>
      <div className={s.cabPagina}>
        <h1>Datos y avisos</h1>
        <p>Elegí de dónde sale tu caja. Cada archivo queda identificado con su huella (SHA-256), la misma que va en la carpeta sellada.</p>
      </div>

      <section className={s.card} aria-labelledby="t-actual">
        <div className={s.cardHead}>
          <div>
            <span className={s.eyebrow} id="t-actual">Fuente actual</span>
            <h2 className={s.h2} style={{ marginTop: 2 }}>{nombreFuente(fuente)}</h2>
            {vista && <p className={s.sub}>{vista.pyme}{vista.ficticia ? ' · datos ficticios' : ''} · corte al {fNum(vista.pronostico.hoy)}</p>}
          </div>
          {ocupado && <span className={`${s.chip} ${s.chipAcc}`} role="status">Analizando…</span>}
        </div>
        {vista && (
          <div className={s.kpis}>
            <div className={s.kpi}><span>Movimientos</span><b className={s.num}>{vista.resumen.movimientos}</b><small>{usandoMP ? 'de Mercado Pago' : 'del banco'}</small></div>
            <div className={s.kpi}><span>Facturas ARCA</span><b className={s.num}>{vista.resumen.recibidos + vista.resumen.emitidos}</b><small>{vista.resumen.recibidos} recibidas · {vista.resumen.emitidos} emitidas</small></div>
            <div className={s.kpi}><span>Boletas</span><b className={s.num}>{vista.resumen.boletas}</b><small>con vencimiento</small></div>
            <div className={s.kpi}><span>Nómina</span><b className={s.num}>{vista.resumen.empleados}</b><small>empleados</small></div>
          </div>
        )}
        {error && estado === 'error' && <div className={s.errorBox} role="alert">No pude leer los datos.<p>{error}</p></div>}
      </section>

      <div className={s.fuentes}>
        <section className={`${s.fuente} ${fuente?.tipo === 'demo' ? s.fuenteAct : ''}`} aria-labelledby="t-demo">
          <strong id="t-demo">Pyme demo</strong>
          <p>La Esquina de Nueva Córdoba, un local gastronómico ficticio: extracto bancario y comprobantes de ARCA de seis meses.</p>
          <div className={s.btnRow}>
            <button type="button" className={`${s.btn} ${s.btnPri}`} disabled={ocupado} onClick={() => cargarDemo(false)}>Usar la pyme demo</button>
            <button type="button" className={s.btn} disabled={ocupado} onClick={() => cargarDemo(true)}>Sumar boletas y nómina</button>
            <button type="button" className={s.btn} disabled={ocupado} onClick={() => cargarDemo(false, 'holgada')}>Ver caso con caja holgada</button>
          </div>
        </section>

        <section className={`${s.fuente} ${usandoMP ? s.fuenteAct : ''}`} aria-labelledby="t-mp">
          <strong id="t-mp">Mercado Pago</strong>
          <p>Lee los cobros y pagos de tu cuenta de los últimos 90 días, sin que tengas que exportar nada.</p>
          <p role="status">
            {mp.tipo === 'cargando' && <span className={s.chip}>Consultando estado…</span>}
            {mp.tipo === 'sin-ruta' && <span className={`${s.chip} ${s.chipWarn}`}>Conexión real todavía no disponible</span>}
            {mp.tipo === 'pendiente' && <><span className={`${s.chip} ${s.chipWarn}`}>Pendiente de credenciales</span> <span className={s.sub}>El servidor todavía no tiene configurada la app de Mercado Pago.</span></>}
            {mp.tipo === 'ok' && <span className={`${s.chip} ${mp.conectado ? s.chipOk : ''}`}>{mp.conectado ? 'Cuenta conectada' : 'Sin conectar'}</span>}
            {mp.tipo === 'error' && <><span className={`${s.chip} ${s.chipNeg}`}>No pude consultar el estado</span> <span className={s.sub}>{mp.detalle}</span></>}
          </p>
          <div className={s.btnRow}>
            {mp.tipo === 'ok' && !mp.conectado && <a className={`${s.btn} ${s.btnPri}`} href="/api/mp/auth">Conectar mi cuenta</a>}
            <button type="button" className={mp.tipo === 'ok' && mp.conectado ? `${s.btn} ${s.btnPri}` : s.btn} disabled={ocupado} onClick={cargarMP}>{mp.tipo === 'ok' && mp.conectado ? 'Analizar mi cuenta' : 'Probar con una cuenta simulada'}</button>
          </div>
          {vista?.resumen.mercadopago && usandoMP && <p className={s.sub}>Origen de los pagos: {vista.resumen.mercadopago === 'api' ? 'API de Mercado Pago' : vista.resumen.mercadopago === 'mixto' ? 'API + simulación' : 'simulación (Carpintería Los Aromos, ficticia)'}.</p>}
        </section>

        <section className={`${s.fuente} ${fuente?.tipo === 'archivos' ? s.fuenteAct : ''}`} aria-labelledby="t-csv">
          <strong id="t-csv">Tus archivos CSV</strong>
          <p>Extracto del home banking y “Mis Comprobantes” de ARCA (recibidos y emitidos). Opcional: boletas con vencimiento y nómina.</p>
          <div className={s.drop} data-sobre={sobre}
            onDragOver={e => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)}
            onDrop={e => { e.preventDefault(); setSobre(false); elegirCsv(e.dataTransfer.files); }}>
            <span>Arrastrá los archivos acá o</span>
            <button type="button" className={`${s.btn} ${s.btnPri}`} disabled={ocupado} onClick={() => csv.current?.click()}>Elegir archivos</button>
            <input ref={csv} id="csv" type="file" multiple accept=".csv,text/csv" hidden onChange={e => { elegirCsv(e.target.files); e.target.value = ''; }} />
          </div>
          <p className={s.sub}>Ejemplos: <a href="/demo/extracto_banco_esquina.csv" download>extracto</a> · <a href="/demo/mis_comprobantes_recibidos.csv" download>recibidos</a> · <a href="/demo/mis_comprobantes_emitidos.csv" download>emitidos</a> · <a href="/demo/boletas_vencimientos.csv" download>boletas</a> · <a href="/demo/nomina_octubre.csv" download>nómina</a></p>
        </section>

        <section className={s.fuente} aria-labelledby="t-foto">
          <strong id="t-foto">Foto de un comprobante</strong>
          <p>Sacale una foto a una factura o boleta y leemos emisor, fecha, vencimiento y total. Después podés sumarla a la proyección como factura de proveedor (solo con la pyme demo por ahora).</p>
          <div className={s.btnRow}>
            <button type="button" className={s.btn} disabled={foto?.estado === 'leyendo'} onClick={() => img.current?.click()}>{foto?.estado === 'leyendo' ? 'Leyendo la foto…' : 'Subir foto'}</button>
            <input ref={img} id="foto" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) leerFoto(f); }} />
          </div>
          <div role="status" aria-live="polite">
            {foto?.estado === 'error' && <div className={s.avisoBox}>{foto.motivo}</div>}
            {foto?.estado === 'ok' && (
              <dl className={s.desglose}>
                <div><dt>Emisor</dt><dd>{foto.c.razon_social_emisor ?? 's/d'}</dd></div>
                <div><dt>CUIT</dt><dd className={s.num}>{foto.c.cuit_emisor ?? 's/d'}</dd></div>
                <div><dt>Comprobante</dt><dd>{[foto.c.tipo, foto.c.numero].filter(Boolean).join(' ') || 's/d'}</dd></div>
                <div><dt>Vence</dt><dd className={s.num}>{foto.c.fecha_vencimiento ? fNum(foto.c.fecha_vencimiento) : 's/d'}</dd></div>
                <div><dt>Total</dt><dd className={s.num}>{foto.c.total != null ? pesos(foto.c.total) : 's/d'}</dd></div>
              </dl>
            )}
            {foto?.estado === 'ok' && (
              <button type="button" className={s.btn} disabled={ocupado || fuente?.tipo !== 'demo'} onClick={() => sumarFoto(foto.c, 'recibido')}>
                {fuente?.tipo === 'demo' ? 'Sumar a la proyección' : 'Disponible con la pyme demo'}
              </button>
            )}
          </div>
        </section>
      </div>

      <div className={`${s.cols} ${s.c21}`}>
        <section className={s.card} aria-labelledby="t-archivos">
          <div><h2 className={s.h2} id="t-archivos">Archivos leídos</h2><p className={s.sub}>La huella cambia si se modifica un solo carácter del archivo.</p></div>
          {vista?.insumos.length ? (
            <ul className={s.lista}>
              {vista.insumos.map(a => (
                <li key={a.nombre + a.sha256} className={s.archivo}>
                  <strong>{a.nombre}</strong>
                  <button type="button" className={s.link} onClick={() => copiar(a.sha256)} aria-label={`Copiar huella de ${a.nombre}`}>{copiado === a.sha256 ? 'Copiada' : 'Copiar'}</button>
                  <code className={s.mono}>sha256 {a.sha256}</code>
                </li>
              ))}
            </ul>
          ) : <p className={s.sub}>{usandoMP ? 'Los pagos de Mercado Pago no son un archivo; solo se listan los CSV que acompañan.' : 'Todavía no se leyó ningún archivo.'}</p>}
          {vista && vista.ignorados.length > 0 && <div className={s.avisoBox}>No reconocí el formato de: {vista.ignorados.join(', ')}. Revisá que tengan encabezados de fecha, montos y CUIT.</div>}
        </section>

        <section className={s.card} id="avisos" aria-labelledby="t-avisos">
          <div><h2 className={s.h2} id="t-avisos">Avisos de vencimientos</h2>
            <p className={s.sub}>Notificación en este dispositivo o por WhatsApp/SMS: 3 días antes, el día anterior y el día del vencimiento, y si el pronóstico marca que te quedás sin caja.</p></div>
          {vista?.alertas ? (
            <>
              <div className={s.kpis} style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
                <div className={s.kpi}><span>Vencidas</span><b className={`${s.num} ${vista.alertas.resumen.vencidas ? s.neg : ''}`}>{vista.alertas.resumen.vencidas}</b></div>
                <div className={s.kpi}><span>Vence en 7 días</span><b className={s.num}>{millones(vista.alertas.resumen.vence7)}</b></div>
                <div className={s.kpi}><span>En 30 días</span><b className={s.num}>{millones(vista.alertas.resumen.vence30)}</b></div>
              </div>
              <div className={`${s.btnRow} ${s.avisosAqui} ${s.avisosIzq}`} style={{ alignItems: 'center' }}>
                <Avisos alertas={vista.alertas} />
                <span className={s.sub}>Tocá la campana para elegir canales.</span>
              </div>
            </>
          ) : <p className={s.sub}>Los avisos necesitan el análisis completo; no están disponibles para esta carga.</p>}
          <p className={s.sub}>¿Querés ver cómo se verá por WhatsApp? <Link href="/demo">Abrí la demo del canal</Link>.</p>
        </section>
      </div>
    </div>
  );
}
