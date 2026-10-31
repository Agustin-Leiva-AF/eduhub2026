'use client';
// Simulador de chat estilo WhatsApp: el flujo estrella de punta a punta.
import { useEffect, useRef, useState } from 'react';
import Burbuja from './components/chat/Burbuja';
import Cabecera, { Escribiendo } from './components/chat/Cabecera';
import Pie from './components/chat/Pie';
import PanelPasos from './components/chat/PanelPasos';
import { PYME, type Analisis, type Constancia, type Fase, type Msg, type Opcion, type Comprobante } from './components/chat/tipos';

const sinMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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
  const foto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: sinMovimiento() ? 'auto' : 'smooth', block: 'end' });
  }, [msgs, escribiendo]);

  const push = (...m: Msg[]) => setMsgs(prev => [...prev, ...m.map(x => ({ ...x, hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) }))]);
  const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));
  const marcarUsado = (id: string) => setUsados(prev => new Set(prev).add(id));

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

  // Foto de comprobante: POST /api/foto (campo "foto"). 404 = endpoint todavía no disponible.
  async function leerFoto(file: File) {
    push({ de: 'yo', tipo: 'texto', texto: `📷 ${file.name}` });
    setEscribiendo(true);
    try {
      const f = new FormData();
      f.append('foto', file);
      const res = await fetch('/api/foto', { method: 'POST', body: f });
      if (res.status === 404) {
        push({ de: 'bot', tipo: 'texto', texto: 'La lectura de fotos todavía no está disponible. Por ahora subí el CSV de "Mis Comprobantes" de ARCA.' });
        return;
      }
      const d: { ok: boolean; motivo?: string; comprobante?: Comprobante } | null = await res.json().catch(() => null);
      if (!d?.ok || !d.comprobante) {
        push({ de: 'bot', tipo: 'texto', texto: `No pude leer la foto${d?.motivo ? `: ${d.motivo}` : '.'} Probá con una foto más de cerca y con buena luz.` });
        return;
      }
      push({ de: 'bot', tipo: 'foto', c: d.comprobante });
    } catch {
      push({ de: 'bot', tipo: 'texto', texto: 'Se cortó la conexión al subir la foto. Probá de nuevo en un ratito.' });
    } finally { setEscribiendo(false); }
  }

  async function boton(id: string, label: string) {
    if (usados.has(id)) return;
    marcarUsado(id);
    if (id === 'demo') return analizar();
    if (id === 'subir') {
      // El botón se reactiva: el usuario puede volver a elegir archivos.
      setUsados(prev => { const s = new Set(prev); s.delete('subir'); return s; });
      return archivo.current?.click();
    }
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
    marcarUsado('consent');
    push({ de: 'yo', tipo: 'texto', texto: '✅ Sí, autorizo compartir mi carpeta con el Banco de la demo.' });
    setEscribiendo(true);
    try {
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
      const c: Constancia & { error?: string } = await res.json();
      if (!res.ok) { push({ de: 'bot', tipo: 'texto', texto: `No pude sellar la carpeta: ${c.error}` }); return; }
      push({ de: 'bot', tipo: 'constancia', c });
    } catch {
      push({ de: 'bot', tipo: 'texto', texto: 'Se cortó la conexión al sellar la carpeta. Probá de nuevo en un ratito.' });
    } finally { setEscribiendo(false); }
  }

  const constancia = [...msgs].reverse().find((m): m is Extract<Msg, { tipo: 'constancia' }> => m.tipo === 'constancia');
  const fase: Fase = constancia ? 'sellada' : analisis ? 'listo' : escribiendo ? 'leyendo' : 'esperando';
  const estadoCabecera = escribiendo ? 'escribiendo…' : constancia ? 'carpeta sellada' : 'en línea';

  return (
    <main className="escenario">
      <PanelPasos fase={fase} analisis={analisis} hash={constancia?.c.hash ?? null} />
      <div className="telefono">
        <div className="pantalla">
          <Cabecera estado={estadoCabecera} />
          <div className="chat" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación con CFO de Bolsillo">
            {msgs.map((m, i) => <Burbuja key={i} m={m} usados={usados} onBoton={boton} onConsentir={consentir} />)}
            {escribiendo && <Escribiendo />}
            <div ref={fin} />
          </div>
          <Pie archivoRef={archivo} fotoRef={foto} ocupado={escribiendo}
            onArchivos={subir} onFoto={leerFoto} />
        </div>
      </div>
    </main>
  );
}
