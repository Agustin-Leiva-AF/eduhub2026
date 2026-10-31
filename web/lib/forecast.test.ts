import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { num, fecha, parseExtracto, parseComprobantes, detectar } from './parse';
import { pronosticar } from './forecast';
import { recomendar } from './advice';
import { contexto } from './openarg';

const leer = (f: string) => fs.readFileSync(`public/demo/${f}`, 'utf8');

test('números y fechas en formato argentino', () => {
  assert.equal(num('1.234.567,89'), 1234567.89);
  assert.equal(num('1234.5'), 1234.5);
  assert.equal(fecha('04/05/2026'), '2026-05-04');
});

test('detecta y parsea los tres archivos de la demo', () => {
  assert.equal(detectar(leer('extracto_banco_esquina.csv')), 'extracto');
  assert.equal(detectar(leer('mis_comprobantes_recibidos.csv')), 'recibidos');
  assert.equal(detectar(leer('mis_comprobantes_emitidos.csv')), 'emitidos');
  const m = parseExtracto(leer('extracto_banco_esquina.csv'));
  // el saldo corrido del extracto es consistente con la suma de movimientos
  const s0 = m[0].saldo! - m[0].monto;
  assert.ok(Math.abs(s0 + m.reduce((a, x) => a + x.monto, 0) - m[m.length - 1].saldo!) < 1);
});

test('notas de crédito restan', () => {
  const csv = 'Fecha;Tipo;Número Desde;Nro. Doc. Emisor;Denominación Emisor;Imp. Total\n01/10/2026;3 - Nota de Crédito A;5;30712345671;PROV SA;1.000,00\n';
  assert.equal(parseComprobantes(csv)[0].total, -1000);
});

test('el pronóstico de la demo detecta el hueco de enero y aprende plazos', () => {
  const m = parseExtracto(leer('extracto_banco_esquina.csv'));
  const r = parseComprobantes(leer('mis_comprobantes_recibidos.csv'));
  const e = parseComprobantes(leer('mis_comprobantes_emitidos.csv'));
  const ctx = contexto();
  const p = pronosticar(m, r, e, { ipcMensual: ctx.ipcMensual });
  assert.equal(p.serie.length, 120);
  assert.ok(p.hueco && p.hueco.inicio.startsWith('2027-01'), `hueco: ${JSON.stringify(p.hueco)}`);
  assert.equal(p.contrapartes.find(c => c.nombre.startsWith('FRIGORIFICO'))!.plazoDias, 21);
  assert.equal(p.contrapartes.find(c => c.nombre.startsWith('GRUPO ANDINO'))!.plazoDias, 90);
  const rec = recomendar(p, m, r, e, ctx);
  assert.ok(rec.opciones.length >= 2);
  assert.ok(rec.opciones.every(o => o.costo >= 0));
});
