// Parsers determinísticos: extracto bancario (CSV home banking), reportes de Mercado Pago y "Mis Comprobantes" de ARCA.
// Los montos nunca pasan por el LLM.
//
// FORMATOS SOPORTADOS Y SU ESTADO DE VERIFICACIÓN (ninguno contrastado con un export real):
//  - Extracto con columnas Débito/Crédito/Saldo (demo public/demo): fixture propio, sin verificar con un export real.
//  - Reporte de Mercado Pago "dinero en cuenta / release" (RELEASE_DATE, TRANSACTION_TYPE, REFERENCE_ID,
//    TRANSACTION_NET_AMOUNT, PARTIAL_BALANCE) y "settlement" (TRANSACTION_DATE, SETTLEMENT_NET_AMOUNT…): SUPOSICIÓN
//    armada desde la documentación y ejemplos públicos.
//  - Export de actividad de Mercado Pago en español (Fecha;Descripción;Monto;Saldo): SUPOSICIÓN.
//  - Extractos tipo Banco Nación (una columna Importe con signo, filas "SALDO ANTERIOR", títulos previos): SUPOSICIÓN.
//  - "Mis Comprobantes" de ARCA: fixture propio, sin verificar con un export real.
// Ante un banco nuevo, el primer paso es mirar el CSV real y ajustar encabezados.

export type Movimiento = { fecha: string; desc: string; monto: number; saldo?: number };
export type Comprobante = {
  fecha: string; tipo: string; numero: string; cuit: string; nombre: string; total: number;
  esNotaCredito: boolean;
};

// Número en formato argentino ("1.234.567,89") o internacional ("1234567.89" / "1,234.56").
// Criterio (el separador decimal es ambiguo cuando falta uno de los dos):
//  - con coma y punto, el que aparece ÚLTIMO es el decimal ("1.234,56" → AR; "1,234.56" → internacional);
//  - solo coma → coma decimal ("1234,5");
//  - solo puntos: varios puntos ("1.234.567") son miles; UN solo punto es decimal ("1500.00" → 1500;
//    "1.500" → 1,5 y NO 1500). La ambigüedad se resuelve a favor del formato internacional porque los exports de
//    Mercado Pago usan punto decimal; un banco que imprima "1.500" para mil quinientos pesos saldría mal.
// Negativos: "-1.500,00", "(1.500,00)" y "1.500,00-". Cualquier texto no numérico da 0.
export function num(s: string | undefined): number {
  if (!s) return 0;
  let t = s.trim().replace(/[$\s"]|ARS/gi, '');
  if (!t) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(t)) { neg = true; t = t.slice(1, -1); }
  if (t.endsWith('-')) { neg = true; t = t.slice(0, -1); }
  const c = t.lastIndexOf(','), d = t.lastIndexOf('.');
  if (c >= 0 && d >= 0) t = d > c ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  else if (c >= 0) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g)?.length ?? 0) > 1) t = t.replace(/\./g, '');
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

// dd/mm/yyyy, dd/mm/yy (→ 20yy) o yyyy-mm-dd[Thh:mm:ss…] → yyyy-mm-dd
export function fecha(s: string): string {
  const t = s.trim().replace(/"/g, '');
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?!\d)/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const c = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})(?!\d)/);
  if (c) return `20${c[3]}-${c[2].padStart(2, '0')}-${c[1].padStart(2, '0')}`;
  return '';
}

// Parte el CSV en filas. El separador (; o ,) se decide con la línea de encabezado (la primera que menciona
// fecha/date), no con la primera línea del archivo, porque algunos bancos anteponen títulos o datos de la cuenta.
function filas(texto: string): string[][] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lineas.length) return [];
  const enc = lineas.find(l => /fecha|date/i.test(l)) ?? lineas[0];
  const sep = (enc.match(/;/g)?.length ?? 0) >= (enc.match(/,/g)?.length ?? 0) ? ';' : ',';
  return lineas.map(l => {
    const out: string[] = []; let cur = ''; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === sep && !q) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out.map(c => c.trim());
  });
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/_/g, ' ');
const col = (hdr: string[], ...claves: string[]) => hdr.findIndex(h => claves.some(c => norm(h).includes(c)));
// Como col, pero respeta la prioridad de las claves (la primera clave que matchee gana).
const colPrio = (hdr: string[], ...claves: string[]) => {
  for (const c of claves) { const i = hdr.findIndex(h => norm(h).includes(c)); if (i >= 0) return i; }
  return -1;
};

