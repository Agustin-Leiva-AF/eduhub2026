// Tipos del contrato de /api/analizar, /api/constancia y /api/foto, más formateadores compartidos.

export type Cita = { dato: string; valor: string; periodo: string; fuente: string; tabla: string; url: string };
export type Opcion = { id: string; titulo: string; detalle: string; costo: number; cubre: boolean };
export type Horizonte = { dias: number; saldoFinal: number; minimo: number; fechaMinimo: string };
export type Alerta = { id: string; nivel: 'critica' | 'atencion' | 'info'; titulo: string; detalle: string };
export type Analisis = {
  alertas: { alertas: Alerta[]; resumen: { vencidas: number; vence7: number; vence30: number; criticas: number } };
  resumen: { movimientos: number; recibidos: number; emitidos: number; boletas: number; empleados: number; ignorados: string[]; insumos: { nombre: string; sha256: string }[]; mercadopago?: 'api' | 'simulacion' | 'mixto' };
  pronostico: {
    hoy: string; saldoInicial: number; serie: { fecha: string; saldo: number }[];
    horizontes: Horizonte[];
    hueco: { inicio: string; minimo: number; dias: number } | null; aprendizajes: string[];
  };
  recomendacion: { alerta: string; opciones: Opcion[]; contexto: string[]; aviso: string };
  mensaje: { texto: string; fuente: 'ia' | 'reglas' };
  citas: Record<string, Cita>;
};
export type Comprobante = {
  es_comprobante: boolean;
  tipo?: string | null;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  cuit_emisor?: string | null;
  razon_social_emisor?: string | null;
  numero?: string | null;
  total?: number | null;
};
export type Constancia = { hash: string; modo: string; url?: string };

export type Msg = { hora?: string } & (
  | { de: 'bot' | 'yo'; tipo: 'texto'; texto: string; botones?: { id: string; label: string; lleno?: boolean }[] }
  | { de: 'bot'; tipo: 'grafico'; a: Analisis }
  | { de: 'bot'; tipo: 'recomendacion'; a: Analisis }
  | { de: 'bot'; tipo: 'consentimiento'; opcion: Opcion }
  | { de: 'bot'; tipo: 'constancia'; c: Constancia }
  | { de: 'bot'; tipo: 'foto'; c: Comprobante }
);

export type Fase = 'esperando' | 'leyendo' | 'listo' | 'sellada';

export const PYME = 'La Esquina de Nueva Córdoba (ficticia)';

// Montos: "−$1,2 M" para millones, "$850.000" para el resto.
export const M = (n: number) => {
  if (n === 0) return '$0';
  const signo = n < 0 ? '−' : '';
  return `${signo}$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;
};
export const $ = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('es-AR')}`;
export const ahora = () => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

// "2026-01-06" -> "6/1". Si no es ISO, devuelve el texto tal cual.
export const fechaCorta = (f: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
  return m ? `${+m[3]}/${+m[2]}` : f;
};
// "2026-01-06" -> "06/01/2026"
export const fechaLarga = (f: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(f);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : f;
};
