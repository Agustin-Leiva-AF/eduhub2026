'use client';
// Simulador de chat estilo WhatsApp: el flujo estrella de punta a punta.
import { useEffect, useRef, useState } from 'react';
import Grafico from './Grafico';

type Cita = { dato: string; valor: string; periodo: string; fuente: string; tabla: string; url: string };
type Opcion = { id: string; titulo: string; detalle: string; costo: number; cubre: boolean };
type Analisis = {
  resumen: { movimientos: number; recibidos: number; emitidos: number; ignorados: string[]; insumos: { nombre: string; sha256: string }[] };
  pronostico: {
    hoy: string; saldoInicial: number; serie: { fecha: string; saldo: number }[];
    horizontes: { dias: number; saldoFinal: number; minimo: number; fechaMinimo: string }[];
    hueco: { inicio: string; minimo: number; dias: number } | null; aprendizajes: string[];
  };
  recomendacion: { alerta: string; opciones: Opcion[]; contexto: string[]; aviso: string };
  mensaje: { texto: string; fuente: 'ia' | 'reglas' };
  citas: Record<string, Cita>;
};
type Msg =
  | { de: 'bot' | 'yo'; tipo: 'texto'; texto: string; botones?: { id: string; label: string; lleno?: boolean }[] }
  | { de: 'bot'; tipo: 'grafico'; a: Analisis }
  | { de: 'bot'; tipo: 'recomendacion'; a: Analisis }
  | { de: 'bot'; tipo: 'consentimiento'; opcion: Opcion }
  | { de: 'bot'; tipo: 'constancia'; c: { hash: string; modo: string; url?: string } };