// Boleta: obligación con vencimiento (impuesto, servicio, alquiler, cuota). Nómina: sueldos y cargas del mes.
export type Boleta = { vencimiento: string; concepto: string; emisor: string; importe: number };
export type Nomina = { empleado: string; neto: number; cargas: number; fechaPago: string; vencCargas: string };

type ColsExtracto = { i: number; cF: number; cD: number[]; cDeb: number; cCred: number; cImp: number; cS: number; mp: boolean };

// Busca la fila de encabezado de un extracto (puede haber títulos antes) y mapea sus columnas. Devuelve null si
// no hay fecha + montos (+ saldo, salvo en reportes de Mercado Pago, que no siempre lo traen).
function localizarExtracto(f: string[][]): ColsExtracto | null {
  for (let i = 0; i < f.length; i++) {
    const hdr = f[i];
    const cF = colPrio(hdr, 'release date', 'settlement date', 'fecha', 'transaction date', 'date');
    if (cF < 0) continue;
    const cDeb = col(hdr, 'debito'), cCred = col(hdr, 'credito');
    const cImp = colPrio(hdr, 'net amount', 'importe', 'monto', 'amount');
    const cS = col(hdr, 'saldo', 'balance');
    const mp = hdr.some(h => /net amount|release date|settlement/.test(norm(h)));
    const conDebCred = cDeb >= 0 && cCred >= 0;
    if (!conDebCred && cImp < 0) continue;
    if (cS < 0 && !mp) continue;
    // descripción: columnas descriptivas; en reportes de MP se agregan tipo de transacción y referencia
    const cD = [col(hdr, 'descrip', 'concepto', 'detalle'), ...(mp ? [colPrio(hdr, 'transaction type', 'tipo'), colPrio(hdr, 'reference id', 'source id')] : [])].filter(x => x >= 0);
    return { i, cF, cD, cDeb, cCred, cImp: conDebCred ? -1 : cImp, cS, mp };
  }
  return null;
}

// Detecta el tipo de archivo por sus encabezados.
export function detectar(texto: string): 'extracto' | 'recibidos' | 'emitidos' | 'boletas' | 'nomina' | 'desconocido' {
  const h = norm(texto.slice(0, 2000));
  if (h.includes('empleado') && h.includes('neto')) return 'nomina';
  if (h.includes('vencimiento') && h.includes('importe') && !h.includes('saldo')) return 'boletas';
  if (h.includes('denominacion emisor')) return 'recibidos';
  if (h.includes('denominacion receptor')) return 'emitidos';
  if (localizarExtracto(filas(texto.slice(0, 20000)))) return 'extracto';
  return 'desconocido';
}

const SALDO_PREVIO = /saldo\s+(anterior|inicial|final|al\b)/i;

