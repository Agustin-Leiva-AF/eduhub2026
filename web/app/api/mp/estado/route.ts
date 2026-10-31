// GET /api/mp/estado → { configurado, conectado, modo, via, cuenta? }
//   configurado: están todas las variables del OAuth (MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI, MP_COOKIE_SECRET)
//   conectado:   hay una cookie cifrada válida con el token del usuario (pegado en /api/mp/token u OAuth)
//   via: 'token' (pegado por el usuario) | 'oauth' | 'env' (MP_ACCESS_TOKEN del servidor) | null (sin token)
//   cuenta: { id, apodo? } de la cuenta dueña del token (si se pudo averiguar)
//   modo: 'api' si se leería la API real (cualquier token y MP_MODO != simulacion); si no 'simulacion'
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cuentaMP } from '@/lib/mercadopago';
import { conexionDeCookie, faltanVariablesOAuth } from '@/lib/mpcookie';

export const runtime = 'nodejs';

// La cuenta de un token que no trae la cookie (env/oauth) se consulta una vez cada 10 min (sin guardar el token).
const cuentas = new Map<string, { t: number; cuenta?: { id: number; apodo?: string } }>();
async function cuentaCacheada(token: string): Promise<{ id: number; apodo?: string } | undefined> {
  const k = createHash('sha256').update(token).digest('hex');
  const c = cuentas.get(k);
  if (c && Date.now() - c.t < 600_000) return c.cuenta;
  const cuenta = await cuentaMP(token).catch(() => undefined);
  cuentas.set(k, { t: cuenta ? Date.now() : Date.now() - 570_000, cuenta }); // un fallo se reintenta a los 30 s
  return cuenta;
}

export async function GET(req: Request) {
  const c = conexionDeCookie(req);
  const env = process.env.MP_ACCESS_TOKEN;
  const via = c ? c.via : env ? 'env' : null;
  let cuenta = c?.cuenta;
  const token = c?.token ?? env;
  if (!cuenta && token) cuenta = await cuentaCacheada(token);
  return NextResponse.json({
    configurado: faltanVariablesOAuth().length === 0,
    conectado: !!c,
    modo: token && process.env.MP_MODO !== 'simulacion' ? 'api' : 'simulacion',
    via,
    ...(cuenta && { cuenta }),
  });
}
