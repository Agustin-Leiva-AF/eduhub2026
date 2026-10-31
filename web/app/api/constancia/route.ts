// POST /api/constancia: arma la carpeta de crédito con consentimiento y la sella. GET ?hash= verifica.
import { NextResponse } from 'next/server';
import type { Hex } from 'viem';
import { sellar, verificar } from '@/lib/notario';

export const runtime = 'nodejs';

const DESTINOS: Record<string, string> = {
  'banco-demo': 'Banco de la demo (entidad financiera)',
  'sgr-demo': 'SGR de la demo (garantía)',
};

export async function POST(req: Request) {
  const b = await req.json();
  if (!b?.consentimiento) return NextResponse.json({ error: 'Falta el consentimiento expreso del titular (Ley 25.326, art. 5).' }, { status: 400 });
  if (!DESTINOS[b.destino]) return NextResponse.json({ error: 'Destino desconocido' }, { status: 400 });
  const carpeta = {
    version: 1,
    pyme: b.pyme,
    generada: new Date().toISOString(),
    insumos: b.insumos,                 // sha256 de cada archivo original
    pronostico: b.pronostico,           // horizontes, hueco y serie diaria
    opcionElegida: b.opcion,
    destinatario: DESTINOS[b.destino],
    consentimiento: { texto: b.consentimiento, fecha: new Date().toISOString() },
    aviso: 'Proyección generada por CFO de Bolsillo. No es asesoramiento financiero. Datos de terceros seudonimizados.',
  };
  const c = await sellar(carpeta, b.destino);
  return NextResponse.json(c);
}

export async function GET(req: Request) {
  const hash = new URL(req.url).searchParams.get('hash');
  if (!hash || !/^0x[0-9a-f]{64}$/.test(hash)) return NextResponse.json({ error: 'hash inválido' }, { status: 400 });
  return NextResponse.json(await verificar(hash as Hex));
}
