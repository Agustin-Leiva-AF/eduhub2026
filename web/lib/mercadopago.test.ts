import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { traerPagos, cuentaMP, movimientosMP, limpiarCacheMP, ErrorMP, type PagoMP } from './mercadopago';

const pago = (id: number): PagoMP => ({ id, status: 'approved', date_created: '2026-10-01T10:00:00.000-03:00', date_approved: '2026-10-01T10:00:00.000-03:00', transaction_amount: 100, collector_id: 7 });
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

// fetch simulado: `total` pagos, páginas de `limit`; registra las llamadas y cuántas iban en vuelo a la vez.
// `fallos`: por ruta (+offset), la lista de status HTTP con los que falla en cada intento sucesivo.
function simulado(total = 250, fallos: Record<string, number[]> = {}) {
  const llamadas: string[] = [];
  let vuelo = 0, maxVuelo = 0;
  const cuentas: Record<string, number> = {};
  const f = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = new URL(String(url));
    const clave = u.pathname + (u.searchParams.get('offset') ?? '');
    llamadas.push(clave);
    assert.ok(new Headers(init?.headers).get('authorization')?.startsWith('Bearer '));
    assert.ok(init?.signal, 'cada request lleva timeout');
    cuentas[clave] = (cuentas[clave] ?? 0) + 1;
    vuelo++; maxVuelo = Math.max(maxVuelo, vuelo);
    await new Promise(r => setTimeout(r, 5));
    vuelo--;
    const falla = fallos[clave]?.[cuentas[clave] - 1];
    if (falla) return json({ message: 'x' }, falla);
    if (u.pathname === '/users/me') return json({ id: 7, nickname: 'MIPYME' });
    const off = +u.searchParams.get('offset')!, lim = +u.searchParams.get('limit')!;
    const results = Array.from({ length: Math.max(0, Math.min(lim, total - off)) }, (_, i) => pago(off + i + 1));
    return json({ paging: { total, limit: lim, offset: off }, results });
  }) as typeof fetch;
  return { f, llamadas, maxVuelo: () => maxVuelo };
}

beforeEach(() => limpiarCacheMP());

test('MP: trae todas las páginas, en paralelo con concurrencia acotada, sin duplicar', async () => {
  const s = simulado(1000); // 10 páginas de 100
  const r = await traerPagos('tok-1234567890', new Date('2026-10-31T12:00:00Z'), { fetch: s.f, sinCache: true });
  assert.equal(r.userId, 7);
  assert.equal(r.pagos.length, 1000);
  assert.equal(new Set(r.pagos.map(p => p.id)).size, 1000);
  assert.equal(s.llamadas.filter(l => l.startsWith('/v1/payments/search')).length, 10);
  assert.ok(s.maxVuelo() <= 6, `concurrencia ${s.maxVuelo()}`); // 5 páginas + /users/me
  assert.ok(s.maxVuelo() >= 2);
});

test('MP: una sola página no pide más', async () => {
  const s = simulado(30);
  const r = await traerPagos('tok-1234567890', new Date(), { fetch: s.f, sinCache: true });
  assert.equal(r.pagos.length, 30);
  assert.equal(s.llamadas.length, 2);
});

test('MP: 401 da ErrorMP con status y no filtra el token', async () => {
  const f = (async () => json({ message: 'unauthorized' }, 401)) as typeof fetch;
  await assert.rejects(() => cuentaMP('APP_USR-secreto-123456', { fetch: f }), (e: unknown) => e instanceof ErrorMP && e.status === 401 && !e.message.includes('secreto'));
  await assert.rejects(() => traerPagos('APP_USR-secreto-123456', new Date(), { fetch: f, sinCache: true }), (e: unknown) => e instanceof ErrorMP && e.status === 401);
});

test('MP: reintenta una vez ante 429/5xx y no reintenta ante 4xx', async () => {
  const s = simulado(30, { '/users/me': [503], '/v1/payments/search0': [429] });
  const r = await traerPagos('tok-1234567890', new Date(), { fetch: s.f, sinCache: true, esperaReintentoMs: 0 });
  assert.equal(r.pagos.length, 30);
  assert.equal(s.llamadas.filter(l => l === '/users/me').length, 2);
  assert.equal(s.llamadas.filter(l => l === '/v1/payments/search0').length, 2);
  const malo = simulado(30, { '/users/me': [503, 503] });
  await assert.rejects(() => cuentaMP('tok-1234567890', { fetch: malo.f, esperaReintentoMs: 0 }), (e: unknown) => e instanceof ErrorMP && e.status === 503);
  assert.equal(malo.llamadas.length, 2); // 1 intento + 1 reintento
  const prohibido = simulado(30, { '/users/me': [403] });
  await assert.rejects(() => cuentaMP('tok-1234567890', { fetch: prohibido.f, esperaReintentoMs: 0 }));
  assert.equal(prohibido.llamadas.length, 1);
});

test('MP: caché de 60 s por token', async () => {
  const s = simulado(30);
  let t = 1_000_000;
  const op = { fetch: s.f, ahora: () => t };
  await traerPagos('tok-AAAAAAAAAA', new Date(), op);
  const n = s.llamadas.length;
  await traerPagos('tok-AAAAAAAAAA', new Date(), op);
  assert.equal(s.llamadas.length, n, 'segunda llamada sale del caché');
  await traerPagos('tok-BBBBBBBBBB', new Date(), op);
  assert.equal(s.llamadas.length, n * 2, 'otro token no comparte caché');
  t += 61_000;
  await traerPagos('tok-AAAAAAAAAA', new Date(), op);
  assert.equal(s.llamadas.length, n * 3, 'vencido a los 60 s');
});

test('MP: un error no queda cacheado', async () => {
  const s = simulado(30, { '/users/me': [401] });
  const op = { fetch: s.f, esperaReintentoMs: 0 };
  await assert.rejects(() => traerPagos('tok-CCCCCCCCCC', new Date(), op));
  const r = await traerPagos('tok-CCCCCCCCCC', new Date(), op);
  assert.equal(r.pagos.length, 30);
});

test('MP: con token usa solo la API; sin token, la simulación', async () => {
  const s = simulado(30);
  const sim = async () => ({ userId: 1, pagos: [pago(999)] });
  const a = await movimientosMP('tok-DDDDDDDDDD', sim, { fetch: s.f, sinCache: true });
  assert.equal(a.origen, 'api');
  assert.equal(a.movs.length, 30);
  const b = await movimientosMP(undefined, sim, { fetch: s.f });
  assert.equal(b.origen, 'simulacion');
  assert.equal(b.movs.length, 1);
});
