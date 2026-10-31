// Íconos de trazo (24×24, currentColor). Decorativos: siempre van con un texto al lado.
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  hoy: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  proy: <path d="M4 19h16M5 15l4.5-5 3.5 3 6-7m0 0v4m0-4h-4" />,
  exc: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5v9M14.6 9.3c-.5-.8-1.5-1.3-2.7-1.3-1.6 0-2.7.9-2.7 2s1.1 1.6 2.8 2c1.7.4 2.8 1 2.8 2.1s-1.2 2-2.8 2c-1.3 0-2.4-.6-2.9-1.5" /></>,
  datos: <><ellipse cx="12" cy="6.5" rx="7" ry="2.5" /><path d="M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></>,
  mas: <path d="M12 5v14M5 12h14" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
  atras: <path d="M15 5l-7 7 7 7" />,
  saldo: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></>,
  mov: <path d="M7 4v14m0 0-3-3m3 3 3-3M17 20V6m0 0-3 3m3-3 3 3" />,
  factura: <><path d="M6 3h9l4 4v14l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V4a1 1 0 0 1 1-1z" /><path d="M9 9h6M9 13h6" /></>,
  archivo: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M12 18v-6m0 0-2.5 2.5M12 12l2.5 2.5" /></>,
  mp: <><path d="M3 12c0-3 4-5.5 9-5.5s9 2.5 9 5.5-4 5.5-9 5.5S3 15 3 12z" /><path d="M7.5 11.5 10 13l2-2 2 2 2.5-1.5" /></>,
  foto: <><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
  demo: <path d="M8 5.5v13l10.5-6.5z" />,
  ok: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.7 2.7L16.2 9.5" /></>,
  alerta: <><path d="M12 4 2.8 19.5h18.4z" /><path d="M12 10v4.2M12 17.2v.1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.8v.1" /></>,
  basura: <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13" />,
  candado: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  sello: <><path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  calendario: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  persona: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.5 3.8-5 7-5s5.8 1.5 7 5" /></>,
};

export type NombreIcono = keyof typeof P;
export function Icono({ n, size }: { n: NombreIcono; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable="false">{P[n]}</svg>
  );
}
