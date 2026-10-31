// POST /api/analizar: recibe extracto + comprobantes (multipart) o {demo:true} y devuelve pronóstico y recomendación.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { detectar, parseComprobantes, parseExtracto } from '@/lib/parse';
import { pronosticar } from '@/lib/forecast';
import { recomendar } from '@/lib/advice';
import { contexto } from '@/lib/openarg';
import { redactar } from '@/lib/ia';

export const runtime = 'nodejs';

const DEMO = ['extracto_banco_esquina.csv', 'mis_comprobantes_recibidos.csv', 'mis_comprobantes_emitidos.csv'];

export async function POST(req: Request) {
  let archivos: { nombre: string; texto: string }[] = [];
  const tipo = req.headers.get('content-type') ?? '';
  if (tipo.includes('multipart/form-data')) {
    const form = await req.formData();
    for (const v of form.getAll('archivos')) if (v instanceof File) archivos.push({ nombre: v.name, texto: await v.text() });
  } else {
    archivos = await Promise.all(DEMO.map(async nombre => ({ nombre, texto: await fs.readFile(path.join(process.cwd(), 'public/demo', nombre), 'utf8') })));
  }

  const movs = [], rec = [], emi = [], ignorados: string[] = [];
  for (const a of archivos) {
    const t = detectar(a.texto);
    if (t === 'extracto') movs.push(...parseExtracto(a.texto));
    else if (t === 'recibidos') rec.push(...parseComprobantes(a.texto));
    else if (t === 'emitidos') emi.push(...parseComprobantes(a.texto));
    else ignorados.push(a.nombre);
  }
  if (!movs.length) return NextResponse.json({ error: 'No encontré un extracto bancario con columnas de fecha, débito/crédito y saldo.', ignorados }, { status: 400 });

  const ctx = contexto();
  const p = pronosticar(movs, rec, emi, { ipcMensual: ctx.ipcMensual });
  const r = recomendar(p, movs, rec, emi, ctx);
  const mensaje = await redactar(p, r); // LLM opcional: si no hay clave, usa el texto armado por reglas
  const insumos = archivos.map(a => ({ nombre: a.nombre, sha256: createHash('sha256').update(a.texto).digest('hex') }));

  return NextResponse.json({
    resumen: { movimientos: movs.length, recibidos: rec.length, emitidos: emi.length, ignorados, insumos },
    pronostico: { ...p, eventos: p.eventos.filter(e => e.categoria !== 'ventas') },
    recomendacion: r, mensaje, citas: ctx.citas,
  });
}
