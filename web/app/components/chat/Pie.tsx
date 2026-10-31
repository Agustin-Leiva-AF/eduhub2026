'use client';
// Pie del chat: adjuntar CSV, foto de comprobante y CSV de ejemplo.
import type { RefObject } from 'react';

type Props = {
  archivoRef: RefObject<HTMLInputElement | null>;
  fotoRef: RefObject<HTMLInputElement | null>;
  ocupado: boolean;
  onArchivos: (files: FileList | null) => void;
  onFoto: (file: File) => void;
};

export default function Pie({ archivoRef, fotoRef, ocupado, onArchivos, onFoto }: Props) {
  return (
    <footer className="pie">
      <input ref={archivoRef} className="oculto" type="file" multiple accept=".csv,text/csv"
        onChange={e => { onArchivos(e.target.files); e.target.value = ''; }} />
      <input ref={fotoRef} className="oculto" type="file" accept="image/jpeg,image/png,image/webp"
        onChange={e => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onFoto(f);
        }} />
      <button type="button" className="btn secundario" disabled={ocupado} onClick={() => archivoRef.current?.click()}>
        📎 Adjuntar CSV
      </button>
      <button type="button" className="btn secundario" disabled={ocupado} onClick={() => fotoRef.current?.click()}>
        📷 Foto de comprobante
      </button>
      <a className="btn secundario" href="/demo/extracto_banco_esquina.csv" download>
        ⬇ CSV de ejemplo
      </a>
    </footer>
  );
}
