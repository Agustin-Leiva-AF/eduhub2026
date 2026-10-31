// GET /api/mp/callback?code&state: valida el state, intercambia el code por un access_token en
// POST https://api.mercadopago.com/oauth/token y lo guarda en cookie httpOnly+Secure+SameSite=Lax CIFRADA (AES-256-GCM,
// MP_COOKIE_SECRET). Redirige a "/?mp=conectado" o "/?mp=error". Sin configuración: 501 { configurado:false, faltan }.
// ANDAMIAJE: no se pudo probar contra Mercado Pago real. Nunca se loguean tokens ni el code.
import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_STATE, COOKIE_TOKEN, cifrarToken, faltanVariablesOAuth, leerCookie } from '@/lib/mpcookie';

export const runtime = 'nodejs';

const MAX_TTL = 60 * 60 * 24 * 180;
const iguales = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function GET(req: NextRequest) {
  const faltan = faltanVariablesOAuth();
  if (faltan.length) return NextResponse.json({ configurado: false, faltan }, { status: 501 });
  const volver = (r: 'conectado' | 'error') => {
    const res = NextResponse.redirect(new URL(`/?mp=${r}`, process.env.MP_REDIRECT_URI));
    res.cookies.set(COOKIE_STATE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return res;
  };
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const esperado = leerCookie(req, COOKIE_STATE);
  if (!code || !state || !esperado || !iguales(state, esperado)) return volver('error');

  try {
    const r = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: process.env.MP_CLIENT_ID, client_secret: process.env.MP_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: process.env.MP_REDIRECT_URI }),
    });
    if (!r.ok) { console.error(`MP oauth/token respondió ${r.status}`); return volver('error'); }
    const j = (await r.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return volver('error');
    const ttl = Math.min(Number.isFinite(j.expires_in) && j.expires_in! > 0 ? j.expires_in! : 3600, MAX_TTL);
    const res = volver('conectado');
    res.cookies.set(COOKIE_TOKEN, cifrarToken(j.access_token, process.env.MP_COOKIE_SECRET!, ttl), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: ttl });
    return res;
  } catch {
    console.error('MP oauth/token: error de red');
    return volver('error');
  }
}
