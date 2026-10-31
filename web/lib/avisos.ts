// Avisos fuera del chat: notificación del navegador / del teléfono (Web Push, instalable como app) y
// WhatsApp o SMS por Twilio. Guarda las alertas del último análisis y avisa cuando se acerca cada vencimiento.
// Sin cuentas: cada navegador se identifica con un id propio. Todo el envío es opcional y por variables de entorno.
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import type { Alerta, Alertas } from './alertas';

export type AvisoGuardado = Pick<Alerta, 'id' | 'tipo' | 'nivel' | 'concepto' | 'fecha' | 'monto'>;
export type Suscriptor = {
  id: string; push?: webpush.PushSubscription; telefono?: string;
  avisos: AvisoGuardado[]; enviados: string[]; ultimaPrueba?: string; actualizado: string;
};
export type Mensaje = { clave: string; texto: string; critico: boolean };
export type Canales = { push: boolean; telefono: boolean };

const ARCHIVO = path.join(process.cwd(), 'data', 'avisos.json');
const MAX_SUSCRIPTORES = 500;
const COOLDOWN_PRUEBA_MS = 5 * 60_000;
const HITOS = [3, 1, 0]; // días antes del vencimiento en que se avisa
const HITOS_HUECO = [14, 7, 3, 1, 0];

const DIA = 86400000;
const difDias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DIA);
const hoyISO = () => process.env.AVISOS_HOY || new Date().toISOString().slice(0, 10);
const dm = (s: string) => `${+s.slice(8, 10)}/${+s.slice(5, 7)}`;
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;
const cuando = (d: number) => (d <= 0 ? 'Hoy' : d === 1 ? 'Mañana' : `En ${d} días`);

// ---------- Almacén (archivo JSON; en un deploy sin disco persistente conviene cambiarlo por una base) ----------
function leer(): Suscriptor[] {
  try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { return []; }
}
function escribir(xs: Suscriptor[]) {
  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  fs.writeFileSync(ARCHIVO, JSON.stringify(xs, null, 1));
}

export const telefonoValido = (t: string) => /^\+\d{8,15}$/.test(t);
export const idValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9-]{16,64}$/.test(id);

// ---------- Qué hay que avisar hoy ----------
// Un aviso por hito: no se repite aunque se corra el despacho varias veces al día.
export function mensajesPendientes(s: Pick<Suscriptor, 'avisos' | 'enviados'>, hoy = hoyISO()): Mensaje[] {
  const out: Mensaje[] = [];
  for (const a of s.avisos) {
    if (a.tipo === 'vencida') {
      const clave = `${a.id}|vencida`;
      if (!s.enviados.includes(clave)) out.push({ clave, critico: true, texto: `${a.concepto}${a.monto ? ` por ${pesos(a.monto)}` : ''}: pagalas cuanto antes para evitar intereses.` });
      continue;
    }
    if (!a.fecha) continue;
    const dias = difDias(hoy, a.fecha);
    if (!(a.tipo === 'hueco' ? HITOS_HUECO : HITOS).includes(dias)) continue;
    const clave = `${a.id}|${dias}`;
    if (s.enviados.includes(clave)) continue;
    const texto = a.tipo === 'hueco'
      ? `${cuando(dias)} (${dm(a.fecha)}) te quedás sin caja: faltarían hasta ${pesos(a.monto ?? 0)}. Hay tiempo de conseguir financiamiento barato.`
      : `${cuando(dias)} (${dm(a.fecha)}) vence ${a.concepto}${a.monto ? `: ${pesos(a.monto)}` : ''}.`;
    out.push({ clave, texto, critico: a.nivel === 'critica' || (a.tipo !== 'hueco' && dias === 0) });
  }
  return out.sort((x, y) => Number(y.critico) - Number(x.critico));
}

export const resumenActivacion = (al: Alertas) => {
  const r = al.resumen;
  return `Avisos activados. Próximos 7 días vencen ${pesos(r.vence7)}${r.vencidas ? `; tenés ${r.vencidas} boleta${r.vencidas > 1 ? 's' : ''} vencida${r.vencidas > 1 ? 's' : ''}` : ''}. Te escribo antes de cada vencimiento.`;
};

// ---------- Canales ----------
export function canalesDisponibles() {
  return {
    push: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
    twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
    clavePublica: process.env.VAPID_PUBLIC_KEY ?? null,
  };
}

