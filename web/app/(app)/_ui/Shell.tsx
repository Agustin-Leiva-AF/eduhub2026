'use client';
// Shell de la app: barra lateral en escritorio, cabecera compacta + pestañas abajo en el teléfono.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Avisos from '../../components/chat/Avisos';
import { nombreFuente, useDatos } from './datos';
import s from '../app.module.css';

const I = {
  hoy: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />,
  proy: <path d="M4 19h16M5 15l4.5-5 3.5 3 6-7m0 0v4m0-4h-4" />,
  exc: <><circle cx="12" cy="12" r="8" /><path d="M12 7.5v9M14.6 9.3c-.5-.8-1.5-1.3-2.7-1.3-1.6 0-2.7.9-2.7 2s1.1 1.6 2.8 2c1.7.4 2.8 1 2.8 2.1s-1.2 2-2.8 2c-1.3 0-2.4-.6-2.9-1.5" /></>,
  datos: <><ellipse cx="12" cy="6.5" rx="7" ry="2.5" /><path d="M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" /></>,
  sello: <><path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
};
const Icono = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>
);

export const SECCIONES = [
  { href: '/', label: 'Hoy', titulo: 'Hoy', icono: I.hoy },
  { href: '/proyeccion', label: 'Proyección', titulo: 'Proyección de caja', icono: I.proy },
  { href: '/excedente', label: 'Excedente', titulo: 'Excedente', icono: I.exc },
  { href: '/datos', label: 'Datos', titulo: 'Datos y avisos', icono: I.datos },
  { href: '/sello', label: 'Sello', titulo: 'Sello verificable', icono: I.sello },
] as const;

type Tema = 'auto' | 'light' | 'dark';
function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>('auto');
  useEffect(() => {
    try { const t = localStorage.getItem('cfo-tema'); if (t === 'light' || t === 'dark') setTema(t); } catch { /* sin storage */ }
  }, []);
  const ciclar = () => setTema(t => {
    const n: Tema = t === 'auto' ? 'dark' : t === 'dark' ? 'light' : 'auto';
    const html = document.documentElement;
    if (n === 'auto') delete html.dataset.theme; else html.dataset.theme = n;
    try { if (n === 'auto') localStorage.removeItem('cfo-tema'); else localStorage.setItem('cfo-tema', n); } catch { /* sin storage */ }
    return n;
  });
  return [tema, ciclar];
}

function BotonTema() {
  const [tema, ciclar] = useTema();
  const nombre = tema === 'auto' ? 'automático' : tema === 'dark' ? 'oscuro' : 'claro';
  return (
    <button type="button" className={s.iconBtn} onClick={ciclar} aria-label={`Tema ${nombre}. Cambiar tema`} title={`Tema: ${nombre}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
        {tema === 'dark' ? <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
          : tema === 'light' ? <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>
            : <><circle cx="12" cy="12" r="8" /><path d="M12 4v16a8 8 0 0 0 0-16z" fill="currentColor" /></>}
      </svg>
    </button>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const { vista, fuente, estado, completando } = useDatos();
  const actual = SECCIONES.find(x => x.href === ruta) ?? SECCIONES[0];

  // Registra el service worker para que la app sea instalable y reciba avisos.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  const subtitulo = estado === 'cargando' ? 'Analizando tu caja…' : completando ? 'Completando avisos y excedente…' : vista ? `${vista.pyme}${vista.ficticia ? ' · demo' : ''}` : 'Sin datos';

  return (
    <div className={s.app}>
      <a href="#contenido" className={s.saltar}>Saltar al contenido</a>
      <div className={s.shell}>
        <aside className={s.sidebar} aria-label="Navegación principal">
          <div className={s.marca}>
            <span className={s.logo} aria-hidden>CB</span>
            <div><strong>CFO de Bolsillo</strong><small>Caja a 120 días</small></div>
          </div>
          <nav className={s.nav} aria-label="Secciones">
            {SECCIONES.map(x => (
              <Link key={x.href} href={x.href} className={s.navItem} aria-current={x.href === ruta ? 'page' : undefined}>
                <Icono d={x.icono} />{x.label}
              </Link>
            ))}
          </nav>
          <div className={s.sideFoot}>
            <div className={s.fuentePill}>
              <span>Fuente de datos</span>
              <b>{nombreFuente(fuente)}</b>
              {vista && <span>{vista.pyme}{vista.ficticia ? ' (ficticia)' : ''}</span>}
            </div>
            <Link href="/demo">Demo del canal WhatsApp →</Link>
          </div>
        </aside>

        <div>
          <header className={s.top}>
            <div className={s.topFila}>
              <span className={s.logo} aria-hidden>CB</span>
              <div className={s.topTexto}>
                <strong>{actual.titulo}</strong>
                <small aria-live="polite">{subtitulo}</small>
              </div>
              <div className={`${s.topAcc} ${s.avisosAqui}`}>
                {vista?.alertas && <Avisos alertas={vista.alertas} />}
                <BotonTema />
              </div>
            </div>
          </header>
          <main id="contenido" className={s.main} tabIndex={-1}>{children}</main>
        </div>
      </div>

      <nav className={s.tabbar} aria-label="Secciones">
        {SECCIONES.map(x => (
          <Link key={x.href} href={x.href} className={s.tab} aria-current={x.href === ruta ? 'page' : undefined}>
            <Icono d={x.icono} /><span>{x.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
