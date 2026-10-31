// Capa de IA (Claude). Opcional: sin ANTHROPIC_API_KEY la app funciona con los textos armados por reglas.
// El LLM nunca calcula montos: redacta sobre cifras ya calculadas y lee fotos de comprobantes.
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod/v4';
import type { Pronostico } from './forecast';
import type { Recomendacion } from './advice';

const MODELO = 'claude-opus-5-5';
// Opus 5.5: el pensamiento no se puede apagar y el esfuerzo por defecto es "medium": lo fijamos explícito.
const ESFUERZO = 'low' as const;
const hayClave = () => Boolean(process.env.ANTHROPIC_API_KEY);
// Timeout corto (el chat no puede quedar colgado) y 1 reintento automático del SDK (429/5xx/red).
const cliente = () => new Anthropic({ timeout: 45_000, maxRetries: 1 });

// Si el clasificador de seguridad rechaza el pedido, la API lo reintenta del lado servidor en otro modelo.
const CON_FALLBACK = { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } as const;

// Intenta con fallback de refusals; si la API lo rechaza (400 por beta/modelo no soportado) reintenta sin él.
async function conFallback<T>(llamar: (extra: { betas?: string[]; fallbacks?: 'default' }) => Promise<T>): Promise<T> {
  try {
    return await llamar({ betas: [...CON_FALLBACK.betas], fallbacks: CON_FALLBACK.fallbacks });
  } catch (e) {
    if (e instanceof Anthropic.BadRequestError) return await llamar({});
    throw e;
  }
}

// Motivo en español para el usuario, sin detalles técnicos. El detalle va al log del servidor.
function motivoError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
    return 'La clave de la IA no es válida o no tiene permisos. Revisá ANTHROPIC_API_KEY.';
  if (e instanceof Anthropic.RateLimitError) return 'La IA está recibiendo muchas consultas. Probá de nuevo en un minuto.';
  if (e instanceof Anthropic.APIConnectionTimeoutError) return 'La IA tardó demasiado en responder. Probá de nuevo.';
  if (e instanceof Anthropic.APIConnectionError) return 'No pude conectarme con la IA. Revisá la conexión y probá de nuevo.';
  if (e instanceof Anthropic.InternalServerError) return 'La IA tiene un problema momentáneo. Probá de nuevo en unos minutos.';
  if (e instanceof Anthropic.BadRequestError) return 'No pude procesar esa imagen. Probá con otra foto más nítida.';
  return 'No pude leer la foto en este momento. Probá de nuevo.';
}
const logError = (donde: string, e: unknown) =>
  console.error(`[ia:${donde}]`, e instanceof Anthropic.APIError ? `${e.constructor.name} ${e.status ?? ''} ${e.message}` : e);

const SISTEMA = `Sos el "CFO de Bolsillo", un asistente de caja para dueños de pymes argentinas que escribe por WhatsApp.
Escribí en español rioplatense, de vos, claro y cálido, sin jerga financiera. Máximo 90 palabras, sin títulos ni viñetas.
Usá SOLO las cifras y fechas que te paso, copiadas tal cual vienen escritas (no redondees, no conviertas a "millones", no sumes ni restes); no inventes números ni recomiendes instrumentos o entidades concretas.
Terminá invitando a elegir una de las opciones que se muestran debajo del mensaje.`;