async function enviarPush(sub: webpush.PushSubscription, titulo: string, cuerpo: string, critico: boolean): Promise<'ok' | 'expirada' | 'error'> {
  if (!canalesDisponibles().push) return 'error';
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:avisos@example.com', process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  try {
    await webpush.sendNotification(sub, JSON.stringify({ titulo, cuerpo, critico, url: '/' }), { TTL: 6 * 3600 });
    return 'ok';
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? 'expirada' : 'error';
  }
}

async function enviarTwilio(telefono: string, cuerpo: string): Promise<boolean> {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env;
  if (!sid || !token || !from) return false;
  const wa = from.startsWith('whatsapp:');
  const body = new URLSearchParams({ To: wa ? `whatsapp:${telefono}` : telefono, From: from, Body: cuerpo });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST', body,
      headers: { authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}` },
    });
    if (!res.ok) console.error('[avisos] Twilio', res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) { console.error('[avisos] Twilio', e); return false; }
}

// Envía un texto por todos los canales del suscriptor. Devuelve qué canales llegaron.
async function notificar(s: Suscriptor, titulo: string, cuerpo: string, critico: boolean) {
  const out = { push: false, telefono: false, expirada: false };
  if (s.push) {
    const r = await enviarPush(s.push, titulo, cuerpo, critico);
    out.push = r === 'ok'; out.expirada = r === 'expirada';
  }
  if (s.telefono) out.telefono = await enviarTwilio(s.telefono, `${titulo}\n${cuerpo}`);
  return out;
}

// ---------- Operaciones ----------
export type Registro = { id: string; push?: webpush.PushSubscription; telefono?: string; alertas: Alertas; probar?: boolean };

export async function registrar(r: Registro): Promise<{ canales: Canales; enviados: number; limitado?: string }> {
  const todos = leer();
  let s = todos.find(x => x.id === r.id);
  if (!s) {
    if (todos.length >= MAX_SUSCRIPTORES) throw new Error('Se alcanzó el máximo de suscriptores de la demo.');
    s = { id: r.id, avisos: [], enviados: [], actualizado: '' };
    todos.push(s);
  }
  const eraNuevo = !s.push && !s.telefono;
  if (r.push) s.push = r.push;
  if (r.telefono !== undefined) s.telefono = r.telefono || undefined;
  s.avisos = r.alertas.alertas.map(({ id, tipo, nivel, concepto, fecha, monto }) => ({ id, tipo, nivel, concepto, fecha, monto }));
  s.actualizado = new Date().toISOString();

  let limitado: string | undefined;
  let n = 0;
  // Mensaje de activación: si el usuario lo pidió o es la primera vez que suma un canal (con enfriamiento).
  if ((r.probar || eraNuevo) && (s.push || s.telefono)) {
    if (s.ultimaPrueba && Date.now() - Date.parse(s.ultimaPrueba) < COOLDOWN_PRUEBA_MS) limitado = 'Esperá unos minutos antes de pedir otra prueba.';
    else {
      s.ultimaPrueba = new Date().toISOString();
      const res = await notificar(s, 'CFO de Bolsillo', resumenActivacion(r.alertas), false);
      if (res.expirada) s.push = undefined;
      n += Number(res.push) + Number(res.telefono);
    }
  }
  const canales = { push: Boolean(s.push), telefono: Boolean(s.telefono) };
  escribir(todos);
  return { canales, enviados: n, limitado };
}

export function quitar(id: string, canal: 'push' | 'telefono' | 'todo') {
  const todos = leer().map(s => {
    if (s.id !== id) return s;
    if (canal !== 'telefono') s.push = undefined;
    if (canal !== 'push') s.telefono = undefined;
    return s;
  }).filter(s => s.push || s.telefono);
  escribir(todos);
}

// Recorre a todos los suscriptores y manda lo que corresponde hoy (se llama desde un cron).
export async function despachar(hoy = hoyISO()): Promise<{ suscriptores: number; notificaciones: number }> {
  const todos = leer();
  let notificaciones = 0;
  for (const s of todos) {
    const pend = mensajesPendientes(s, hoy);
    if (!pend.length) continue;
    const titulo = pend.length === 1 ? 'CFO de Bolsillo: vencimiento' : `CFO de Bolsillo: ${pend.length} vencimientos`;
    const res = await notificar(s, titulo, pend.map(m => m.texto).join('\n'), pend.some(m => m.critico));
    if (res.expirada) s.push = undefined;
    if (res.push || res.telefono) { s.enviados.push(...pend.map(m => m.clave)); notificaciones++; }
  }
  escribir(todos.filter(s => s.push || s.telefono));
  return { suscriptores: todos.length, notificaciones };
}
