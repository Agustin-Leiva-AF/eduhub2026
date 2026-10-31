// /api/avisos/despachar: lo llama un cron (Task Scheduler, Vercel Cron, cron-job.org) una vez al día o cada hora.
// Protegido con CRON_SECRET (Authorization: Bearer ...). Sin CRON_SECRET solo funciona fuera de producción.
import { NextResponse } from 'next/server';
import { despachar } from '@/lib/avisos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function manejar(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto ? req.headers.get('authorization') !== `Bearer ${secreto}` : process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  return NextResponse.json(await despachar());
}

export const GET = manejar;
export const POST = manejar;
