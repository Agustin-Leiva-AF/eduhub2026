// POST /api/dashboard: igual entrada que /api/analizar (multipart "archivos" o {demo:true}),
// pero devuelve todo lo que necesita el dashboard: eventos completos, historia y proyección mensual por categoría.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { detectar, parseComprobantes, parseExtracto } from '@/lib/parse';
import { pronosticar, sumar } from '@/lib/forecast';
import { recomendar } from '@/lib/advice';
import { contexto } from '@/lib/openarg';
import { categorizar, ETIQUETA, type Categoria } from '@/lib/categorias';

export const runtime = 'nodejs';

const DEMO = ['extracto_banco_esquina.csv', 'mis_comprobantes_recibidos.csv', 'mis_comprobantes_emitidos.csv'];
const PYME_DEMO = 'La Esquina de Nueva Córdoba';

type MesCat = { mes: string; real: boolean; dias: number; diasMes: number; porCategoria: Partial<Record<Categoria, number>> };

const diasDelMes = (mes: string) => new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate();

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
  const insumos = archivos.map(a => ({ nombre: a.nombre, sha256: createHash('sha256').update(a.texto).digest('hex') }));

  // Historia mensual por categoría (extracto real)
  const meses = new Map<string, MesCat>();
  const mesDe = (k: string, real: boolean) => {
    let m = meses.get(k);
    if (!m) { m = { mes: k, real, dias: 0, diasMes: diasDelMes(k), porCategoria: {} }; meses.set(k, m); }
    return m;
  };
  const sorted = [...movs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const primero = sorted[0].fecha;
  for (const m of sorted) {
    const mc = mesDe(m.fecha.slice(0, 7), true);
    const c = categorizar(m.desc, m.monto);
    mc.porCategoria[c] = (mc.porCategoria[c] ?? 0) + m.monto; // con signo: entradas +, salidas -
  }
  // Días cubiertos por mes (real: del primer movimiento al corte; proyectado: de hoy+1 al horizonte)
  const finProy = sumar(p.hoy, p.serie.length);
  for (const [k, mc] of meses) {
    const ini = k + '-01' > primero ? k + '-01' : primero;
    const fin = k === p.hoy.slice(0, 7) ? p.hoy : k + '-' + String(mc.diasMes).padStart(2, '0');
    mc.dias = Math.round((Date.parse(fin) - Date.parse(ini)) / 86400000) + 1;
  }
  // Proyección mensual por categoría
  for (const e of p.eventos) {
    const k = e.fecha.slice(0, 7);
    const mc = mesDe(k, k <= p.hoy.slice(0, 7) && meses.get(k)?.real === true);
    // Si el mes de corte tiene días proyectados, no se mezcla con lo real: se agrupan aparte como proyección del resto del mes.
    if (mc.real) continue;
    mc.porCategoria[e.categoria] = (mc.porCategoria[e.categoria] ?? 0) + e.monto;
  }
  for (const [k, mc] of meses) if (!mc.real) {
    const ini = k + '-01' > p.hoy ? k + '-01' : sumar(p.hoy, 1);
    const fin = finProy < k + '-' + String(mc.diasMes).padStart(2, '0') ? finProy : k + '-' + String(mc.diasMes).padStart(2, '0');
    mc.dias = Math.round((Date.parse(fin) - Date.parse(ini)) / 86400000) + 1;
  }
  const mensual = [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  // Ventas mensuales promedio: acreditaciones de las últimas 8 semanas (mismo criterio que el motor)
  const desde8 = sumar(p.hoy, -56);
  const ventas8 = movs.filter(m => categorizar(m.desc, m.monto) === 'ventas' && m.fecha > desde8 && m.monto > 0).reduce((s, m) => s + m.monto, 0);
  const ventasMensuales = (ventas8 / 8) * 4.33;

  return NextResponse.json({
    pyme: pyme || 'Mi pyme', demo, corte: p.hoy,
    resumen: { movimientos: movs.length, recibidos: rec.length, emitidos: emi.length, ignorados, insumos },
    pronostico: p, // completo: eventos con ventas, contrapartes, huecos, historia
    recomendacion: r, citas: ctx.citas,
    mensual, etiquetas: ETIQUETA, ventasMensuales,
  });
}
