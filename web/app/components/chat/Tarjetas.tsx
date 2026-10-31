'use client';
// Tarjetas ricas que viven dentro de las burbujas del bot.
import { useState } from 'react';
import Grafico from '../../Grafico';
import { $, M, fechaCorta, fechaLarga, type Analisis, type Comprobante, type Constancia, type Opcion } from './tipos';

export function TarjetaGrafico({ a }: { a: Analisis }) {
  const p = a.pronostico;
  const [dias, setDias] = useState(120);
  const h = p.horizontes.find(x => x.dias === dias);
  return (
    <div className="tarjeta-chat">
      <div className="kpis">
        <div className="kpi">
          <span>Saldo hoy</span>
          <strong>{M(p.saldoInicial)}</strong>
        </div>
        <div className={`kpi ${h && h.minimo < 0 ? 'neg' : 'pos'}`}>
          <span>Mínimo a {dias} días</span>
          <strong>{h ? M(h.minimo) : '—'}</strong>
          {h && <small>el {fechaCorta(h.fechaMinimo)}</small>}
        </div>
      </div>

      <div className="horizontes" role="group" aria-label="Horizonte de proyección">
        {p.horizontes.map(x => (
          <button key={x.dias} type="button"
            className={`horizonte ${x.minimo < 0 ? 'neg' : ''} ${x.dias === dias ? 'activo' : ''}`}
            aria-pressed={x.dias === dias} onClick={() => setDias(x.dias)}>
            <span>{x.dias} días</span>
            <b>{M(x.minimo)}</b>
            <small>mínimo</small>
          </button>
        ))}
      </div>

      <Grafico serie={p.serie} dias={dias} />
      <div className="fuentes">
        Ajustado por inflación de {a.citas.ipc.valor} mensual (INDEC, {a.citas.ipc.periodo}, vía OpenARG).
      </div>
    </div>
  );
}

export function TarjetaRecomendacion({ a, usados, onBoton }: {
  a: Analisis; usados: Set<string>; onBoton: (id: string, label: string) => void;
}) {
  const r = a.recomendacion;
  const fuentes = ['adelantos', 'documentos', 'irregularidad'].map(k => a.citas[k]).filter(Boolean);
  return (
    <div className="tarjeta-chat">
      {r.alerta && a.pronostico.hueco && (
        <div className="alerta" role="note">{r.alerta}</div>
      )}
      <p className="texto-largo">{a.mensaje.fuente === 'ia' ? a.mensaje.texto : r.contexto.join('\n\n')}</p>

      {r.opciones.map(o => (
        <div className="opcion" key={o.id}>
          <div className="opcion-cab">
            <h4>{o.titulo}</h4>
            <div className="costo">
              <small>costo estimado</small>
              <strong>{o.costo ? $(o.costo) : '$0'}</strong>
            </div>
          </div>
          <p>{o.detalle}</p>
          <div className="opcion-pie">
            <span className={`chip ${o.cubre ? 'ok' : 'no'}`}>{o.cubre ? '✓ cubre el hueco' : '◐ cubre una parte'}</span>
            <button type="button" className="btn lleno" disabled={usados.has(o.id)}
              onClick={() => onBoton(o.id, `Elijo: ${o.titulo}`)}>Elegir</button>
          </div>
        </div>
      ))}

      <div className="fuentes">
        Fuentes (OpenARG):{' '}
        {fuentes.map((c, i) => (
          <span key={i}>{i ? ' · ' : ''}<a href={c.url} target="_blank" rel="noreferrer">{c.dato} {c.valor} ({c.periodo})</a></span>
        ))}
        {a.mensaje.fuente === 'ia' && ' · Texto redactado con IA sobre cifras calculadas.'}
      </div>
      <p className="aviso">{r.aviso}</p>
    </div>
  );
}

