// Recomendación: compara cómo cubrir el hueco con costos calculados sobre tasas reales (BCRA vía OpenARG).
// Orquesta, no asesora: no nombra instrumentos ni emisores; deriva a entidades habilitadas.
import { fmt, pronosticar, sumar, type Pronostico } from './forecast';
import type { Comprobante, Movimiento } from './parse';
import type { Cita, Contexto } from './openarg';

export type Opcion = {
  id: 'renegociar' | 'descontar' | 'adelanto';
  titulo: string; detalle: string; costo: number; cubre: boolean; citas: Cita[];
};
export type Recomendacion = { alerta: string; opciones: Opcion[]; elegida: Opcion['id'] | null; contexto: string[]; aviso: string };

const fechaLarga = (s: string) => {
  const d = new Date(s + 'T00:00:00Z');
  return `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
};
const millones = (n: number) => `$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;

export function recomendar(p: Pronostico, movs: Movimiento[], rec: Comprobante[], emi: Comprobante[], ctx: Contexto): Recomendacion {
  const aviso = 'Esto es información para decidir, no asesoramiento financiero. Las condiciones finales las fija cada entidad.';
  const contexto = [
    `Los bancos están más exigentes: la morosidad de las empresas y familias pasó de ${ctx.citas.irregularidad.valor} (${ctx.citas.irregularidad.periodo}). Llegar con la caja ordenada y comprobable te da ventaja.`,
  ];
  if (!p.hueco) {
    const h90 = p.horizontes.find(h => h.dias === 90)!;
    contexto.push(`Si te sobra plata, ojo: el plazo fijo rindió ${ctx.citas.pfReal.valor} real en ${ctx.citas.pfReal.periodo}. Antes de inmovilizar, mirá tu mínimo proyectado (${millones(h90.minimo)} el ${fechaLarga(h90.fechaMinimo)}).`);
    return { alerta: `Buenas noticias: en los próximos 120 días no te quedás sin caja. Tu punto más bajo es ${millones(h90.minimo)} el ${fechaLarga(h90.fechaMinimo)}.`, opciones: [], elegida: null, contexto, aviso };
  }

  const h = p.hueco;
  const falta = -h.minimo;
  const enDias = Math.round((Date.parse(h.inicio) - Date.parse(p.hoy)) / 86400000);
  const alerta = `⚠️ El ${fechaLarga(h.inicio)} (en ${enDias} días) te falta plata: hasta ${millones(h.minimo)} el ${fechaLarga(h.fechaMinimo)} y estás en rojo ${h.dias} ${h.dias === 1 ? 'día' : 'días'}.` +
    (p.huecos.length > 1 ? ` Hay ${p.huecos.length - 1} hueco${p.huecos.length > 2 ? 's' : ''} más adelante (el próximo, el ${fechaLarga(p.huecos[1].inicio)}).` : '');
  const op = { ipcMensual: p.ipcMensual, hoy: p.hoy };
  // ¿La alternativa cubre ESTE hueco? (anticipar cobros puede correr el problema más adelante)
  const minEnHueco = (alt: Pronostico) => Math.min(...alt.serie.filter(d => d.fecha >= h.inicio && (!h.fin || d.fecha < h.fin)).map(d => d.saldo));
  const opciones: Opcion[] = [];

  // A) Renegociar el plazo con el proveedor que más pesa en la ventana del hueco (costo financiero 0)
  const ventana = p.eventos.filter(e => e.categoria === 'proveedores' && e.fecha >= sumar(h.inicio, -20) && e.fecha <= h.fechaMinimo);
  const porProv = new Map<string, number>();
  for (const e of ventana) porProv.set(e.cuit!, (porProv.get(e.cuit!) ?? 0) - e.monto);
  const [cuitTop, montoTop] = [...porProv].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (cuitTop) {
    const prov = p.contrapartes.find(c => c.cuit === cuitTop)!;
    const alt = pronosticar(movs, rec, emi, { ...op, plazoExtra: { [cuitTop]: 15 } });
    const resto = minEnHueco(alt);
    const cubre = resto >= 0;
    opciones.push({ id: 'renegociar', titulo: `Pedile 15 días más a ${prov.nombre}`,
      detalle: `Hoy le pagás a ${prov.plazoDias} días. Pasando a ${prov.plazoDias + 15}, corrés ${millones(montoTop)} de pagos fuera del hueco. ${cubre ? 'Con eso solo, cubrís este hueco.' : `El faltante baja a ${millones(resto)}.`}`,
      costo: 0, cubre, citas: [] });
  }

  // B) Descontar facturas de clientes (FCE / ECHEQ) que cobrás después del hueco
  const futuras = p.eventos.filter(e => e.categoria === 'cobro_clientes' && e.origen === 'factura pendiente' && e.fecha > h.inicio)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  let acum = 0, costoDesc = 0;
  const anticipos: { cuit: string; numero: string; fecha: string }[] = [];
  const fechaAnt = sumar(h.inicio, -2);
  for (const e of futuras) {
    if (acum >= falta) break;
    const numero = e.concepto.match(/fact\. ([^),]+)/)?.[1] ?? '';
    anticipos.push({ cuit: e.cuit!, numero, fecha: fechaAnt });
    acum += e.monto;
    costoDesc += e.monto * (ctx.tnaDocumentos / 100) * Math.max(0, Date.parse(e.fecha) - Date.parse(fechaAnt)) / 86400000 / 365;
  }
  if (anticipos.length) {
    const resto = minEnHueco(pronosticar(movs, rec, emi, { ...op, anticipos }));
    const cliente = futuras[0].concepto.replace(/^Cobro de /, '').replace(/ \(.*$/, '');
    opciones.push({ id: 'descontar', titulo: `Descontá ${anticipos.length} factura${anticipos.length > 1 ? 's' : ''} de ${cliente}`,
      detalle: `Adelantás ${millones(acum)} que ibas a cobrar más tarde. Costo estimado ≈ $${fmt(costoDesc)} a la tasa de descuento de documentos (${ctx.citas.documentos.valor}, ${ctx.citas.documentos.periodo}). ${resto < 0 ? `Queda un faltante de ${millones(resto)}.` : 'Cubre este hueco completo.'}`,
      costo: Math.round(costoDesc), cubre: resto >= 0, citas: [ctx.citas.documentos] });
  }

  // C) Adelanto en cuenta corriente: costo = intereses sobre el saldo negativo día a día
  const costoAdel = h.areaNegativa * (ctx.tnaAdelantos / 100) / 365;
  opciones.push({ id: 'adelanto', titulo: 'Acuerdo de descubierto (adelanto en cuenta corriente)',
    detalle: `Cubre todo el hueco: ≈ $${fmt(costoAdel)} de intereses a ${ctx.citas.adelantos.valor} (${ctx.citas.adelantos.periodo}) por ${h.dias} días. La clave: tenerlo acordado antes del ${fechaLarga(h.inicio)}. Sin acuerdo, el banco puede rechazarte pagos y cheques. Te armamos la carpeta para pedirlo hoy.`,
    costo: Math.round(costoAdel), cubre: true, citas: [ctx.citas.adelantos] });

  // Orden: primero lo que cubre, después lo más barato
  opciones.sort((a, b) => Number(b.cubre) - Number(a.cubre) || a.costo - b.costo);
  contexto.push(`La diferencia entre adelanto (${ctx.citas.adelantos.valor}) y descuento de documentos (${ctx.citas.documentos.valor}) es de ${(ctx.tnaAdelantos - ctx.tnaDocumentos).toFixed(1).replace('.', ',')} puntos: planificar con tiempo es plata.`);
  return { alerta, opciones, elegida: opciones[0].id, contexto, aviso };
}
