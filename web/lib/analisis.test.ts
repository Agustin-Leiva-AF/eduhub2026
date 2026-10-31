import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pronosticar } from './forecast';
import { recomendar } from './advice';
import { alertar } from './alertas';
import { calcularExcedente } from './excedente';
import { contexto } from './openarg';
import { parseExtracto } from './parse';
import { procesarManual } from './manual';
import { armarDashboard } from './dashboard';
import { mensajeReglas } from './ia';

const leer = (f: string) => fs.readFileSync(`public/demo/${f}`, 'utf8');
const ctx = contexto();
const op = { ipcMensual: ctx.ipcMensual };
const comp = (fecha: string, total: number) => ({ fecha, tipo: 'Factura A', numero: '1', cuit: '30', nombre: 'PROVEEDOR SA', total, esNotaCredito: false });

test('pronosticar con saldo ancla: los movimientos posteriores se aplican encima', () => {
  const movs = [{ fecha: '2026-10-01', desc: 'X', monto: -500 }, { fecha: '2026-10-10', desc: 'Y', monto: 200 }, { fecha: '2026-10-20', desc: 'Z', monto: -50 }];
  const p = pronosticar(movs, [], [], { ...op, saldoInicial: { fecha: '2026-10-10', monto: 1000 } });
  assert.equal(p.saldoInicial, 950); // 1000 (al 10/10) - 50 (20/10); lo anterior o igual a la fecha del ancla no suma
  assert.equal(p.hoy, '2026-10-20');
});

test('pronosticar sin movimientos: solo saldo, no revienta y no aprende recurrentes', () => {
  const p = pronosticar([], [], [], { ...op, saldoInicial: { fecha: '2026-10-31', monto: 123456 } });
  assert.equal(p.hoy, '2026-10-31');
  assert.equal(p.saldoInicial, 123456);
  assert.equal(p.serie.length, 120);
  assert.equal(p.eventos.length, 0);
  assert.equal(p.serie[119].saldo, 123456);
  const r = recomendar(p, [], [], [], ctx);
  assert.ok(mensajeReglas(r).texto.length > 0);
  alertar(p, []); calcularExcedente(p, ctx);
  const d = armarDashboard(p, [], 'X', false);
  assert.equal(d.corte, '2026-10-31');
  assert.equal(d.mensual.length, 0);
  assert.equal(d.ventasMensuales, 0);
});

test('pronosticar con 1 movimiento, sin comprobantes ni boletas', () => {
  const movs = [{ fecha: '2026-10-15', desc: 'ACRED MERCADO PAGO', monto: 5000 }];
  const p = pronosticar(movs, [], [], op);
  assert.equal(p.hoy, '2026-10-15');
  assert.equal(p.saldoInicial, 5000);
  recomendar(p, movs, [], [], ctx); alertar(p, []); calcularExcedente(p, ctx);
  armarDashboard(p, movs, 'X', false);
});

test('pronosticar solo con facturas (sin movimientos ni saldo)', () => {
  const p = pronosticar([], [comp('2026-10-20', 1000)], [], { ...op, hoy: '2026-10-20' });
  assert.equal(p.saldoInicial, 0);
  assert.ok(p.eventos.some(e => e.monto === -1000));
});

test('movimientos sin saldo posteriores al extracto se suman al último saldo', () => {
  const m = parseExtracto(leer('extracto_banco_esquina.csv'));
  const base = pronosticar(m, [], [], op);
  const ultimo = m[m.length - 1].fecha;
  const p = pronosticar([...m, { fecha: ultimo, desc: 'MANUAL', monto: -777 }], [], [], op);
  assert.equal(p.saldoInicial, base.saldoInicial - 777);
});

test('manual: valida con zod y arma movimientos y comprobantes', () => {
  const ok = procesarManual(JSON.stringify({ saldo: { fecha: '2026-10-31', monto: 1000 }, movimientos: [{ fecha: '2026-11-02', desc: 'Alquiler', monto: -300 }, { fecha: '2026-11-03', desc: '', monto: 50 }], comprobantes: [{ lado: 'recibido', comprobante: { fecha_emision: '2026-10-30', cuit_emisor: '30712345671', razon_social_emisor: 'PROV', total: 900 } }] }));
  assert.ok(ok.ok);
  if (ok.ok) {
    assert.deepEqual(ok.manual.saldo, { fecha: '2026-10-31', monto: 1000 });
    assert.equal(ok.manual.movimientos.length, 2);
    assert.equal(ok.manual.movimientos[1].desc, 'Movimiento manual');
    assert.equal(ok.manual.recibidos.length, 1);
  }
  assert.ok(procesarManual({}).ok);
});

test('manual: rechaza fechas, montos y topes inválidos', () => {
  for (const malo of [
    'no es json',
    { saldo: { fecha: '31/10/2026', monto: 1 } },
    { saldo: { fecha: '2026-10-31', monto: 'mucho' } },
    { saldo: { fecha: '2026-10-31' } },
    { movimientos: [{ fecha: '2026-10-31', desc: 'x', monto: 0 }] },
    { movimientos: Array.from({ length: 501 }, () => ({ fecha: '2026-10-31', desc: 'x', monto: 1 })) },
    { comprobantes: [{ lado: 'recibido', comprobante: { fecha_emision: 'ayer', total: 5 } }] },
  ]) assert.equal(procesarManual(malo).ok, false, JSON.stringify(malo).slice(0, 60));
  assert.ok(procesarManual({ movimientos: Array.from({ length: 500 }, () => ({ fecha: '2026-10-31', desc: 'x', monto: 1 })) }).ok);
});

test('dashboard: eventos completos incluyen ventas', () => {
  const m = parseExtracto(leer('extracto_banco_esquina.csv'));
  const p = pronosticar(m, [], [], op);
  const d = armarDashboard(p, m, '', true);
  assert.equal(d.pyme, 'Mi pyme');
  assert.equal(d.demo, true);
  assert.equal(d.corte, p.hoy);
  assert.ok(d.eventos.some(e => e.categoria === 'ventas'));
  assert.ok(d.mensual.length > 3 && d.ventasMensuales > 0);
});
