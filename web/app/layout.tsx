import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Sans } from 'next/font/google';
import './globals.css';

// Tipografía: Instrument Sans para titulares y cifras grandes, IBM Plex Sans para texto, Plex Mono para hashes.
const display = Instrument_Sans({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-display', display: 'swap' });
const cuerpo = IBM_Plex_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--f-body', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--f-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'CFO de Bolsillo',
  description: 'Tu caja proyectada a 120 días, con avisos y qué hacer con lo que falta o lo que sobra.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'CFO de Bolsillo', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1118' },
  ],
};

// Aplica el tema elegido antes de pintar (evita el destello claro/oscuro).
const TEMA = `try{var t=localStorage.getItem('cfo-tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={`${display.variable} ${cuerpo.variable} ${mono.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: TEMA }} /></head>
      <body>{children}</body>
    </html>
  );
}
