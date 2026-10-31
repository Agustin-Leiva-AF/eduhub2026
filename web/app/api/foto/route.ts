// POST /api/foto: multipart con el campo "foto" (jpg/png/webp, máx. 5 MB). Lee un comprobante con IA.
// Respuestas:
//   200 { ok: true, comprobante: { es_comprobante, tipo, fecha_emision, fecha_vencimiento, cuit_emisor, razon_social_emisor, numero, total } }
//   200 { ok: false, motivo }  (no es un comprobante, IA sin configurar o error de la API)
//   400 { ok: false, motivo }  (falta el archivo, tipo o tamaño inválido)
import { NextResponse } from 'next/server';
import { leerFoto, hayIA, MOTIVO_SIN_IA } from '@/lib/ia';

export const runtime = 'nodejs';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
type Tipo = (typeof TIPOS)[number];

const malo = (motivo: string) => NextResponse.json({ ok: false, motivo }, { status: 400 });

// Tipo real según los primeros bytes (no confiamos solo en lo que declara el cliente).
function detectarTipo(b: Buffer): Tipo | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (b.length > 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return malo('Mandá la foto como formulario (multipart) en el campo "foto".');
  }
  const f = form.get('foto');
  if (!(f instanceof File) || f.size === 0) return malo('Falta la foto del comprobante (campo "foto").');
  if (f.size > MAX_BYTES) return malo('La foto pesa más de 5 MB. Probá con una más liviana.');
  if (f.type && !(TIPOS as readonly string[]).includes(f.type)) return malo('Formato no soportado. Usá una imagen JPG, PNG o WEBP.');

  const buf = Buffer.from(await f.arrayBuffer());
  const tipo = detectarTipo(buf);
  if (!tipo) return malo('El archivo no parece una imagen JPG, PNG o WEBP válida.');

  if (!hayIA()) return NextResponse.json({ ok: false, motivo: MOTIVO_SIN_IA });

  const r = await leerFoto(buf.toString('base64'), tipo);
  if (!r.ok) return NextResponse.json({ ok: false, motivo: r.motivo });
  if (!r.comprobante.es_comprobante) return NextResponse.json({ ok: false, motivo: 'La imagen no parece un comprobante (factura, ticket o remito).' });
  return NextResponse.json({ ok: true, comprobante: r.comprobante });
}
