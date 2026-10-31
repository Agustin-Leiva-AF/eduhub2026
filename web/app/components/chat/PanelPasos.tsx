'use client';
// Panel lateral (solo desktop): explica el flujo en 3 pasos y muestra el estado del análisis.
import { M, fechaCorta, type Analisis, type Fase } from './tipos';

type Estado = 'pendiente' | 'actual' | 'hecho';

export default function PanelPasos({ fase, analisis, hash }: { fase: Fase; analisis: Analisis | null; hash: string | null }) {
  const leer: Estado = fase === 'esperando' || fase === 'leyendo' ? 'actual' : 'hecho';
  const proyectar: Estado = fase === 'listo' || fase === 'sellada' ? 'hecho' : fase === 'leyendo' ? 'actual' : 'pendiente';
  const decidir: Estado = fase === 'sellada' ? 'hecho' : fase === 'listo' ? 'actual' : 'pendiente';

  const pasos: { n: number; titulo: string; texto: string; estado: Estado }[] = [
    { n: 1, titulo: 'Leer', texto: 'Clasifica el extracto del banco y cada comprobante de ARCA, y aprende plazos y cobros de tus clientes.', estado: leer },
    { n: 2, titulo: 'Proyectar', texto: 'Caja día a día a 120 días, ajustada por la inflación del INDEC (vía OpenARG).', estado: proyectar },
    { n: 3, titulo: 'Decidir', texto: 'Opciones para cubrir el hueco con costo según tasas del BCRA. Vos autorizás, y el banco recibe una carpeta sellada.', estado: decidir },
  ];

  const hueco = analisis?.pronostico.hueco;
  const etiqueta: Record<Estado, string> = { pendiente: 'Pendiente', actual: 'En curso', hecho: 'Listo' };

  return (
    <aside className="panel-pasos" aria-label="Cómo funciona">
      <div className="pasos-titulo">
        <h1>Tu caja, explicada en 3 pasos</h1>
        <p>Del extracto a una decisión con costo claro, sin planillas.</p>
      </div>

      {pasos.map(p => (
        <div key={p.n} className={`paso ${p.estado}`}>
          <div className="paso-num" aria-hidden>{p.estado === 'hecho' ? '✓' : p.n}</div>
          <div>
            <div className="paso-cab">
              <h3>{p.titulo}</h3>
              <span className="paso-estado"><span className="sr">Estado: </span>{etiqueta[p.estado]}</span>
            </div>
            <p>{p.texto}</p>
          </div>
        </div>
      ))}

      <section className="estado-analisis" aria-label="Estado del análisis">
        <h2>Estado del análisis</h2>
        {!analisis ? (
          <p>Todavía no cargaste datos. Probá con la pyme demo para ver el flujo completo.</p>
        ) : (
          <dl>
            <dt>Movimientos</dt><dd>{analisis.resumen.movimientos}</dd>
            <dt>Facturas</dt><dd>{analisis.resumen.recibidos + analisis.resumen.emitidos}</dd>
            <dt>Saldo hoy</dt><dd>{M(analisis.pronostico.saldoInicial)}</dd>
            <dt>Hueco</dt>
            <dd className={hueco ? 'neg' : ''} style={hueco ? { color: 'var(--rojo)' } : undefined}>
              {hueco ? `Desde el ${fechaCorta(hueco.inicio)}: ${M(hueco.minimo)}` : 'Sin hueco a 120 días'}
            </dd>
            {hash && (<><dt>Carpeta</dt><dd className="mono" style={{ fontSize: 12 }}>{hash.slice(0, 12)}…</dd></>)}
          </dl>
        )}
      </section>

      <p className="pasos-pie">Datos de la pyme demo: ficticios. Esto no es asesoramiento financiero.</p>
    </aside>
  );
}
