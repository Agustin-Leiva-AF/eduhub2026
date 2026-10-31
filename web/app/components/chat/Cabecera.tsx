import type { ReactNode } from 'react';
// Cabecera estilo WhatsApp con identidad del bot y estado en vivo.
export default function Cabecera({ estado, acciones }: { estado: string; acciones?: ReactNode }) {
  return (
    <header className="cabecera">
      <div className="avatar" aria-hidden>$</div>
      <div className="cab-texto">
        <strong>CFO de Bolsillo</strong>
        <small aria-live="polite">{estado}</small>
      </div>
      {acciones}
      <span className="etiqueta">Demo</span>
    </header>
  );
}

// Indicador "escribiendo": tres puntos animados (se detienen con prefers-reduced-motion).
export function Escribiendo({ texto = 'analizando tu caja…' }: { texto?: string }) {
  return (
    <div className="msg bot escribiendo entrar" role="status">
      <span className="puntos" aria-hidden><i /><i /><i /></span>
      <span>{texto}</span>
    </div>
  );
}
