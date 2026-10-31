// Parsers determinísticos: extracto bancario (CSV home banking) y "Mis Comprobantes" de ARCA.
// Los montos nunca pasan por el LLM.

export type Movimiento = { fecha: string; desc: string; monto: number; saldo?: number };
export type Comprobante = {
  fecha: string; tipo: string; numero: string; cuit: string; nombre: string; total: number;
  esNotaCredito: boolean;
};

// Número en formato argentino ("1.234.567,89") o internacional ("1234567.89").
export function num(s: string | undefined): number {
  if (!s) return 0;
  let t = s.trim().replace(/[$\s"]/g, '');
  if (!t) return 0;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

// dd/mm/yyyy o yyyy-mm-dd → yyyy-mm-dd
export function fecha(s: string): string {
  const t = s.trim().replace(/"/g, '');
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  return '';
}

function filas(texto: string): string[][] {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  const sep = (lineas[0].match(/;/g)?.length ?? 0) >= (lineas[0].match(/,/g)?.length ?? 0) ? ';' : ',';
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

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const col = (hdr: string[], ...claves: string[]) => hdr.findIndex(h => claves.some(c => norm(h).includes(c)));

// Detecta el tipo de archivo por sus encabezados.
export function detectar(texto: string): 'extracto' | 'recibidos' | 'emitidos' | 'desconocido' {
  const h = norm(texto.slice(0, 2000));
  if (h.includes('denominacion emisor')) return 'recibidos';
  if (h.includes('denominacion receptor')) return 'emitidos';
  if (h.includes('saldo') && (h.includes('debito') || h.includes('credito') || h.includes('importe'))) return 'extracto';
  return 'desconocido';
}

export function parseExtracto(texto: string): Movimiento[] {
  const f = filas(texto);
  const i = f.findIndex(r => r.some(c => norm(c).startsWith('fecha')));
  const hdr = f[i];
  const cF = col(hdr, 'fecha'), cD = col(hdr, 'descrip', 'concepto', 'detalle');
  const cDeb = col(hdr, 'debito'), cCred = col(hdr, 'credito'), cImp = col(hdr, 'importe', 'monto'), cS = col(hdr, 'saldo');
  return f.slice(i + 1).map(r => ({
    fecha: fecha(r[cF] ?? ''),
    desc: r[cD] ?? '',
    monto: cImp >= 0 ? num(r[cImp]) : num(r[cCred]) - num(r[cDeb]),
    saldo: cS >= 0 ? num(r[cS]) : undefined,
  })).filter(m => m.fecha && m.monto !== 0);
}

export function parseComprobantes(texto: string): Comprobante[] {
  const f = filas(texto);
  const i = f.findIndex(r => r.some(c => norm(c) === 'fecha'));
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
