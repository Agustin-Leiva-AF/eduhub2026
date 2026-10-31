'use client';
// Una burbuja del chat: texto del usuario o del bot, o una tarjeta rica.
import type { ReactNode } from 'react';
import type { Msg, Opcion } from './tipos';
import { ResultadoFoto, TarjetaConsentimiento, TarjetaConstancia, TarjetaGrafico, TarjetaRecomendacion } from './Tarjetas';

type Props = {
  m: Msg;
  usados: Set<string>;
  onBoton: (id: string, label: string) => void;
  onConsentir: (o: Opcion) => void;
};

export default function Burbuja({ m, usados, onBoton, onConsentir }: Props) {
  let contenido: ReactNode;
  let ancho = m.tipo !== 'texto';

  switch (m.tipo) {
    case 'texto':
      contenido = (
        <>
          <p className="cuerpo">{m.texto}</p>
          {m.botones && (
            <div className="acciones">
              {m.botones.map(b => (
                <button key={b.id} type="button" className={`btn ${b.lleno ? 'lleno' : ''}`}
                  disabled={usados.has(b.id)} onClick={() => onBoton(b.id, b.label)}>
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </>
      );
      break;
    case 'grafico':
      contenido = <TarjetaGrafico a={m.a} />;
      break;
    case 'recomendacion':
      contenido = <TarjetaRecomendacion a={m.a} usados={usados} onBoton={onBoton} />;
      break;
    case 'consentimiento':
      contenido = <TarjetaConsentimiento opcion={m.opcion} usados={usados} onConsentir={onConsentir} />;
      break;
    case 'constancia':
      contenido = <TarjetaConstancia c={m.c} />;
      break;
    case 'foto':
      contenido = <ResultadoFoto c={m.c} />;
      ancho = false;
      break;
  }

  const clase = ['msg', m.de === 'yo' ? 'yo' : 'bot', ancho ? 'ancho' : '', 'entrar'].join(' ');
  return (
    <div className={clase}>
      {contenido}
      {m.hora && <time className="hora">{m.hora}</time>}
    </div>
  );
}
