import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { num, fecha, parseExtracto, parseComprobantes, parseBoletas, parseNomina, detectar } from './parse';
import { alertar } from './alertas';
import { mensajesPendientes, telefonoValido } from './avisos';
import { pronosticar } from './forecast';
import { recomendar } from './advice';
import { contexto } from './openarg';
import { mapearPagos } from './mercadopago';
import { categorizar } from './categorias';

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

test('boletas y nómina cargadas entran al flujo y generan alertas', () => {
  const m = parseExtracto(leer('extracto_banco_esquina.csv'));
  const r = parseComprobantes(leer('mis_comprobantes_recibidos.csv'));
  const e = parseComprobantes(leer('mis_comprobantes_emitidos.csv'));
  assert.equal(detectar(leer('boletas_vencimientos.csv')), 'boletas');
  assert.equal(detectar(leer('nomina_octubre.csv')), 'nomina');
  const boletas = parseBoletas(leer('boletas_vencimientos.csv'));
  const nomina = parseNomina(leer('nomina_octubre.csv'));
  assert.equal(boletas.length, 6);
  assert.equal(nomina.length, 8);
  const ipcMensual = contexto().ipcMensual;
  const base = pronosticar(m, r, e, { ipcMensual });
  const p = pronosticar(m, r, e, { ipcMensual, boletas, nomina });
  const iva = p.eventos.find(x => x.concepto.startsWith('IVA octubre'))!;
  assert.equal(iva.monto, -1380000);
  // la nómina cargada reemplaza a los sueldos detectados: un solo pago de sueldos en noviembre
  assert.equal(p.eventos.filter(x => x.categoria === 'sueldos' && x.fecha.startsWith('2026-11')).length, 1);
  assert.ok(p.horizontes[0].minimo < base.horizontes[0].minimo, 'las boletas bajan el mínimo de caja');
  const al = alertar(p, boletas, { ventana: 30 });
  assert.equal(al.resumen.vencidas, 1); // IIBB del 27/10
  assert.ok(al.alertas.some(a => a.tipo === 'vence' && a.titulo.includes('IVA octubre')));
  assert.ok(al.resumen.vence30 >= 1380000);
  assert.ok(alertar(p, boletas).alertas.every(a => a.tipo !== 'vence' || a.fecha! <= '2026-11-13'), 'la ventana por defecto es de 14 días');
});

test('Mercado Pago: la pyme simulada se mapea, categoriza y concilia con ARCA', () => {
  const mpd = (f: string) => fs.readFileSync(`public/demo/mp/${f}`, 'utf8');
  const fx = JSON.parse(mpd('mp_pagos.json'));
  const movs = mapearPagos(fx.pagos, fx.userId);
  assert.ok(movs.length > 300);
  assert.ok(!movs.some(m => m.desc.includes('undefined')));
  const cat = (re: RegExp) => movs.filter(m => re.test(m.desc)).map(m => categorizar(m.desc, m.monto));
  assert.ok(cat(/ACRED MERCADO PAGO/).every(c => c === 'ventas'));
  assert.ok(cat(/HABERES NOMINA/).every(c => c === 'sueldos'));
  assert.ok(cat(/F931/).every(c => c === 'cargas_sociales'));
  assert.ok(cat(/EPEC|ECOGAS|AGUAS CORDOBESAS|TELECOM/).every(c => c === 'servicios'));
  assert.ok(cat(/ALQUILER/).every(c => c === 'alquiler'));
  assert.ok(cat(/IIBB|IVA DDJJ|TASA municipal/).every(c => c === 'impuestos'));
  assert.ok(cat(/MADERAS|ASERRADERO|HERRAJES|PINTURAS/).every(c => c === 'proveedores'));
  assert.ok(cat(/CARGA DE SALDO/).every(c => c === 'otros'));
  const neto = mapearPagos([{ id: 1, status: 'approved', date_created: '2026-10-01T10:00:00.000-03:00', transaction_amount: 1000, transaction_details: { net_received_amount: 940 }, collector_id: 1 }], 1);
  assert.deepEqual(neto.map(m => m.monto), [940]);
  const rec = parseComprobantes(mpd('mis_comprobantes_recibidos.csv')), emi = parseComprobantes(mpd('mis_comprobantes_emitidos.csv'));
  const nomina = parseNomina(mpd('nomina_octubre.csv')), boletas = parseBoletas(mpd('boletas_vencimientos.csv'));
  assert.equal(nomina.length, 5);
  const p = pronosticar(movs, rec, emi, { ipcMensual: contexto().ipcMensual, boletas, nomina });
  // las facturas concilian con los pagos: se aprende un plazo por contraparte
  assert.ok(p.contrapartes.length >= 8);
  assert.ok(p.contrapartes.filter(c => c.plazoDias > 0).length === p.contrapartes.length);
  assert.ok(p.aprendizajes.length >= 4);
  assert.ok(p.serie.length > 100);
});