export function TarjetaConsentimiento({ opcion, usados, onConsentir }: {
  opcion: Opcion; usados: Set<string>; onConsentir: (o: Opcion) => void;
}) {
  const [ok, setOk] = useState(false);
  const usado = usados.has('consent');
  return (
    <div className="tarjeta-chat">
      <p className="texto-largo">
        Para que el <strong>Banco de la demo</strong> te contacte con una propuesta, armo tu <strong>carpeta de caja</strong>:
        proyección a 120 días + huella digital (hash) de tus archivos. No comparto nombres de tus proveedores ni clientes.
      </p>
      <label className="consent">
        <input type="checkbox" checked={ok} disabled={usado} onChange={e => setOk(e.target.checked)} />
        <span>Autorizo compartir mi carpeta con el Banco de la demo (Ley 25.326). Puedo revocarlo cuando quiera.</span>
      </label>
      <div className="acciones">
        <button type="button" className="btn lleno" disabled={!ok || usado} onClick={() => onConsentir(opcion)}>
          Compartir y sellar
        </button>
      </div>
    </div>
  );
}

export function TarjetaConstancia({ c }: { c: Constancia }) {
  const [estado, setEstado] = useState<'inicial' | 'copiado' | 'error'>('inicial');
  const corto = `${c.hash.slice(0, 10)}…${c.hash.slice(-6)}`;
  const testnet = c.modo === 'testnet';

  async function copiar() {
    try {
      await navigator.clipboard.writeText(c.hash);
      setEstado('copiado');
    } catch {
      setEstado('error');
    }
    setTimeout(() => setEstado('inicial'), 2200);
  }

  return (
    <div className="tarjeta-chat">
      <div className="sello-ok">
        <span className="sello-circ" aria-hidden>✓</span>
        <div>
          <strong>Carpeta sellada</strong>
          <small>El banco puede verificar que nadie la modificó.</small>
        </div>
      </div>
      <div className="hash-caja">
        <code title={c.hash}>{corto}</code>
        <button type="button" className="btn chico" onClick={copiar} aria-label="Copiar el hash completo">
          {estado === 'copiado' ? 'Copiado ✓' : estado === 'error' ? 'No se pudo copiar' : 'Copiar'}
        </button>
      </div>
      <p className="mono hash-completo">{c.hash}</p>
      <div className="acciones">
        <span className={`chip ${testnet ? 'ok' : ''}`}>
          {testnet ? 'Registrada en Base Sepolia (testnet)' : 'Registro simulado (sin testnet configurada)'}
        </span>
      </div>
      <div className="acciones">
        <a className="btn lleno" href={`/entidad/${c.hash}`} target="_blank" rel="noreferrer">Ver como banco 🏦</a>
        {c.url && <a className="btn" href={c.url} target="_blank" rel="noreferrer">Ver en el explorador</a>}
      </div>
    </div>
  );
}

// Resultado de leer una foto de comprobante (la burbuja aporta el marco y la hora).
export function ResultadoFoto({ c }: { c: Comprobante }) {
  if (!c.es_comprobante) {
    return <p className="texto-largo">No reconocí un comprobante en esa foto. Probá de frente, con buena luz y que se vea entero.</p>;
  }
  const tipo = c.tipo || 'comprobante';
  const emisor = c.razon_social_emisor || (c.cuit_emisor ? `CUIT ${c.cuit_emisor}` : 'un emisor sin identificar');
  const total = c.total != null ? ` por ${$(c.total)}` : '';
  const vence = c.fecha_vencimiento ? `, vence el ${fechaCorta(c.fecha_vencimiento)}` : '';
  const filas: [string, string | null | undefined][] = [
    ['Número', c.numero],
    ['Emisión', c.fecha_emision && fechaLarga(c.fecha_emision)],
    ['Vencimiento', c.fecha_vencimiento && fechaLarga(c.fecha_vencimiento)],
    ['CUIT emisor', c.cuit_emisor],
  ];
  return (
    <>
      <p className="texto-largo">{`Leí una ${tipo} de ${emisor}${total}${vence}.`}</p>
      <dl className="dl">
        {filas.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} style={{ display: 'contents' }}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </>
  );
}
