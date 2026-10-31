// Capa de IA (Claude). Opcional: sin ANTHROPIC_API_KEY la app funciona con los textos armados por reglas.
// El LLM nunca calcula montos: redacta sobre cifras ya calculadas y lee fotos de comprobantes.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import type { Pronostico } from './forecast';
import type { Recomendacion } from './advice';

const MODELO = 'claude-opus-5-5';
const hayClave = () => Boolean(process.env.ANTHROPIC_API_KEY);
const cliente = () => new Anthropic();

const SISTEMA = `Sos el "CFO de Bolsillo", un asistente de caja para dueños de pymes argentinas que escribe por WhatsApp.
Escribí en español rioplatense, de vos, claro y cálido, sin jerga financiera. Máximo 90 palabras, sin títulos ni viñetas.
Usá SOLO las cifras y fechas que te paso; no inventes números ni recomiendes instrumentos o entidades concretas.
Terminá invitando a elegir una de las opciones que se muestran debajo del mensaje.`;

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
    const res = await cliente().messages.create({
      model: MODELO,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: SISTEMA,
      messages: [{ role: 'user', content: `Redactá el mensaje para el dueño con estos datos:\n${JSON.stringify(datos, null, 1)}` }],
    });
    const texto = res.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
    if (res.stop_reason === 'refusal' || !texto) return { texto: base, fuente: 'reglas' };
    return { texto, fuente: 'ia' };
  } catch (e) {
    console.error('IA no disponible, uso texto por reglas:', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
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

export async function leerFoto(base64: string, mediaType: 'image/jpeg' | 'image/png' | 'image/webp'): Promise<ComprobanteFoto | null> {
  if (!hayClave()) return null;
  const res = await cliente().messages.parse({
    model: MODELO,
    max_tokens: 4000,
    output_config: { effort: 'low', format: zodOutputFormat(ComprobanteFoto) },
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: 'Extraé los datos de este comprobante argentino. Si no es un comprobante, es_comprobante=false.' },
    ] }],
  });
  return res.parsed_output ?? null;
}