const M = (n: number) => `${n < 0 ? '-' : ''}$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;
const $ = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
const PYME = 'La Esquina de Nueva Córdoba (ficticia)';

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{
    de: 'bot', tipo: 'texto',
    texto: '¡Hola! Soy tu CFO de Bolsillo 👋\nMandame el extracto de tu banco (CSV) y lo que bajás de "Mis Comprobantes" de ARCA. En 30 segundos te digo si te va a faltar plata, cuándo y qué podés hacer.',
    botones: [{ id: 'demo', label: '▶ Probar con la pyme demo', lleno: true }, { id: 'subir', label: '📎 Subir mis archivos' }],
  }]);
  const [escribiendo, setEscribiendo] = useState(false);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [usados, setUsados] = useState<Set<string>>(new Set());
  const fin = useRef<HTMLDivElement>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => { fin.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, escribiendo]);
  const push = (...m: Msg[]) => setMsgs(prev => [...prev, ...m]);
  const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));

  async function analizar(form?: FormData, nombres?: string[]) {
    push({ de: 'yo', tipo: 'texto', texto: nombres ? `📎 ${nombres.join('\n📎 ')}` : '📎 extracto_banco_esquina.csv\n📎 mis_comprobantes_recibidos.csv\n📎 mis_comprobantes_emitidos.csv' });
    setEscribiendo(true);
    try {
      const res = await fetch('/api/analizar', form ? { method: 'POST', body: form } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"demo":true}' });
      const a: Analisis & { error?: string } = await res.json();
      if (!res.ok) { push({ de: 'bot', tipo: 'texto', texto: `No pude leerlo: ${a.error}` }); return; }
      setAnalisis(a);
      const r = a.resumen;
      push({ de: 'bot', tipo: 'texto', texto: `Listo. Leí ${r.movimientos} movimientos del banco y ${r.recibidos + r.emitidos} facturas (${r.recibidos} de proveedores, ${r.emitidos} a clientes).\n\nLo que aprendí de tu negocio:\n• ${a.pronostico.aprendizajes.slice(0, 4).join('\n• ')}` });
      await pausa(700);
      push({ de: 'bot', tipo: 'grafico', a });
      await pausa(900);
      push({ de: 'bot', tipo: 'recomendacion', a });
    } catch {
      push({ de: 'bot', tipo: 'texto', texto: 'Se cortó la conexión. Probá de nuevo en un ratito.' });
    } finally { setEscribiendo(false); }
  }

  function subir(files: FileList | null) {
    if (!files?.length) return;
    const f = new FormData();
    for (const x of Array.from(files)) f.append('archivos', x);
    analizar(f, Array.from(files).map(x => x.name));
  }

  async function boton(id: string, label: string) {
    if (usados.has(id)) return;
    setUsados(new Set(usados).add(id));
    if (id === 'demo') return analizar();
    if (id === 'subir') { setUsados(prev => { const s = new Set(prev); s.delete('subir'); return s; }); return archivo.current?.click(); }
    const op = analisis?.recomendacion.opciones.find(o => o.id === id);
    if (op) {
      push({ de: 'yo', tipo: 'texto', texto: label });
      if (op.id === 'renegociar') {
        push({ de: 'bot', tipo: 'texto', texto: `Te dejo un borrador para mandarle:\n\n"Hola, ¿cómo andan? Para ordenar los pagos de fin de año, ¿podemos pasar las facturas de diciembre a 45 días? Seguimos con el mismo volumen de pedidos. ¡Gracias!"\n\nIgual te conviene tener un acuerdo de descubierto como respaldo. ¿Armamos la carpeta para el banco?`,
          botones: [{ id: 'carpeta', label: '📁 Armar carpeta para el banco', lleno: true }] });
      } else push({ de: 'bot', tipo: 'consentimiento', opcion: op });
      return;
    }
    if (id === 'carpeta') {
      push({ de: 'yo', tipo: 'texto', texto: label });
      const ad = analisis?.recomendacion.opciones.find(o => o.id === 'adelanto');
      if (ad) push({ de: 'bot', tipo: 'consentimiento', opcion: ad });
    }
  }

  async function consentir(op: Opcion) {
    if (!analisis || usados.has('consent')) return;
    setUsados(new Set(usados).add('consent'));
    push({ de: 'yo', tipo: 'texto', texto: '✅ Sí, autorizo compartir mi carpeta con el Banco de la demo.' });
    setEscribiendo(true);
    const p = analisis.pronostico;
    const res = await fetch('/api/constancia', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pyme: PYME, destino: 'banco-demo', opcion: { id: op.id, titulo: op.titulo },
        consentimiento: 'Autorizo a CFO de Bolsillo a compartir mi proyección de caja y la evidencia que la respalda con la entidad indicada, para que me contacte con una propuesta de financiamiento.',
        insumos: analisis.resumen.insumos,
        pronostico: { hoy: p.hoy, saldoInicial: p.saldoInicial, horizontes: p.horizontes, hueco: p.hueco, serie: p.serie.map(d => ({ fecha: d.fecha, saldo: d.saldo })) },
      }),
    });
    const c = await res.json();
    setEscribiendo(false);
    if (!res.ok) { push({ de: 'bot', tipo: 'texto', texto: `No pude sellar la carpeta: ${c.error}` }); return; }
    push({ de: 'bot', tipo: 'constancia', c });
  }

  return (
    <main className="app">
      <header className="cabecera">
        <div className="avatar">$</div>
        <div><strong>CFO de Bolsillo</strong><small>{escribiendo ? 'escribiendo…' : 'en línea'}</small></div>
      </header>
      <div className="chat">
        {msgs.map((m, i) => <Burbuja key={i} m={m} usados={usados} onBoton={boton} onConsentir={consentir} />)}
        {escribiendo && <div className="msg bot escribiendo">analizando tu caja…</div>}
        <div ref={fin} />
      </div>
      <footer className="pie">
        <input ref={archivo} type="file" multiple accept=".csv,text/csv" onChange={e => subir(e.target.files)} />
        <button className="btn" onClick={() => archivo.current?.click()}>📎 Adjuntar CSV</button>
        <a className="btn" href="/demo/extracto_banco_esquina.csv" download>⬇ CSV de ejemplo</a>
      </footer>
    </main>
  );
}

function Burbuja({ m, usados, onBoton, onConsentir }: { m: Msg; usados: Set<string>; onBoton: (id: string, label: string) => void; onConsentir: (o: Opcion) => void }) {
  const [dias, setDias] = useState(120);
  const [ok, setOk] = useState(false);
  if (m.tipo === 'texto') return (
    <div className={`msg ${m.de}`}>
      {m.texto}
      {m.botones && <div className="botones">{m.botones.map(b => <button key={b.id} className={`btn ${b.lleno ? 'lleno' : ''}`} disabled={usados.has(b.id)} onClick={() => onBoton(b.id, b.label)}>{b.label}</button>)}</div>}
      <div className="hora">{ahora()}</div>
    </div>
  );
  if (m.tipo === 'grafico') {
    const p = m.a.pronostico;
    return (
      <div className="msg bot ancho">
        <strong>Tu caja proyectada</strong> <span className="chip">hoy {M(p.saldoInicial)}</span>
        <div className="horizontes">
          {p.horizontes.map(h => (
            <button key={h.dias} className={h.dias === dias ? 'activo' : ''} onClick={() => setDias(h.dias)} aria-pressed={h.dias === dias}>
              {h.dias} días<b className={h.minimo < 0 ? 'neg' : ''}>{M(h.minimo)}</b>mínimo
            </button>
          ))}
        </div>
        <Grafico serie={p.serie} dias={dias} />
        <div className="fuentes">Ajustado por inflación de {m.a.citas.ipc.valor} mensual (INDEC, {m.a.citas.ipc.periodo}, vía OpenARG).</div>
      </div>
    );
  }
  if (m.tipo === 'recomendacion') {
    const r = m.a.recomendacion;
    return (
      <div className="msg bot ancho">
        {r.alerta && m.a.pronostico.hueco && <div className="alerta">{r.alerta}</div>}
        <div style={{ whiteSpace: 'pre-wrap' }}>{m.a.mensaje.fuente === 'ia' ? m.a.mensaje.texto : r.contexto.join('\n\n')}</div>
        {r.opciones.map(o => (
          <div className="opcion" key={o.id}>
            <h4>{o.titulo}</h4>
            <p>{o.detalle}</p>
            <span className={`chip ${o.cubre ? 'ok' : 'no'}`}>{o.cubre ? 'cubre el hueco' : 'cubre una parte'}</span>
            <span className="chip">costo ≈ {o.costo ? $(o.costo) : '$0'}</span>
            <div className="botones"><button className="btn lleno" disabled={usados.has(o.id)} onClick={() => onBoton(o.id, `Elijo: ${o.titulo}`)}>Elegir</button></div>
          </div>
        ))}
        <div className="fuentes">
          Fuentes (OpenARG): {Object.values(m.a.citas).filter(c => ['adelantos', 'documentos', 'irregularidad'].some(k => c === m.a.citas[k])).map((c, i) => (
            <span key={i}>{i ? ' · ' : ''}<a href={c.url} target="_blank" rel="noreferrer">{c.dato} {c.valor} ({c.periodo})</a></span>
          ))}
          {m.a.mensaje.fuente === 'ia' && ' · Texto redactado con IA sobre cifras calculadas.'}
        </div>
        <div className="aviso">{r.aviso}</div>
      </div>
    );
  }
  if (m.tipo === 'consentimiento') return (
    <div className="msg bot ancho">
      Para que el <strong>Banco de la demo</strong> te contacte con una propuesta, armo tu <strong>carpeta de caja</strong>: proyección a 120 días + huella digital (hash) de tus archivos. No comparto nombres de tus proveedores ni clientes.
      <label className="consent"><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> Autorizo compartir mi carpeta con el Banco de la demo (Ley 25.326). Puedo revocarlo cuando quiera.</label>
      <div className="botones"><button className="btn lleno" disabled={!ok || usados.has('consent')} onClick={() => onConsentir(m.opcion)}>Compartir y sellar</button></div>
    </div>
  );
  return (
    <div className="msg bot ancho">
      ✅ <strong>Carpeta sellada.</strong> El banco puede verificar que nadie la modificó.
      <div className="mono" style={{ margin: '6px 0' }}>{m.c.hash}</div>
      <span className={`chip ${m.c.modo === 'testnet' ? 'ok' : ''}`}>{m.c.modo === 'testnet' ? 'registrada en Base Sepolia (testnet)' : 'registro SIMULADO (sin testnet configurada)'}</span>
      <div className="botones">
        <a className="btn lleno" href={`/entidad/${m.c.hash}`} target="_blank" rel="noreferrer">Ver como banco 🏦</a>
        {m.c.url && <a className="btn" href={m.c.url} target="_blank" rel="noreferrer">Ver en el explorador</a>}
      </div>
    </div>
  );
}
