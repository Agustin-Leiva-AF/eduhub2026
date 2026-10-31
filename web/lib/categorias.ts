// Clasificación por reglas de las descripciones bancarias argentinas más comunes.
// Lo que queda en "otros" se puede mandar al LLM (lib/ia.ts).

export type Categoria =
  | 'ventas' | 'cobro_clientes' | 'sueldos' | 'aguinaldo' | 'cargas_sociales' | 'impuestos'
  | 'alquiler' | 'servicios' | 'proveedores' | 'retiros' | 'bancarios' | 'otros';

export const ETIQUETA: Record<Categoria, string> = {
  ventas: 'Ventas (tarjeta/QR)', cobro_clientes: 'Cobros a clientes', sueldos: 'Sueldos', aguinaldo: 'Aguinaldo',
  cargas_sociales: 'Cargas sociales', impuestos: 'Impuestos', alquiler: 'Alquiler', servicios: 'Servicios',
  proveedores: 'Proveedores', retiros: 'Retiros de socios', bancarios: 'Gastos bancarios', otros: 'Otros',
};

const REGLAS: [RegExp, Categoria][] = [
  [/\bSAC\b|AGUINALDO/i, 'aguinaldo'],
  [/HABERES|SUELDO|NOMINA|REMUNERAC/i, 'sueldos'],
  [/F\.?\s?931|CARGAS SOC|SEG(URIDAD)? SOCIAL/i, 'cargas_sociales'],
  [/MERCADO PAGO|POSNET|PRISMA|PAYWAY|LIQ(UIDACION)? (VISA|MASTER|TARJ)|GETNET|CABAL/i, 'ventas'],
  [/IIBB|RENTAS|ARCA|AFIP|IVA|GANANCIAS|MONOTRIB|MUNICIPAL|TASA/i, 'impuestos'],
  [/ALQUILER|INMOB/i, 'alquiler'],
  [/EPEC|EDENOR|EDESUR|ECOGAS|METROGAS|NATURGY|AGUAS|TELECOM|PERSONAL|CLARO|MOVISTAR|FIBERTEL/i, 'servicios'],
  [/RETIRO SOCIO|CTA PROPIA|HONORARIOS SOCIO/i, 'retiros'],
  [/COM(ISION)?\.? |MANTENIMIENTO|IMP\.? (DEB|CRED)|SELLOS/i, 'bancarios'],
  [/TRANSF(ERENCIA)? RECIBIDA|ACRED(ITACION)? TRANSF|COBRO/i, 'cobro_clientes'],
  [/TRANSF(ERENCIA)? A |PAGO A PROV|ECHEQ EMITIDO/i, 'proveedores'],
];

export function categorizar(desc: string, monto: number): Categoria {
  for (const [re, c] of REGLAS) if (re.test(desc)) {
    if (c === 'impuestos' && monto > 0) continue; // un crédito con "IVA" no es un pago de impuesto
    return c;
  }
  return 'otros';
}
