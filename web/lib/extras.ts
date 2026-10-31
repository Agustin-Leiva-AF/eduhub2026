// Comprobantes sueltos (fotos leídas por /api/foto) que se suman a los recibidos/emitidos de ARCA para la proyección.
import { z } from 'zod';
import type { Comprobante } from './parse';

export const MAX_EXTRAS = 50;

const Extra = z.object({
  lado: z.enum(['recibido', 'emitido']).optional(),
  tipo: z.enum(['recibido', 'emitido']).optional(), // alias de `lado`
  comprobante: z.object({
    es_comprobante: z.boolean().optional(),
    tipo: z.string().max(60).optional().default(''),
    fecha_emision: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha_emision debe ser yyyy-mm-dd'),
    fecha_vencimiento: z.string().optional(),
    cuit_emisor: z.string().max(20).optional().default(''),
    razon_social_emisor: z.string().max(120).optional().default(''),
    numero: z.string().max(40).optional().default(''),
    total: z.number().finite().refine(n => n !== 0 && Math.abs(n) < 1e12, 'total inválido'),
  }),
});
export const ExtrasSchema = z.array(Extra).max(MAX_EXTRAS);

export type ResultadoExtras = { ok: true; recibidos: Comprobante[]; emitidos: Comprobante[] } | { ok: false; error: string };

// `crudo`: JSON ya parseado (o string JSON). Cada elemento: { lado: 'recibido'|'emitido', comprobante: <respuesta de /api/foto> }.
export function procesarExtras(crudo: unknown): ResultadoExtras {
  let v = crudo;
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return { ok: false, error: 'El campo extras no es un JSON válido.' }; } }
  const r = ExtrasSchema.safeParse(v);
  if (!r.success) return { ok: false, error: `extras inválido: ${r.error.issues[0]?.path.join('.') || 'formato'} ${r.error.issues[0]?.message ?? ''}`.trim() };
  const recibidos: Comprobante[] = [], emitidos: Comprobante[] = [];
  r.data.forEach((x, i) => {
    const lado = x.lado ?? x.tipo;
    const c = x.comprobante;
    if (!lado || c.es_comprobante === false) return;
    const nc = /nota de cr/i.test(c.tipo);
    const total = Math.abs(c.total) * (nc ? -1 : 1);
    const cuit = c.cuit_emisor.replace(/\D/g, '');
    // La foto solo lee al emisor: en un comprobante emitido la contraparte (cliente) se desconoce, y sin CUIT no hay
    // forma de agrupar. Clave única por comprobante para que no se infiera una cadencia falsa entre fotos distintas.
    const clave = lado === 'emitido' || !cuit ? `foto-${i}` : cuit;
    const nombre = lado === 'emitido' ? 'Cliente (comprobante por foto)' : c.razon_social_emisor || 'Proveedor (comprobante por foto)';
    (lado === 'recibido' ? recibidos : emitidos).push({ fecha: c.fecha_emision, tipo: c.tipo, numero: c.numero, cuit: clave, nombre, total, esNotaCredito: nc });
  });
  return { ok: true, recibidos, emitidos };
}
