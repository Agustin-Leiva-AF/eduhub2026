import type { ReactNode } from 'react';
import { DatosProvider } from './_ui/datos';
import Shell from './_ui/Shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <DatosProvider>
      <Shell>{children}</Shell>
    </DatosProvider>
  );
}
