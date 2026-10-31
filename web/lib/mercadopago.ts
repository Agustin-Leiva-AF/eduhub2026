// Proveedor Mercado Pago: trae pagos de la cuenta (API v1/payments/search) y los convierte a Movimiento[].
// Con MP_ACCESS_TOKEN lee la API real (token TEST-/APP_USR- de un usuario de prueba en desarrollo);
// sin token usa el simulación public/demo/mp/mp_pagos.json. Los montos nunca pasan por el LLM.
import type { Movimiento } from './parse';

export type PagoMP = {
  id: number; status: string; description?: string | null; operation_type?: string;
  date_created: string; date_approved?: string | null; date_last_updated?: string | null;
  transaction_amount: number; transaction_amount_refunded?: number;
  transaction_details?: { net_received_amount?: number };
  collector_id?: number; payer?: { id?: number | string | null };
};

const API = 'https://api.mercadopago.com';
const DIAS_HISTORIAL = 90;
const POR_PAGINA = 50;
const MAX_PAGINAS = 20;

const dia = (iso?: string | null) => (iso ?? '').slice(0, 10);
const redondear = (n: number) => Math.round(n * 100) / 100;

// Cobros aprobados entran por el neto (ya sin comisión MP); devoluciones y contracargos salen. Las descripciones
// reproducen el estilo de un extracto para que categorizar() las clasifique: cobros con QR/link ("MERCADO PAGO") son
// ventas, las transferencias recibidas son cobros a clientes y la carga de saldo no cuenta como venta.
// Los pagos donde la cuenta es la compradora son salidas.
export function mapearPagos(pagos: PagoMP[], userId?: number): Movimiento[] {
  const out: Movimiento[] = [];
  for (const p of pagos) {
    const nota = (p.description ?? '').trim().slice(0, 80);
    const comprador = userId !== undefined && p.collector_id !== undefined && p.collector_id !== userId;
    const transf = p.operation_type === 'money_transfer';
    const bruto = p.transaction_amount;
    if (comprador) {
      if (p.status === 'approved' || p.status === 'refunded' || p.status === 'charged_back') {
        const f = dia(p.date_approved ?? p.date_created);
        if (f && bruto > 0) out.push({ fecha: f, desc: `${transf ? 'TRANSF A' : 'PAGO A PROV'} ${nota}`.trim(), monto: -redondear(bruto) });
        if (p.status === 'refunded' && f) out.push({ fecha: dia(p.date_last_updated) || f, desc: `DEVOLUCION RECIBIDA MERCADO PAGO ${nota}`.trim(), monto: redondear(p.transaction_amount_refunded ?? bruto) });
      }
      continue;
    }
    if (p.status === 'approved' || p.status === 'refunded' || p.status === 'charged_back') {
      const f = dia(p.date_approved ?? p.date_created);
      const neto = p.transaction_details?.net_received_amount ?? bruto;
      const desc = p.operation_type === 'account_fund' ? `CARGA DE SALDO ${nota}` : transf ? `TRANSF RECIBIDA ${nota}` : `ACRED MERCADO PAGO ${nota}`;
      if (f && neto > 0) out.push({ fecha: f, desc: desc.trim(), monto: redondear(neto) });
    }
    if (p.status === 'refunded' || p.status === 'charged_back') {
      const monto = p.status === 'refunded' ? p.transaction_amount_refunded ?? bruto : bruto;
      const f = dia(p.date_last_updated) || dia(p.date_approved ?? p.date_created);
      if (f && monto > 0) out.push({ fecha: f, desc: `${p.status === 'refunded' ? 'DEVOLUCION' : 'CONTRACARGO'} MERCADO PAGO ${nota}`.trim(), monto: -redondear(monto) });
    }
  }
  return out.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

async function mp<T>(token: string, ruta: string): Promise<T> {
  const res = await fetch(API + ruta, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status} en ${ruta.split('?')[0]}`);
  return res.json() as Promise<T>;
}

export async function traerPagos(token: string, hoy = new Date()): Promise<{ pagos: PagoMP[]; userId: number }> {
  const { id } = await mp<{ id: number }>(token, '/users/me');
  const desde = new Date(hoy.getTime() - DIAS_HISTORIAL * 86400000).toISOString();
  const pagos: PagoMP[] = [];
  for (let i = 0; i < MAX_PAGINAS; i++) {
    const q = new URLSearchParams({ sort: 'date_created', criteria: 'desc', range: 'date_created', begin_date: desde, end_date: hoy.toISOString(), limit: String(POR_PAGINA), offset: String(i * POR_PAGINA) });
    const r = await mp<{ paging: { total: number }; results: PagoMP[] }>(token, `/v1/payments/search?${q}`);
    pagos.push(...r.results);
    if ((i + 1) * POR_PAGINA >= r.paging.total || !r.results.length) break;
  }
  return { pagos, userId: id };
}

export type OrigenMP = 'api' | 'simulacion' | 'mixto';

// MP_MODO=api|simulacion|mixto. Sin definir: con token mezcla la API con la historia simulada (en sandbox la API
// no permite fechar pagos hacia atrás, así que la cuenta de prueba nace sin historial); sin token usa solo la simulación.
export async function movimientosMP(token: string | undefined, simulada: () => Promise<{ pagos: PagoMP[]; userId: number }>): Promise<{ movs: Movimiento[]; origen: OrigenMP }> {
  const pedido = process.env.MP_MODO;
  const origen: OrigenMP = pedido === 'api' || pedido === 'simulacion' || pedido === 'mixto' ? pedido : token ? 'mixto' : 'simulacion';
  if (origen !== 'simulacion' && !token) throw new Error(`MP_MODO=${origen} requiere MP_ACCESS_TOKEN`);
  const movs: Movimiento[] = [];
  if (origen !== 'api') { const s = await simulada(); movs.push(...mapearPagos(s.pagos, s.userId)); }
  if (origen !== 'simulacion') { const v = await traerPagos(token!); movs.push(...mapearPagos(v.pagos, v.userId)); }
  return { movs: movs.sort((a, b) => a.fecha.localeCompare(b.fecha)), origen };
}
