// Panel de la entidad: el banco abre la carpeta, recalcula el hash y lo compara con el registro.
import type { Hex } from 'viem';
import { verificar } from '@/lib/notario';

export const dynamic = 'force-dynamic';

const M = (n: number) => `${n < 0 ? '-' : ''}$${(Math.abs(n) / 1e6).toFixed(1).replace('.', ',')} M`;

export default async function Entidad({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  const v = /^0x[0-9a-f]{64}$/.test(hash) ? await verificar(hash as Hex) : null;
  const c = v?.carpeta as undefined | {
    pyme: string; generada: string; destinatario: string; opcionElegida: { titulo: string };
    insumos: { nombre: string; sha256: string }[]; consentimiento: { fecha: string };
    pronostico: { hoy: string; saldoInicial: number; horizontes: { dias: number; saldoFinal: number; minimo: number; fechaMinimo: string }[]; hueco: { inicio: string; minimo: number; dias: number } | null };
  };
  const valida = Boolean(v?.coincide && v.registro.existe);
  return (
    <main className="panel">
      <h1>🏦 Panel de entidad · Carpeta de caja</h1>
      <div className="card">
        <div className="mono">{hash}</div>
        {!v || !c ? <p className="estado-mal">No encontré esta carpeta.</p> : (
          <>
            <p className={valida ? 'estado-ok' : 'estado-mal'}>
              {valida ? '✔ Íntegra: el hash recalculado coincide con el registrado.' : '✘ No verificada: la carpeta fue modificada o no está registrada.'}
            </p>
            <p>Registro: <strong>{v.registro.modo === 'testnet' ? 'Base Sepolia (testnet)' : 'simulado (demo sin testnet)'}</strong>
              {v.registro.fecha && <> · sellada el {new Date(v.registro.fecha).toLocaleString('es-AR')}</>}
              {v.registro.url && <> · <a href={v.registro.url} target="_blank" rel="noreferrer">explorador</a></>}</p>
          </>
        )}
      </div>
      {c && (
        <>
          <div className="card">
            <h2>{c.pyme}</h2>
            <p>Solicita: <strong>{c.opcionElegida.titulo}</strong> · consentimiento otorgado el {new Date(c.consentimiento.fecha).toLocaleString('es-AR')} para {c.destinatario}.</p>
            {c.pronostico.hueco && <p className="estado-mal">Hueco proyectado desde el {c.pronostico.hueco.inicio}: mínimo {M(c.pronostico.hueco.minimo)}, {c.pronostico.hueco.dias} días.</p>}
            <table>
              <thead><tr><th>Horizonte</th><th>Saldo final</th><th>Mínimo</th><th>Fecha mínimo</th></tr></thead>
              <tbody>{c.pronostico.horizontes.map(h => <tr key={h.dias}><td>{h.dias} días</td><td>{M(h.saldoFinal)}</td><td>{M(h.minimo)}</td><td>{h.fechaMinimo}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="card">
            <h3>Evidencia (huella de los archivos originales)</h3>
            <table><tbody>{c.insumos.map(i => <tr key={i.sha256}><td>{i.nombre}</td><td className="mono">{i.sha256}</td></tr>)}</tbody></table>
            <p className="aviso">Si la pyme le reenvía al banco los archivos originales, su SHA-256 tiene que coincidir con estos. No es asesoramiento financiero; la evaluación crediticia es de la entidad.</p>
          </div>
        </>
      )}
    </main>
  );
}
