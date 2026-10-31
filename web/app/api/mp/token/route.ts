// POST /api/mp/token { token }: conecta la cuenta de Mercado Pago del usuario pegando su access token (sin OAuth).
//   Valida contra GET https://api.mercadopago.com/users/me (timeout 8 s). 401/403 => 400 "Token inválido o sin permisos".
//   Lo guarda en la cookie httpOnly cifrada (AES-256-GCM, ver lib/mpcookie.ts) y responde { conectado:true, cuenta:{ id, apodo? } }.
//   Sin MP_COOKIE_SECRET: en desarrollo se usa un secreto efímero por proceso (la cookie deja de valer al reiniciar el
//   servidor); en producción responde 501 { configurado:false, faltan:['MP_COOKIE_SECRET'] }.
// DELETE /api/mp/token: borra la cookie (desconecta). Nunca se loguea ni se devuelve el token.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cuentaMP, ErrorMP } from '@/lib/mercadopago';
import { COOKIE_TOKEN, cifrarToken, secretoCookie } from '@/lib/mpcookie';

export const runtime = 'nodejs';

const TTL = 60 * 60 * 24 * 30;
const Cuerpo = z.object({ token: z.string().trim().min(10).max(500).regex(/^[A-Za-z0-9_.\-]+$/) });
const opciones = (maxAge: number) => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge });

export async function POST(req: Request) {
  const secreto = secretoCookie();
  if (!secreto) return NextResponse.json({ configurado: false, faltan: ['MP_COOKIE_SECRET'] }, { status: 501 });
  const cuerpo = Cuerpo.safeParse(await req.json().catch(() => null));
  if (!cuerpo.success) return NextResponse.json({ error: 'Token inválido o sin permisos' }, { status: 400 });
  const token = cuerpo.data.token;
  try {
    const cuenta = await cuentaMP(token);
    const res = NextResponse.json({ conectado: true, cuenta });
    res.cookies.set(COOKIE_TOKEN, cifrarToken(token, secreto, TTL, Date.now(), { via: 'token', cuenta }), opciones(TTL));
    return res;
  } catch (e) {
    if (e instanceof ErrorMP && (e.status === 401 || e.status === 403)) return NextResponse.json({ error: 'Token inválido o sin permisos' }, { status: 400 });
    return NextResponse.json({ error: 'No pude validar el token con Mercado Pago. Probá de nuevo en un momento.' }, { status: 502 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ conectado: false });
  res.cookies.set(COOKIE_TOKEN, '', opciones(0));
  return res;
}
