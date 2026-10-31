// Prueba real de la capa de IA con los datos demo: npx tsx scripts/probar-ia.ts
// Hace UNA llamada a la API (redactar) si hay ANTHROPIC_API_KEY (entorno o web/.env.local); sin clave verifica el camino por reglas.
import fs from 'node:fs';
import path from 'node:path';
import { parseExtracto, parseComprobantes } from '../lib/parse';
import { pronosticar } from '../lib/forecast';
import { recomendar } from '../lib/advice';
import { contexto } from '../lib/openarg';
import { redactar } from '../lib/ia';

// Carga web/.env.local sin imprimir valores (Next lo hace solo; tsx no).
const envFile = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  for (const l of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const leer = (n: string) => fs.readFileSync(path.join('public/demo', n), 'utf8');
const movs = parseExtracto(leer('extracto_banco_esquina.csv'));
const rec = parseComprobantes(leer('mis_comprobantes_recibidos.csv'));
const emi = parseComprobantes(leer('mis_comprobantes_emitidos.csv'));
const ctx = contexto();
const p = pronosticar(movs, rec, emi, { ipcMensual: ctx.ipcMensual });
const r = recomendar(p, movs, rec, emi, ctx);

const datos = JSON.stringify({ alerta: r.alerta, opciones: r.opciones, contexto: r.contexto, aprendizajes: p.aprendizajes.slice(0, 4) });
const NUM = /\d[\d.,]*\d|\d/g;
const norm = (s: string) => s.replace(/[.,]/g, '');
const permitidos = new Set((datos.match(NUM) ?? []).map(norm));

async function main() {
const t0 = Date.now();
const { texto, fuente } = await redactar(p, r);
console.log(`fuente=${fuente} (${Date.now() - t0} ms, key=${process.env.ANTHROPIC_API_KEY ? 'configurada' : 'ausente'})\n`);
console.log(texto, '\n');

const palabras = texto.trim().split(/\s+/).filter(Boolean).length;
const ajenos = (texto.match(NUM) ?? []).filter(n => !permitidos.has(norm(n)));
console.log(`palabras=${palabras} (${fuente === 'ia' ? (palabras <= 90 ? 'OK <=90' : 'EXCEDE 90') : 'texto por reglas, sin tope'})`);
console.log(`cifras fuera de los datos=${ajenos.length ? ajenos.join(', ') : 'ninguna'}`);
const voseo = /\b(tenés|podés|querés|elegí|mirá|fijate|avisame|decime|contame|vas a|sos)\b/i.test(texto);
console.log(`voseo detectado=${voseo}`);
}
main();
