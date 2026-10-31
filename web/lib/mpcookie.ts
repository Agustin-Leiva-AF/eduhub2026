// Cookie cifrada con el access_token de Mercado Pago (OAuth). AES-256-GCM con clave derivada de MP_COOKIE_SECRET.
// Formato: base64url( iv[12] | tag[16] | cifrado( JSON {t: token, e: expira en epoch seg} ) ). Nunca se loguea el token.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const COOKIE_TOKEN = 'mp_token';
export const COOKIE_STATE = 'mp_state';

const clave = (secreto: string) => createHash('sha256').update(secreto).digest();

export function cifrarToken(token: string, secreto: string, ttlSeg: number, ahora = Date.now()): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', clave(secreto), iv);
  const ct = Buffer.concat([c.update(JSON.stringify({ t: token, e: Math.floor(ahora / 1000) + ttlSeg }), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString('base64url');
}

// null si la cookie está alterada, es de otro secreto, expiró o tiene mal formato.
export function descifrarToken(valor: string, secreto: string, ahora = Date.now()): string | null {
  try {
    const b = Buffer.from(valor, 'base64url');
    if (b.length < 29) return null;
    const d = createDecipheriv('aes-256-gcm', clave(secreto), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    const j = JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8')) as { t?: unknown; e?: unknown };
    if (typeof j.t !== 'string' || typeof j.e !== 'number' || j.e * 1000 < ahora) return null;
    return j.t;
  } catch { return null; }
}

export function leerCookie(req: Request, nombre: string): string | undefined {
  for (const par of (req.headers.get('cookie') ?? '').split(';')) {
    const i = par.indexOf('=');
    if (i > 0 && par.slice(0, i).trim() === nombre) return decodeURIComponent(par.slice(i + 1).trim());
  }
  return undefined;
}

// Token del usuario conectado por OAuth (cookie cifrada), o undefined.
export function tokenDeCookie(req: Request): string | undefined {
  const secreto = process.env.MP_COOKIE_SECRET;
  const v = leerCookie(req, COOKIE_TOKEN);
  return secreto && v ? descifrarToken(v, secreto) ?? undefined : undefined;
}

const VARS = ['MP_CLIENT_ID', 'MP_CLIENT_SECRET', 'MP_REDIRECT_URI', 'MP_COOKIE_SECRET'] as const;
export const faltanVariablesOAuth = (): string[] => VARS.filter(v => !process.env[v]);
