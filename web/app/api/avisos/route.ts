// /api/avisos: GET = qué canales hay disponibles; POST = registrar canales y alertas; DELETE = darse de baja.
import { NextResponse } from 'next/server';
import { canalesDisponibles, idValido, quitar, registrar, telefonoValido } from '@/lib/avisos';
import type { Alertas } from '@/lib/alertas';

export const runtime = 'nodejs';

export async function GET() {
  const c = canalesDisponibles();
  return NextResponse.json({ push: c.push, twilio: c.twilio, clavePublica: c.clavePublica });
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !idValido(b.id) || !Array.isArray(b.alertas?.alertas)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  const c = canalesDisponibles();
  if (b.push && !c.push) return NextResponse.json({ error: 'Las notificaciones del navegador no están configuradas en el servidor (VAPID).' }, { status: 503 });
  const tel = typeof b.telefono === 'string' ? b.telefono.replace(/[\s()-]/g, '') : undefined;
  if (tel) {
    if (!c.twilio) return NextResponse.json({ error: 'WhatsApp/SMS no está configurado en el servidor (Twilio).' }, { status: 503 });
    if (!telefonoValido(tel)) return NextResponse.json({ error: 'Poné el teléfono con código de país, por ejemplo +5493511234567.' }, { status: 400 });
  }
  const sub = b.push?.endpoint && b.push?.keys?.p256dh && b.push?.keys?.auth ? b.push : undefined;
  if (b.push && !sub) return NextResponse.json({ error: 'Suscripción del navegador inválida.' }, { status: 400 });
  try {
    const r = await registrar({ id: b.id, push: sub, telefono: tel, alertas: b.alertas as Alertas, probar: Boolean(b.probar) });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'No pude guardar los avisos.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b || !idValido(b.id)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  quitar(b.id, b.canal === 'push' || b.canal === 'telefono' ? b.canal : 'todo');
  return NextResponse.json({ ok: true });
}
