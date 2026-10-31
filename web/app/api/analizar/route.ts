// POST /api/analizar: recibe extracto + comprobantes (multipart) o {demo:true} y devuelve pronóstico y recomendación.
//
// Entrada
//   multipart/form-data: `archivos` (uno o varios CSV) y opcional `extras` (string JSON, ver abajo).
//   application/json:    { demo?, fuente?: 'mp', compromisos?: boolean, extras?: [...] }
//   `extras`: lista (máx. 50) de comprobantes leídos con /api/foto que se SUMAN a los recibidos/emitidos de ARCA:
//     [{ "lado": "recibido" | "emitido", "comprobante": <objeto `comprobante` tal cual lo devuelve /api/foto> }]
//     Se valida con zod (fecha_emision yyyy-mm-dd, total numérico distinto de 0). Un extra inválido => 400 { error }.
//     Un extra con es_comprobante=false se ignora. Las fotos solo leen al emisor, así que un "emitido" entra como
//     cobro a un cliente sin nombre, con plazo estimado de 30 días.
//   Con fuente 'mp' el token sale de la cookie OAuth cifrada (/api/mp/*), si no de MP_ACCESS_TOKEN, si no de la simulación.
// Salida (además de lo ya existente)
//   resumen.extras: cantidad de extras aplicados; `excedente`: ver lib/excedente.ts (Excedente).
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { detectar, parseBoletas, parseComprobantes, parseExtracto, parseNomina, type Movimiento } from '@/lib/parse';
import { movimientosMP } from '@/lib/mercadopago';
import { alertar } from '@/lib/alertas';
import { pronosticar } from '@/lib/forecast';
import { recomendar } from '@/lib/advice';
import { contexto } from '@/lib/openarg';
import { redactar } from '@/lib/ia';
import { calcularExcedente } from '@/lib/excedente';
import { procesarExtras } from '@/lib/extras';
import { tokenDeCookie } from '@/lib/mpcookie';

export const runtime = 'nodejs';

const MENSAJE_SIN_EXTRACTO = 'No pude reconocer un extracto en los archivos. Necesito un CSV con fecha, importe (o débito y crédito) y saldo; también acepto reportes de Mercado Pago.';

const DEMO = ['extracto_banco_esquina.csv', 'mis_comprobantes_recibidos.csv', 'mis_comprobantes_emitidos.csv'];
const DEMO_COMPROMISOS = ['boletas_vencimientos.csv', 'nomina_octubre.csv'];

export async function POST(req: Request) {
  let archivos: { nombre: string; texto: string }[] = [];
  let mp = false;
  let extrasCrudo: unknown;
  const tipo = req.headers.get('content-type') ?? '';
  if (tipo.includes('multipart/form-data')) {
    const form = await req.formData();
    for (const v of form.getAll('archivos')) if (v instanceof File) archivos.push({ nombre: v.name, texto: await v.text() });
    const ex = form.get('extras');
    if (typeof ex === 'string' && ex.trim()) extrasCrudo = ex;
  } else {
    const pedido = await req.json().catch(() => ({}));
    mp = pedido.fuente === 'mp';
    extrasCrudo = pedido.extras;
    // Con Mercado Pago como fuente, el extracto se reemplaza por los pagos de la cuenta MP y ARCA, boletas y nómina
    // salen de la pyme simulada en public/demo/mp (Carpintería Los Aromos).
    const lista = (pedido.compromisos ? [...DEMO, ...DEMO_COMPROMISOS] : DEMO).filter(n => !(mp && n === DEMO[0]));
    archivos = await Promise.all(lista.map(async nombre => ({ nombre, texto: await fs.readFile(path.join(process.cwd(), mp ? 'public/demo/mp' : pedido.escenario === 'holgada' ? 'public/demo/holgada' : 'public/demo', nombre), 'utf8') })));
  }

  const extras = extrasCrudo === undefined ? null : procesarExtras(extrasCrudo);
  if (extras && !extras.ok) return NextResponse.json({ error: extras.error }, { status: 400 });

  const movs: Movimiento[] = [], rec = [], emi = [], boletas = [], nomina = [], ignorados: string[] = [];
  let origenMP: string | undefined;
  if (mp) {
    try {
      const r = await movimientosMP(tokenDeCookie(req) ?? process.env.MP_ACCESS_TOKEN, async () => JSON.parse(await fs.readFile(path.join(process.cwd(), 'public/demo/mp/mp_pagos.json'), 'utf8')));
      movs.push(...r.movs); origenMP = r.origen;
    } catch (e) {
      return NextResponse.json({ error: `No pude leer Mercado Pago: ${e instanceof Error ? e.message : 'error desconocido'}` }, { status: 502 });
    }
  }
  for (const a of archivos) {
    const t = detectar(a.texto);
    if (t === 'extracto') movs.push(...parseExtracto(a.texto));
    else if (t === 'recibidos') rec.push(...parseComprobantes(a.texto));
    else if (t === 'emitidos') emi.push(...parseComprobantes(a.texto));
    else if (t === 'boletas') boletas.push(...parseBoletas(a.texto));
    else if (t === 'nomina') nomina.push(...parseNomina(a.texto));
    else ignorados.push(a.nombre);
  }
  if (extras?.ok) { rec.push(...extras.recibidos); emi.push(...extras.emitidos); }
  if (!movs.length) return NextResponse.json({ error: mp ? 'Mercado Pago no devolvió pagos en los últimos 90 días.' : MENSAJE_SIN_EXTRACTO, ignorados }, { status: 400 });

  const ctx = contexto();
  const p = pronosticar(movs, rec, emi, { ipcMensual: ctx.ipcMensual, boletas, nomina });
  const r = recomendar(p, movs, rec, emi, ctx);
  const al = alertar(p, boletas);
  const excedente = calcularExcedente(p, ctx);
  const mensaje = await redactar(p, r, al); // LLM opcional: si no hay clave, usa el texto armado por reglas
  const insumos = archivos.map(a => ({ nombre: a.nombre, sha256: createHash('sha256').update(a.texto).digest('hex') }));

  return NextResponse.json({
    resumen: { movimientos: movs.length, recibidos: rec.length, emitidos: emi.length, boletas: boletas.length, empleados: nomina.length, ignorados, insumos, ...(extras?.ok && { extras: extras.recibidos.length + extras.emitidos.length }), ...(origenMP && { mercadopago: origenMP }) },
    pronostico: { ...p, eventos: p.eventos.filter(e => e.categoria !== 'ventas') },
    alertas: al, recomendacion: r, excedente, mensaje, citas: ctx.citas,
  });
}
