import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'CFO de Bolsillo', description: 'Tu caja proyectada a 120 días, por chat.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#075e54' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
