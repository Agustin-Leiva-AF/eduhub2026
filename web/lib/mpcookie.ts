// Cookie cifrada con el access_token de Mercado Pago (OAuth). AES-256-GCM con clave derivada de MP_COOKIE_SECRET.
// Formato: base64url( iv[12] | tag[16] | cifrado( JSON {t: token, e: expira en epoch seg} ) ). Nunca se loguea el token.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const COOKIE_TOKEN = 'mp_token';
export const COOKIE_STATE = 'mp_state';
export const COOKIE_VERIFIER = 'mp_verifier';

const clave = (secreto: string) => createHash('sha256').update(secreto).digest();

export type ViaMP = 'token' | 'oauth';
export type CuentaMP = { id: number; apodo?: string };
export type ContenidoCookie = { token: string; via: ViaMP; cuenta?: CuentaMP };

// `extra`: cómo se conectó (por defecto 'oauth') y la cuenta, para que /api/mp/estado no tenga que llamar a MP.
export function cifrarToken(token: string, secreto: string, ttlSeg: number, ahora = Date.now(), extra?: { via?: ViaMP; cuenta?: CuentaMP }): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(secreto), iv);
  const ct = Buffer.concat([c.update(JSON.stringify({ t: token, e: Math.floor(ahora / 1000) + ttlSeg, v: extra?.via, c: extra?.cuenta }), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}

// null si la cookie está alterada, es de otro secreto, expiró o tiene mal formato.
export const descifrarToken = (valor: string, secreto: string, ahora = Date.now()): string | null => descifrarCookie(valor, secreto, ahora)?.token ?? null;

export function descifrarCookie(valor: string, secreto: string, ahora = Date.now()): ContenidoCookie | null {
  try {
    const b = Buffer.from(valor, 'base64url');
    if (b.length < 29) return null;
    const d = createDecipheriv('aes-256-gcm', clave(secreto), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    const j = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')) as { t?: unknown; e?: unknown; v?: unknown; c?: { id?: unknown; apodo?: unknown } };
    if (typeof j.t !== 'string' || typeof j.e !== 'number' || j.e * 1000 < ahora) return null;
    const cuenta = j.c && typeof j.c.id === 'number' ? { id: j.c.id, ...(typeof j.c.apodo === 'string' && { apodo: j.c.apodo }) } : undefined;
    return { token: j.t, via: j.v === 'token' ? 'token' : 'oauth', cuenta };
  } catch { return null; }
}

export function leerCookie(req: Request, nombre: string): string | undefined {
  for (const par of (req.headers.get('cookie') ?? '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0 && par.slice(0, i).trim() === nombre) return decodeURIComponent(par.slice(i + 1).trim());
  }
  return undefined;
}

// Secreto de la cookie: MP_COOKIE_SECRET. Si falta, FUERA de producción se genera uno efímero por proceso (la cookie
// deja de valer al reiniciar el servidor; se guarda en globalThis para sobrevivir a la recarga de módulos de `next dev`).
// En producción devuelve null (las rutas responden 501).
export function secretoCookie(): string | null {
  const s = process.env.MP_COOKIE_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') return null;
  const g = globalThis as { __mpSecretoEfimero?: string };
  return (g.__mpSecretoEfimero ??= randomBytes(32).toString('base64url'));
}

// Contenido de la cookie de MP (token pegado por el usuario u OAuth), o undefined.
export function conexionDeCookie(req: Request): ContenidoCookie | undefined {
  const secreto = secretoCookie();
  const v = leerCookie(req, COOKIE_TOKEN);
  return (secreto && v ? descifrarCookie(v, secreto) : null) ?? undefined;
}

// Token del usuario conectado (cookie cifrada), o undefined.
export const tokenDeCookie = (req: Request): string | undefined => conexionDeCookie(req)?.token;

const VARS = ['MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_REDIRECT_URI', 'MP_COOKIE_SECRET'] as const;
export const faltanVariablesOAuth = (): string[] => VARS.filter(v => !process.env[v]);