// Extracto bancario. Sin encabezado reconocible devuelve [] (no lanza). Soporta Débito/Crédito separados o una sola
// columna con signo (Importe/Monto). Se descartan filas de "SALDO ANTERIOR/INICIAL/FINAL" y encabezados repetidos
// (filas sin fecha válida). Si el archivo viene de más nuevo a más viejo se invierte para dejarlo cronológico.
export function parseExtracto(texto: string): Movimiento[] {
  const f = filas(texto);
  const c = localizarExtracto(f);
  if (!c) return [];
  const movs = f.slice(c.i + 1).filter(r => !r.some(x => SALDO_PREVIO.test(x))).map(r => {
    const desc = c.cD.map(k => r[k] ?? '').filter(Boolean).join(' ');
    const monto = c.cImp >= 0 ? num(r[c.cImp]) : Math.abs(num(r[c.cCred])) - Math.abs(num(r[c.cDeb]));
    // En reportes de MP la descripción imita la de un extracto para que categorizar() la clasifique: los ingresos
    // son acreditaciones de Mercado Pago (ventas); las salidas llevan un prefijo neutro.
    const d = c.mp ? `${monto >= 0 ? 'ACRED MERCADO PAGO' : 'SALIDA MP'} ${desc}`.trim() : desc;
    const saldo = c.cS >= 0 && (r[c.cS] ?? '') !== '' ? num(r[c.cS]) : undefined;
    return { fecha: fecha(r[c.cF] ?? ''), desc: d, monto, saldo };
  }).filter(m => m.fecha && m.monto !== 0);
  if (movs.length > 1 && movs[0].fecha > movs[movs.length - 1].fecha) movs.reverse();
  return movs;
}

export function parseComprobantes(texto: string): Comprobante[] {
  const f = filas(texto);
  const i = f.findIndex(r => r.some(c => norm(c) === 'fecha'));
  if (i < 0) return [];
  const hdr = f[i];
  const cF = col(hdr, 'fecha'), cT = col(hdr, 'tipo'), cN = col(hdr, 'numero desde'), cC = col(hdr, 'nro. doc');
  const cNom = col(hdr, 'denominacion'), cTot = col(hdr, 'imp. total', 'importe total');
  return f.slice(i + 1).map(r => {
    const tipo = r[cT] ?? '';
    const nc = /nota de cr/i.test(tipo);
    // ARCA exporta las notas de crédito con monto positivo: las restamos acá.
    const total = Math.abs(num(r[cTot])) * (nc ? -1 : 1);
    return { fecha: fecha(r[cF] ?? ''), tipo, numero: r[cN] ?? '', cuit: (r[cC] ?? '').replace(/\D/g, ''), nombre: r[cNom] ?? '', total, esNotaCredito: nc };
  }).filter(c => c.fecha && c.total !== 0);
}

export function parseBoletas(texto: string): Boleta[] {
  const f = filas(texto);
  const i = f.findIndex(r => r.some(c => norm(c).includes('vencimiento')));
  if (i < 0) return [];
  const hdr = f[i];
  const cV = col(hdr, 'vencimiento'), cC = col(hdr, 'concepto', 'descrip', 'detalle'), cE = col(hdr, 'emisor', 'entidad', 'proveedor'), cI = col(hdr, 'importe', 'monto', 'total');
  return f.slice(i + 1).map(r => ({
    vencimiento: fecha(r[cV] ?? ''), concepto: r[cC] ?? '', emisor: cE >= 0 ? r[cE] ?? '' : '', importe: Math.abs(num(r[cI])),
  })).filter(b => b.vencimiento && b.importe > 0);
}

// Columnas: Empleado; Neto; Cargas sociales; Fecha de pago; [Vencimiento cargas]. Si falta una fecha, se
// asume sueldo el día 5 y F.931 el día 10 del mes siguiente al último que se haya pagado (aprox.).
export function parseNomina(texto: string): Nomina[] {
  const f = filas(texto);
  const i = f.findIndex(r => r.some(c => norm(c).includes('empleado')));
  if (i < 0) return [];
  const hdr = f[i];
  const cE = col(hdr, 'empleado'), cN = col(hdr, 'neto'), cCar = col(hdr, 'cargas'), cP = col(hdr, 'fecha de pago', 'pago'), cVC = col(hdr, 'venc');
  return f.slice(i + 1).map(r => ({
    empleado: r[cE] ?? '', neto: Math.abs(num(r[cN])), cargas: cCar >= 0 ? Math.abs(num(r[cCar])) : 0,
    fechaPago: cP >= 0 ? fecha(r[cP] ?? '') : '', vencCargas: cVC >= 0 ? fecha(r[cVC] ?? '') : '',
  })).filter(n => n.empleado && n.neto > 0);
}
