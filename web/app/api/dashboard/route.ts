// POST /api/dashboard: igual entrada que /api/analizar (multipart "archivos" o {demo:true}),
// pero devuelve todo lo que necesita el dashboard: eventos completos, historia y proyección mensual por categoría.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { detectar, parseComprobantes, parseExtracto } from '@/lib/parse';
import { pronosticar } from '@/lib/forecast';
import { armarDashboard } from '@/lib/dashboard';
import { recomendar } from '@/lib/advice';
import { contexto } from '@/lib/openarg';
import { calcularExcedente } from '@/lib/excedente';

export const runtime = 'nodejs';

const DEMO = ['extracto_banco_esquina.csv', 'mis_comprobantes_recibidos.csv', 'mis_comprobantes_emitidos.csv'];
const PYME_DEMO = 'La Esquina de Nueva Córdoba';

export async function POST(req: Request) {
  let archivos: { nombre: string; texto: string }[] = [];
  let demo = false;
  let pyme = '';
  const tipo = req.headers.get('content-type') ?? '';
  if (tipo.includes('multipart/form-data')) {
    const form = await req.formData();
    for (const v of form.getAll('archivos')) if (v instanceof File) archivos.push({ nombre: v.name, texto: await v.text() });
    const n = form.get('pyme');
    if (typeof n === 'string') pyme = n.trim().slice(0, 80);
  } else {
    demo = true;
    pyme = PYME_DEMO;
    const pedido = await req.json().catch(() => ({}));
    const dir = pedido.escenario === 'holgada' ? 'public/demo/holgada' : 'public/demo';
    archivos = await Promise.all(DEMO.map(async nombre => ({ nombre, texto: await fs.readFile(path.join(process.cwd(), dir, nombre), 'utf8') })));
  }

  const movs = [], rec = [], emi = [], ignorados: string[] = [];
  for (const a of archivos) {
    const t = detectar(a.texto);
    if (t === 'extracto') movs.push(...parseExtracto(a.texto));
    else if (t === 'recibidos') rec.push(...parseComprobantes(a.texto));
    else if (t === 'emitidos') emi.push(...parseComprobantes(a.texto));
    else ignorados.push(a.nombre);
  }
  if (!movs.length) return NextResponse.json({ error: 'No pude reconocer un extracto en los archivos. Necesito un CSV con fecha, importe (o débito y crédito) y saldo; también acepto reportes de Mercado Pago.', ignorados }, { status: 400 });

  const ctx = contexto();
  const p = pronosticar(movs, rec, emi, { ipcMensual: ctx.ipcMensual });
  const r = recomendar(p, movs, rec, emi, ctx);
  const insumos = archivos.map(a => ({ nombre: a.nombre, sha256: createHash('sha256').update(a.texto).digest('hex') }));

  const d = armarDashboard(p, movs, pyme, demo);

  return NextResponse.json({
    pyme: d.pyme, demo, corte: p.hoy,
    resumen: { movimientos: movs.length, recibidos: rec.length, emitidos: emi.length, ignorados, insumos },
    pronostico: p, // completo: eventos con ventas, contrapartes, huecos, historia
    recomendacion: r, excedente: calcularExcedente(p, ctx), citas: ctx.citas,
    mensual: d.mensual, etiquetas: d.etiquetas, ventasMensuales: d.ventasMensuales,
  });
}
