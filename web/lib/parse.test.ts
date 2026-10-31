import { test } from 'node:test';
import assert from 'node:assert/strict';
import { num, fecha, detectar, parseExtracto, parseComprobantes, parseBoletas, parseNomina } from './parse';
import { categorizar } from './categorias';
import { procesarExtras } from './extras';

test('num: criterio de separadores documentado', () => {
  assert.equal(num('1.234.567,89'), 1234567.89);
  assert.equal(num('1,234.56'), 1234.56);
  assert.equal(num('1500.00'), 1500);
  assert.equal(num('1.234.567'), 1234567);
  assert.equal(num('1.500'), 1.5); // ambiguo: se interpreta como decimal internacional
  assert.equal(num('-$ 1.500,50'), -1500.5);
  assert.equal(num('(2.000,00)'), -2000);
  assert.equal(num('2.000,00-'), -2000);
  assert.equal(num('abc'), 0);
});

test('fecha: ISO con hora, dd/mm/yy y dd/mm/yyyy', () => {
  assert.equal(fecha('2026-10-01T10:00:00.000-03:00'), '2026-10-01');
  assert.equal(fecha('05/10/26'), '2026-10-05');
  assert.equal(fecha('5-10-2026 12:30'), '2026-10-05');
  assert.equal(fecha('basura'), '');
});

test('sin encabezado: no revienta y devuelve vacío', () => {
  for (const t of ['', 'hola\nmundo', 'a;b;c\n1;2;3']) {
    assert.deepEqual(parseExtracto(t), []);
    assert.deepEqual(parseComprobantes(t), []);
    assert.deepEqual(parseBoletas(t), []);
    assert.deepEqual(parseNomina(t), []);
    assert.equal(detectar(t), 'desconocido');
  }
});

const RELEASE = [
  'RELEASE_DATE,SOURCE_ID,EXTERNAL_REFERENCE,TRANSACTION_TYPE,REFERENCE_ID,TRANSACTION_NET_AMOUNT,PARTIAL_BALANCE',
  '2026-10-02T09:15:00.000-03:00,222,,PAYOUT,222,-1000.50,10499.50',
  '2026-10-01T10:00:00.000-03:00,111,,SETTLEMENT,111,1500.00,11500.00',
].join('\n');

test('Mercado Pago release: encabezados en inglés, ISO con hora, punto decimal, orden descendente', () => {
  assert.equal(detectar(RELEASE), 'extracto');
  const m = parseExtracto(RELEASE);
  assert.equal(m.length, 2);
  assert.deepEqual(m.map(x => x.fecha), ['2026-10-01', '2026-10-02']); // se invirtió a cronológico
  assert.equal(m[0].monto, 1500);
  assert.equal(m[1].monto, -1000.5);
  assert.equal(m[1].saldo, 10499.5);
  assert.equal(categorizar(m[0].desc, m[0].monto), 'ventas');
  assert.ok(m[0].desc.includes('SETTLEMENT'));
});

test('Mercado Pago settlement: usa el neto liquidado y la fecha de liquidación, sin saldo', () => {
  const t = 'TRANSACTION_DATE,SETTLEMENT_DATE,TRANSACTION_TYPE,TRANSACTION_AMOUNT,FEE_AMOUNT,SETTLEMENT_NET_AMOUNT\n2026-10-01T10:00:00.000-03:00,2026-10-15T00:00:00.000-03:00,SETTLEMENT,1000.00,60.00,940.00\n';
  assert.equal(detectar(t), 'extracto');
  const m = parseExtracto(t);
  assert.equal(m.length, 1);
  assert.equal(m[0].fecha, '2026-10-15');
  assert.equal(m[0].monto, 940);
  assert.equal(m[0].saldo, undefined);
});

test('Mercado Pago actividad en español: Fecha;Descripción;Monto;Saldo', () => {
  const t = 'Fecha;Descripción;Monto;Saldo\n01/10/2026;Cobro QR;1.500,00;11.500,00\n02/10/2026;Pago a proveedor;-1.000,50;10.499,50\n';
  assert.equal(detectar(t), 'extracto');
  const m = parseExtracto(t);
  assert.deepEqual(m.map(x => x.monto), [1500, -1000.5]);
  assert.equal(m[1].saldo, 10499.5);
});

test('extracto tipo BNA: títulos previos, SALDO ANTERIOR, una columna Importe con signo, año de 2 dígitos', () => {
  const t = [
    'Banco de la Nación Argentina;;;',
    'Cuenta Corriente 123/456;;;',
    'Fecha;Concepto;Importe;Saldo',
    '30/09/26;SALDO ANTERIOR;;5.000,00',
    '01/10/26;CRED TRANSF;2.500,00;7.500,00',
    '02/10/26;DEB IMP LEY 25413;-15,00;7.485,00',
    'Fecha;Concepto;Importe;Saldo',
    '03/10/26;SALDO FINAL;;7.485,00',
  ].join('\n');
  assert.equal(detectar(t), 'extracto');
  const m = parseExtracto(t);
  assert.equal(m.length, 2);
  assert.deepEqual(m.map(x => x.monto), [2500, -15]);
  assert.equal(m[0].fecha, '2026-10-01');
  assert.equal(m[1].saldo, 7485);
});

test('extras de fotos: se validan y se mapean a recibidos/emitidos', () => {
  const c = { es_comprobante: true, tipo: 'Factura A', fecha_emision: '2026-10-20', fecha_vencimiento: '', cuit_emisor: '30-71234567-1', razon_social_emisor: 'PROV SA', numero: '0001-00000010', total: 12345.5 };
  const r = procesarExtras(JSON.stringify([{ lado: 'recibido', comprobante: c }, { lado: 'emitido', comprobante: { ...c, tipo: 'Factura B' } }]));
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.recibidos.length, 1);
    assert.equal(r.recibidos[0].cuit, '30712345671');
    assert.equal(r.emitidos.length, 1);
    assert.equal(r.emitidos[0].total, 12345.5);
  }
  assert.equal(procesarExtras('no json').ok, false);
  assert.equal(procesarExtras([{ lado: 'recibido', comprobante: { ...c, fecha_emision: '20/10/2026' } }]).ok, false);
  assert.equal(procesarExtras(Array(51).fill({ lado: 'recibido', comprobante: c })).ok, false);
});
