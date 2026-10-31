// Panel de la entidad: el banco abre la carpeta, recalcula el hash y lo compara con el registro.
import type { Hex } from 'viem';
import { verificar } from '@/lib/notario';
import Grafico from '../../Grafico';
import { M, fechaCorta, fechaLarga } from '../../components/chat/tipos';

export const dynamic = 'force-dynamic';

type Carpeta = {
  pyme: string; generada: string; destinatario: string; opcionElegida: { titulo: string };
  insumos: { nombre: string; sha256: string }[]; consentimiento: { fecha: string };
  pronostico: {
    hoy: string; saldoInicial: number;
    serie: { fecha: string; saldo: number }[];
    horizontes: { dias: number; saldoFinal: number; minimo: number; fechaMinimo: string }[];
    hueco: { inicio: string; minimo: number; dias: number } | null;
  };
};

const fechaHora = (iso: string) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

export default async function Entidad({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const v = /^0x[0-9a-f]{64}$/.test(hash) ? await verificar(hash as Hex) : null;
  const c = v?.carpeta as undefined | Carpeta;
  const valida = Boolean(v?.coincide && v.registro.existe);
  const h120 = c?.pronostico.horizontes.find(h => h.dias === 120) ?? c?.pronostico.horizontes.at(-1);

  return (
    <div className="bk">
      <header className="bk-top">
        <div className="bk-logo" aria-hidden>BD</div>
        <div>
          <strong>Banco de la demo · Panel de entidad</strong>
          <small>Carpetas de caja recibidas · consulta de solo lectura</small>
        </div>
        <span className="etiqueta">Solo lectura</span>
      </header>

      <main className="bk-main">
        <section className="bk-columna" aria-label="Verificación de integridad">
          <div className="bk-card">
            <h2>Verificación</h2>
            {!v || !c ? (
              <div className="sello mal" role="status">
                <span className="sello-icono" aria-hidden>✕</span>
                <span className="sello-titulo">No verificada</span>
                <span className="sello-texto">No encontramos una carpeta con este hash.</span>
              </div>
            ) : valida ? (
              <div className="sello ok" role="status">
                <span className="sello-icono" aria-hidden>✓</span>
                <span className="sello-titulo">Íntegra</span>
                <span className="sello-texto">El hash recalculado coincide con el registrado. Nadie modificó la carpeta.</span>
              </div>
            ) : (
              <div className="sello mal" role="status">
                <span className="sello-icono" aria-hidden>✕</span>
                <span className="sello-titulo">No verificada</span>
                <span className="sello-texto">La carpeta fue modificada o no está registrada.</span>
              </div>
            )}

            <dl className="registro" style={{ marginTop: 16 }}>
              <dt>Hash de la carpeta</dt>
              <dd className="mono">{hash}</dd>
              {v && (
                <>
                  <dt>Registro</dt>
                  <dd>
                    {v.registro.modo === 'testnet' ? 'Base Sepolia (testnet)' : 'Simulado (demo sin testnet)'}
                    {v.registro.fecha && <> · sellada el {fechaHora(v.registro.fecha)}</>}
                  </dd>
                  {v.registro.url && (
                    <>
                      <dt>Explorador</dt>
                      <dd><a href={v.registro.url} target="_blank" rel="noreferrer">Ver transacción</a></dd>
                    </>
                  )}
                </>
              )}
            </dl>
            <p className="bk-aviso">Para contrastar, la pyme debe reenviar los archivos originales: su SHA-256 tiene que coincidir con la evidencia.</p>
          </div>
        </section>

        <div className="bk-columna">
          {!c ? (
            <div className="bk-card">
              <h1 className="bk-titulo">Carpeta no encontrada</h1>
              <p className="bk-sub">Revisá el enlace o pedile a la pyme la constancia de caja actualizada.</p>
            </div>
          ) : (
            <>
              <div className="bk-card">
                <h1 className="bk-titulo">{c.pyme}</h1>
                <p className="bk-sub">
                  Solicita <strong>{c.opcionElegida.titulo}</strong>. Consentimiento otorgado el {fechaHora(c.consentimiento.fecha)} para {c.destinatario}.
                </p>
                {c.pronostico.hueco && (
                  <div className="bk-alerta" style={{ marginTop: 14 }}>
                    Hueco proyectado desde el {fechaCorta(c.pronostico.hueco.inicio)}: mínimo {M(c.pronostico.hueco.minimo)} durante {c.pronostico.hueco.dias} días.
                  </div>
                )}
                <div className="bk-kpis" style={{ marginTop: 14 }}>
                  <div className="kpi"><span>Saldo al {fechaLarga(c.pronostico.hoy)}</span><strong>{M(c.pronostico.saldoInicial)}</strong></div>
                  {h120 && (
                    <div className={`kpi ${h120.minimo < 0 ? 'neg' : 'pos'}`}>
                      <span>Mínimo a 120 días</span><strong>{M(h120.minimo)}</strong><small>el {fechaCorta(h120.fechaMinimo)}</small>
                    </div>
                  )}
                  {h120 && (
                    <div className="kpi"><span>Saldo final a 120 días</span><strong>{M(h120.saldoFinal)}</strong></div>
                  )}
                </div>
                <Grafico serie={c.pronostico.serie} dias={120} />
              </div>

              <div className="bk-card">
                <h2>Horizontes de proyección</h2>
                <div className="tabla-wrap">
                  <table className="tabla">
                    <thead>
                      <tr><th>Horizonte</th><th className="num">Saldo final</th><th className="num">Mínimo</th><th>Fecha del mínimo</th></tr>
                    </thead>
                    <tbody>
                      {c.pronostico.horizontes.map(h => (
                        <tr key={h.dias}>
                          <td>{h.dias} días</td>
                          <td className={`num ${h.saldoFinal < 0 ? 'neg' : ''}`}>{M(h.saldoFinal)}</td>
                          <td className={`num ${h.minimo < 0 ? 'neg' : ''}`}>{M(h.minimo)}</td>
                          <td>{fechaLarga(h.fechaMinimo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bk-card">
                <h2>Evidencia · huella SHA-256 de los archivos originales</h2>
                <div className="tabla-wrap">
                  <table className="tabla">
                    <thead><tr><th>Archivo</th><th>SHA-256</th></tr></thead>
                    <tbody>
                      {c.insumos.map(i => (
                        <tr key={i.sha256 + i.nombre}><td>{i.nombre}</td><td className="mono">{i.sha256}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="bk-aviso">
                  No es asesoramiento financiero; la evaluación crediticia es de la entidad. Los datos de terceros están seudonimizados.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
