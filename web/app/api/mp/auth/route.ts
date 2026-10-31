// GET /api/mp/auth: inicia el OAuth de Mercado Pago. Redirige (302) a la pantalla de autorización con un `state`
// aleatorio guardado en cookie httpOnly. Sin las variables de entorno responde 501 { configurado:false, faltan:[...] }.
// ANDAMIAJE: no se pudo probar contra Mercado Pago real (sin credenciales).
import { createHash, randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { COOKIE_STATE, COOKIE_VERIFIER, faltanVariablesOAuth } from '@/lib/mpcookie';

export const runtime = 'nodejs';

export async function GET() {
  const faltan = faltanVariablesOAuth();
  if (faltan.length) return NextResponse.json({ configurado: false, faltan }, { status: 501 });
  const state = randomBytes(24).toString('hex');
  // PKCE (S256): obligatorio si la app lo tiene activado en "Detalles de aplicación"; si no, Mercado Pago lo ignora.
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const q = new URLSearchParams({ client_id: process.env.MP_CLIENT_ID!, response_type: 'code', platform_id: 'mp', redirect_uri: process.env.MP_REDIRECT_URI!, state, code_challenge: challenge, code_challenge_method: 'S256' });
  const res = NextResponse.redirect(`https://auth.mercadopago.com.ar/authorization?${q}`);
  res.cookies.set(COOKIE_STATE, state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  res.cookies.set(COOKIE_VERIFIER, verifier, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
  return res;
}
