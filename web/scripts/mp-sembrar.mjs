// Siembra cobros de prueba aprobados en el sandbox de Mercado Pago (MLA) via Orders API.
// Uso: node scripts/mp-sembrar.mjs [cantidad=5]   (desde web/)
// Requiere MP_ACCESS_TOKEN y MP_PUB_KEY en ../.env (credenciales de prueba de la app).
// Idempotente: cada cobro i usa una X-Idempotency-Key fija, re-ejecutar no duplica.
import fs from 'node:fs';

const env = {};
for (const l of fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const TOKEN = env.MP_ACCESS_TOKEN, PK = env.MP_PUB_KEY;
if (!TOKEN || !PK) { console.error('Faltan MP_ACCESS_TOKEN / MP_PUB_KEY en ../.env'); process.exit(1); }

const COBROS = [
  ['Mesa ratona de paraíso - cobro QR', 185000],
  ['Seña 50% placard de pino 3 cuerpos', 540000],
  ['Silla de algarrobo x4 - transferencia QR', 320000],
  ['Reparación de puerta de cedro', 85000],
  ['Biblioteca a medida de petiribí - saldo', 1100000],
  ['Escritorio de eucalipto con cajonera', 460000],
  ['Cama de dos plazas de lenga - seña', 690000],
  ['Alacena de cocina laqueada - cobro QR', 275000],
];
const cant = Math.max(1, parseInt(process.argv[2] ?? '5', 10) || 5);
const TAG = 'haka-carpinteria-seed-v1';

async function api(method, path, body, headers = {}, auth = true) {
  const r = await fetch('https://api.mercadopago.com' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer ' + TOKEN } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: r.status, json };
}

async function cardToken() {
  const r = await api('POST', '/v1/card_tokens?public_key=' + encodeURIComponent(PK), {
    card_number: '5031755734530604', security_code: '123', expiration_month: 11, expiration_year: 2030,
    cardholder: { name: 'APRO', identification: { type: 'DNI', number: '12345678' } },
  }, {}, false);
  if (!r.json.id) throw new Error('card_token ' + r.status + ' ' + JSON.stringify(r.json).slice(0, 200));
  return r.json.id;
}

async function main() {
  for (let i = 0; i < cant; i++) {
    const [desc, base] = COBROS[i % COBROS.length];
    const monto = (base + Math.floor(i / COBROS.length) * 5000).toFixed(2);
    const ref = `${TAG}-${i + 1}`;
    const token = await cardToken();
    const r = await api('POST', '/v1/orders', {
      type: 'online', processing_mode: 'automatic', total_amount: monto, external_reference: ref,
      description: desc, payer: { email: 'cliente.carpinteria@testuser.com' },
      transactions: { payments: [{ amount: monto, payment_method: { id: 'master', type: 'credit_card', token, installments: 1 } }] },
    }, { 'X-Idempotency-Key': ref });
    const p = r.json.transactions?.payments?.[0];
    console.log(`${i + 1}. ${desc} $${monto} -> HTTP ${r.status} orden ${r.json.id ?? '-'} ${r.json.status ?? r.json.message ?? ''}/${r.json.status_detail ?? ''} pago ${p?.id ?? '-'}`);
  }
  const s = await api('GET', '/v1/payments/search?sort=date_created&criteria=desc&limit=20');
  console.log('\nÚltimos pagos (search):');
  for (const p of s.json.results ?? []) console.log(`  ${p.id} ${p.status}/${p.status_detail} $${p.transaction_amount} ${p.external_reference ?? ''} ${p.description ?? ''}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
