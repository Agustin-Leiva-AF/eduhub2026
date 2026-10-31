'use client';
// Avisos de vencimientos: salen como notificación del navegador/teléfono o por WhatsApp (Twilio), no en el chat.
// Este botón de la cabecera solo configura los canales; el envío lo hace el servidor (/api/avisos/despachar).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Analisis } from './tipos';

type Estado = { push: boolean; twilio: boolean; clavePublica: string | null };
const CLAVE_ID = 'cfo-avisos-id';
const CLAVE_TEL = 'cfo-avisos-tel';

const leer = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin storage */ } };
const idLocal = () => {
  let id = leer(CLAVE_ID);
  if (!id) { id = crypto.randomUUID(); guardar(CLAVE_ID, id); }
  return id;
};
const aBytes = (b64: string) => {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
};

export default function Avisos({ alertas }: { alertas: Analisis['alertas'] }) {
  const [abierto, setAbierto] = useState(false);
  const [srv, setSrv] = useState<Estado | null>(null);
  const [pushOn, setPushOn] = useState(false);
  const [telOn, setTelOn] = useState(false);
  const [tel, setTel] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);

  const soportaPush = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const criticas = alertas.resumen.criticas;

  useEffect(() => {
    fetch('/api/avisos').then(r => r.json()).then(setSrv).catch(() => setSrv(null));
    const t = leer(CLAVE_TEL);
    if (t) { setTel(t); setTelOn(true); }
    if (soportaPush) navigator.serviceWorker.getRegistration('/sw.js').then(r => r?.pushManager.getSubscription()).then(s => setPushOn(Boolean(s)));
  }, [soportaPush]);

  // Cierra el panel al tocar afuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);

  const enviar = useCallback(async (extra: { push?: PushSubscriptionJSON; telefono?: string; probar?: boolean }) => {
    const res = await fetch('/api/avisos', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: idLocal(), alertas: { alertas, resumen: alertas.resumen }, ...extra }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error ?? 'No pude guardar los avisos.');
    return d as { enviados: number; limitado?: string };
  }, [alertas]);

  // Si ya hay un canal activo, cada análisis nuevo actualiza los vencimientos guardados (sin mandar mensajes).
  useEffect(() => {
    if (!srv || !(pushOn || telOn)) return;
    enviar({ telefono: telOn ? leer(CLAVE_TEL) ?? undefined : undefined }).catch(() => {});
  }, [alertas, srv, pushOn, telOn, enviar]);

  async function activarPush() {
    setOcupado(true); setMsg('');
    try {
      if (!srv?.push || !srv.clavePublica) throw new Error('El servidor todavía no tiene configuradas las notificaciones (faltan las claves VAPID).');
      if (Notification.permission === 'denied') throw new Error('Bloqueaste las notificaciones de este sitio. Habilitalas desde el candado de la barra de direcciones.');
      const reg = await navigator.serviceWorker.register('/sw.js');
      if (await Notification.requestPermission() !== 'granted') throw new Error('Sin permiso del navegador no puedo avisarte.');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(srv.clavePublica) });
      const r = await enviar({ push: sub.toJSON(), probar: true });
      setPushOn(true);
      setMsg(r.limitado ?? 'Listo: te llegará una notificación de prueba.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'No pude activar las notificaciones.'); }
    finally { setOcupado(false); }
  }

  async function desactivarPush() {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      await (await reg?.pushManager.getSubscription())?.unsubscribe();
      await fetch('/api/avisos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: idLocal(), canal: 'push' }) });
      setPushOn(false); setMsg('Notificaciones de este dispositivo desactivadas.');
    } finally { setOcupado(false); }
  }

  async function activarTel() {
    setOcupado(true); setMsg('');
    try {
      const limpio = tel.replace(/[\s()-]/g, '');
      const r = await enviar({ telefono: limpio, probar: true });
      guardar(CLAVE_TEL, limpio); setTelOn(true);
      setMsg(r.limitado ?? 'Listo: te mandamos un mensaje de prueba.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'No pude activar el aviso.'); }
    finally { setOcupado(false); }
  }

  async function desactivarTel() {
    setOcupado(true);
    try {
      await fetch('/api/avisos', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: idLocal(), canal: 'telefono' }) });
      guardar(CLAVE_TEL, null); setTelOn(false); setTel(''); setMsg('Aviso por WhatsApp desactivado.');
    } finally { setOcupado(false); }
  }

  const activos = Number(pushOn) + Number(telOn);
  return (
    <span className="avisos" ref={raiz}>
      <button type="button" className="avisos-btn" aria-expanded={abierto} aria-haspopup="dialog"
        aria-label={`Avisos de vencimientos${activos ? ' (activados)' : ''}${criticas ? `, ${criticas} críticas` : ''}`}
        onClick={() => setAbierto(a => !a)}>
        <span aria-hidden>{activos ? '🔔' : '🔕'}</span>
        {criticas > 0 && <b className="avisos-n">{criticas}</b>}
      </button>
      {abierto && (
        <div className="avisos-panel" role="dialog" aria-label="Avisos de vencimientos">
          <strong>Avisos de vencimientos</strong>
          <p>Te avisamos 3 días, 1 día y el día del vencimiento, y si el pronóstico marca que te quedás sin caja. Sin abrir el chat.</p>

          <div className="avisos-fila">
            <div><b>Este dispositivo</b><small>Notificación del navegador o de la app instalada en el teléfono</small></div>
            {pushOn
              ? <button type="button" className="btn secundario" disabled={ocupado} onClick={desactivarPush}>Desactivar</button>
              : <button type="button" className="btn lleno" disabled={ocupado || !soportaPush} onClick={activarPush}>Activar</button>}
          </div>
          {!soportaPush && <small className="avisos-nota">Este navegador no soporta notificaciones. En iPhone, instalá la app (Compartir → Agregar a inicio) y abrila desde ahí.</small>}

          <div className="avisos-fila vertical">
            <div><b>WhatsApp / SMS</b><small>Con código de país, por ejemplo +5493511234567</small></div>
            <div className="avisos-tel">
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder="+54 9 351 123 4567" value={tel} disabled={telOn || ocupado} onChange={e => setTel(e.target.value)} aria-label="Teléfono" />
              {telOn
                ? <button type="button" className="btn secundario" disabled={ocupado} onClick={desactivarTel}>Quitar</button>
                : <button type="button" className="btn lleno" disabled={ocupado || tel.trim().length < 8} onClick={activarTel}>Activar</button>}
            </div>
          </div>

          {activos > 0 && <button type="button" className="btn secundario" disabled={ocupado} onClick={async () => {
            setOcupado(true);
            try { const r = await enviar({ telefono: telOn ? leer(CLAVE_TEL) ?? undefined : undefined, probar: true }); setMsg(r.limitado ?? 'Prueba enviada.'); }
            catch (e) { setMsg(e instanceof Error ? e.message : 'No pude enviar la prueba.'); }
            finally { setOcupado(false); }
          }}>Enviar prueba</button>}
          <small className="avisos-msg" role="status" aria-live="polite">{msg}</small>
        </div>
      )}
    </span>
  );
}