const NUM = /\d[\d.,]*\d|\d/g;
const norm = (s: string) => s.replace(/[.,]/g, '');
// El texto de la IA solo puede traer números que ya estaban en los datos (guarda anti-alucinación de cifras).
function numerosAjenos(texto: string, datos: string): string[] {
  const permitidos = new Set((datos.match(NUM) ?? []).map(norm));
  return (texto.match(NUM) ?? []).filter(n => !permitidos.has(norm(n)));
}
const palabras = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export async function redactar(p: Pronostico, r: Recomendacion): Promise<{ texto: string; fuente: 'ia' | 'reglas' }> {
  const base = [r.alerta, ...r.contexto].join('\n\n');
  if (!hayClave()) return { texto: base, fuente: 'reglas' };
  try {
    const datos = {
      alerta: r.alerta,
      opciones: r.opciones.map(o => ({ titulo: o.titulo, detalle: o.detalle, cubre: o.cubre })),
      contexto: r.contexto,
      aprendizajes: p.aprendizajes.slice(0, 4),
    };
    const json = JSON.stringify(datos, null, 1);
    const res = await conFallback(extra =>
      cliente().beta.messages.create({
        model: MODELO,
        max_tokens: 4000, // margen para el pensamiento adaptativo, que no se puede apagar
        output_config: { effort: ESFUERZO },
        system: SISTEMA,
        messages: [{ role: 'user', content: `Redactá el mensaje para el dueño con estos datos:\n${json}` }],
        ...extra,
      }),
    );
    // refusal (clasificadores de seguridad, incluso tras el fallback) o corte por largo: no usar el texto parcial.
    if (res.stop_reason === 'refusal' || res.stop_reason === 'max_tokens') return { texto: base, fuente: 'reglas' };
    const texto = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
    if (!texto) return { texto: base, fuente: 'reglas' };
    const ajenos = numerosAjenos(texto, json);
    if (ajenos.length || palabras(texto) > 120) {
      console.warn('[ia:redactar] texto descartado por cifras ajenas o largo excesivo:', ajenos.join(', '), palabras(texto), 'palabras');
      return { texto: base, fuente: 'reglas' };
    }
    return { texto, fuente: 'ia' };
  } catch (e) {
    logError('redactar', e);
    return { texto: base, fuente: 'reglas' };
  }
}

const ComprobanteFoto = z.object({
  es_comprobante: z.boolean(),
  tipo: z.string().describe('Ej: Factura A, Factura B, Factura C, Ticket, Remito'),
  fecha_emision: z.string().describe('yyyy-mm-dd'),
  fecha_vencimiento: z.string().describe('yyyy-mm-dd o vacío si no figura'),
  cuit_emisor: z.string().describe('solo dígitos'),
  razon_social_emisor: z.string(),
  numero: z.string(),
  total: z.number().describe('Importe total en pesos'),
});
export type ComprobanteFoto = z.infer<typeof ComprobanteFoto>;

export type ResultadoFoto = { ok: true; comprobante: ComprobanteFoto } | { ok: false; motivo: string };

export const MOTIVO_SIN_IA = 'La lectura de fotos necesita configurar la IA (ANTHROPIC_API_KEY).';
export const hayIA = hayClave;

// Lee una foto de comprobante. Nunca lanza: devuelve { ok:false, motivo } con un mensaje entendible en español.
export async function leerFoto(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<ResultadoFoto> {
  if (!hayClave()) return { ok: false, motivo: MOTIVO_SIN_IA };
  try {
    const res = await conFallback(extra =>
      cliente().beta.messages.parse({
        model: MODELO,
        max_tokens: 4000,
        output_config: { effort: ESFUERZO, format: betaZodOutputFormat(ComprobanteFoto) },
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Extraé los datos de este comprobante argentino (factura, ticket o remito). Si no es un comprobante, es_comprobante=false y dejá los demás campos vacíos o en 0. Fechas en yyyy-mm-dd; CUIT solo dígitos; total en pesos como número.' },
        ] }],
        ...extra,
      }),
    );
    if (res.stop_reason === 'refusal') return { ok: false, motivo: 'La IA no pudo procesar esa imagen. Probá con otra foto.' };
    if (res.stop_reason === 'max_tokens' || !res.parsed_output) return { ok: false, motivo: 'No pude leer la foto con claridad. Probá con una imagen más nítida.' };
    return { ok: true, comprobante: res.parsed_output };
  } catch (e) {
    logError('leerFoto', e);
    return { ok: false, motivo: motivoError(e) };
  }
}
