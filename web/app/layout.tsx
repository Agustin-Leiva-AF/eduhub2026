import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

// Tipografía autoalojada (paquetes @fontsource): el build no depende de Google Fonts ni de internet.
// Instrument Sans para titulares y cifras grandes, IBM Plex Sans para texto, Plex Mono para hashes.
const display = localFont({
  src: [
    { path: '../node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../node_modules/@fontsource/instrument-sans/files/instrument-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--f-display', display: 'swap',
});
const cuerpo = localFont({
  src: [
    { path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--f-body', display: 'swap',
});
const mono = localFont({
  src: [
    { path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--f-mono', display: 'swap',
});

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
