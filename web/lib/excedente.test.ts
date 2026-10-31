import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularExcedente } from './excedente';
import { sumar, type Dia, type Evento, type Pronostico } from './forecast';
import { contexto } from './openarg';

const ctx = contexto();
const HOY = '2026-11-01';

// Pronóstico sintético: saldos diarios dados (se repite el último hasta 120 días) y sueldos mensuales de 1.000.000.
function pron(saldoInicial: number, saldos: number[], salidaDiaria = 0): Pronostico {
  const serie: Dia[] = Array.from({ length: 120 }, (_, i) => ({ fecha: sumar(HOY, i + 1), saldo: saldos[Math.min(i, saldos.length - 1)], entradas: 0, salidas: salidaDiaria }));
  const eventos: Evento[] = [0, 1, 2, 3].map(k => ({ fecha: sumar(HOY, 5 + 30 * k), concepto: 'Sueldos', categoria: 'sueldos', monto: -1_000_000, origen: 'recurrente' }));
  return { hoy: HOY, saldoInicial, ipcMensual: ctx.ipcMensual, serie, eventos, horizontes: [], hueco: null, huecos: [], aprendizajes: [], contrapartes: [], historia: [] };
}

test('caja holgada: excedente = mínimo - colchón, ventana de 120 días y rendimiento', () => {
  const e = calcularExcedente(pron(10_000_000, [10_000_000]), ctx);
  assert.equal(e.hay, true);
  assert.ok(e.colchon >= 1_000_000 && e.colchon < 2_000_000, `colchón ${e.colchon}`);
  assert.equal(e.monto, 10_000_000 - e.colchon);
  assert.equal(e.ventana!.dias, 120);
  assert.equal(e.ventana!.desde, HOY);
  assert.ok(e.clases.find(c => c.id === 'plazo_fijo')!.encaja);
  assert.ok(e.rendimiento && e.rendimiento.pesos > 0 && e.rendimiento.realPesos < e.rendimiento.pesos);
  assert.equal(e.rendimiento!.pesos, Math.round(e.monto * ctx.tnaPlazoFijo / 100 * 120 / 365));
  assert.ok(e.clases.every(c => !/\b(banco|brubank|galicia|santander)\b/i.test(c.nombre)));
});

test('hueco cercano: la ventana termina antes y el plazo fijo no encaja', () => {
  const saldos = [...Array(10).fill(6_000_000), 0];
  const e = calcularExcedente(pron(6_000_000, saldos), ctx);
  assert.equal(e.hay, true);
  assert.equal(e.ventana!.dias, 10);
  assert.equal(e.ventana!.hasta, sumar(HOY, 10));
  assert.equal(e.monto, 6_000_000 - e.colchon);
  assert.equal(e.clases.find(c => c.id === 'plazo_fijo')!.encaja, false);
  assert.equal(e.clases.find(c => c.id === 'caucion')!.encaja, true);
  assert.equal(e.clases.find(c => c.id === 'caucion')!.tnaRef, null);
  assert.match(e.aviso, /ventana es corta/);
});

test('sin excedente: caja por debajo de la reserva', () => {
  const e = calcularExcedente(pron(500_000, [500_000]), ctx);
  assert.equal(e.hay, false);
  assert.equal(e.monto, 0);
  assert.equal(e.ventana, null);
  assert.equal(e.rendimiento, null);
  assert.ok(e.motivo && e.motivo.includes('reserva'));
  assert.ok(e.clases.every(c => !c.encaja));
});

test('rendimiento real negativo: la nota lo dice', () => {
  const e = calcularExcedente(pron(10_000_000, [10_000_000]), { ...ctx, ipcMensual: 0.05 });
  assert.ok(e.rendimiento!.realPesos < 0);
  assert.ok(e.clases.some(c => c.nota.includes('poder de compra')));
});
