// GET /api/mp/estado → { configurado, conectado, modo }
//   configurado: están todas las variables del OAuth (MP_CLIENT_ID, MP_CLIENT_SECRET, MP_REDIRECT_URI, MP_COOKIE_SECRET)
//   conectado:   hay una cookie cifrada válida con el token del usuario
//   modo: 'api' si se leería la API real (token de cookie o MP_ACCESS_TOKEN, y MP_MODO != simulacion); si no 'simulacion'
import { NextResponse } from 'next/server';
import { faltanVariablesOAuth, tokenDeCookie } from '@/lib/mpcookie';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const conectado = !!tokenDeCookie(req);
  const hayToken = conectado || !!process.env.MP_ACCESS_TOKEN;
  return NextResponse.json({
    configurado: faltanVariablesOAuth().length === 0,
    conectado,
    modo: hayToken && process.env.MP_MODO !== 'simulacion' ? 'api' : 'simulacion',
  });
}
