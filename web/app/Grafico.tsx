'use client';
// Saldo proyectado día a día. SVG puro, sin librerías.
// Eje cero explícito, zona bajo cero en rojo, marcador del mínimo con etiqueta que no se corta.
import { useId } from 'react';
import { M, fechaCorta } from './components/chat/tipos';

type Dia = { fecha: string; saldo: number };

export default function Grafico({ serie, dias }: { serie: Dia[]; dias: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = serie.slice(0, dias);
  if (s.length < 2) return null;

  const W = 340, H = 220, L = 54, R = 12, T = 16, B = 26;
  const vals = s.map(d => d.saldo);
  const lo0 = Math.min(0, ...vals), hi0 = Math.max(0, ...vals);
  const span = hi0 - lo0 || 1;
  const lo = lo0 - span * 0.06, hi = hi0 + span * 0.06;
  const x = (i: number) => L + (i / (s.length - 1)) * (W - L - R);
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const y0 = y(0);

  const linea = s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.saldo).toFixed(1)}`).join('');
  const area = `${linea}L${x(s.length - 1).toFixed(1)},${y0.toFixed(1)}L${x(0).toFixed(1)},${y0.toFixed(1)}Z`;

  // Marcas del eje: máximo, mitad, cero, mitad negativa, mínimo (sin repetidos).
  const marcas = [...new Set([hi0, hi0 / 2, 0, lo0 / 2, lo0])].sort((a, b) => b - a);

  let iMin = 0;
  s.forEach((d, i) => { if (d.saldo < s[iMin].saldo) iMin = i; });
  const px = x(iMin), py = y(s[iMin].saldo);
  const negMin = s[iMin].saldo < 0;

  // Etiqueta del mínimo: a la izquierda si el punto está a la derecha, y arriba/abajo según espacio.
  const texto = `mín. ${M(s[iMin].saldo)} · ${fechaCorta(s[iMin].fecha)}`;
  const ew = texto.length * 6.5 + 14, eh = 22;
  let ex = px > W / 2 ? px - 10 - ew : px + 10;
  ex = Math.min(Math.max(ex, L), W - R - ew);
  let ey = py < H - B - 60 ? py + 12 : py - 12 - eh;
  ey = Math.min(Math.max(ey, T), H - B - eh);

  const marcasX = [...new Set([0, Math.round(s.length / 3), Math.round((2 * s.length) / 3), s.length - 1])];
  const claseLinea = (pos: boolean) => (pos ? 'g-linea-pos' : 'g-linea-neg');

  return (
    <figure className="grafico" style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Saldo proyectado a ${dias} días. Mínimo ${M(s[iMin].saldo)} el ${fechaCorta(s[iMin].fecha)}.`}>
        <defs>
          <clipPath id={`${uid}-sobre`}><rect x={0} y={0} width={W} height={Math.max(0, y0)} /></clipPath>
          <clipPath id={`${uid}-bajo`}><rect x={0} y={y0} width={W} height={H} /></clipPath>
        </defs>

        {lo0 < 0 && <rect className="g-zona" x={L} y={y0} width={W - L - R} height={H - B - y0} />}

        {marcas.map(t => (
          <g key={t}>
            <line className={t === 0 ? 'g-cero' : 'g-grid'} x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text className={`g-eje ${t === 0 ? 'g-eje-fuerte' : ''}`} x={L - 6} y={y(t) + 4} textAnchor="end">{M(t)}</text>
          </g>
        ))}

        <path className="g-area-pos" d={area} clipPath={`url(#${uid}-sobre)`} />
        <path className="g-area-neg" d={area} clipPath={`url(#${uid}-bajo)`} />
        <path className={claseLinea(true)} d={linea} clipPath={`url(#${uid}-sobre)`} />
        <path className={claseLinea(false)} d={linea} clipPath={`url(#${uid}-bajo)`} />

        <line x1={px} x2={px} y1={py} y2={y0} stroke="var(--suave)" strokeDasharray="3 3" strokeWidth="1" />
        <circle className="g-punto" cx={px} cy={py} r="5" fill={negMin ? 'var(--linea-neg)' : 'var(--linea-pos)'} />
        <rect className="g-etiqueta-caja" x={ex} y={ey} width={ew} height={eh} rx="6" />
        <text className={`g-etiqueta ${negMin ? 'neg' : ''}`} x={ex + 7} y={ey + 15}>{texto}</text>

        {marcasX.map(i => (
          <text key={i} className="g-eje" x={x(i)} y={H - 7}
            textAnchor={i === 0 ? 'start' : i === s.length - 1 ? 'end' : 'middle'}>
            {fechaCorta(s[i].fecha)}
          </text>
        ))}
      </svg>
      <figcaption className="leyenda">
        <span><i className="sw pos" aria-hidden />saldo positivo</span>
        <span><i className="sw zona" aria-hidden />zona en rojo (saldo negativo)</span>
      </figcaption>
    </figure>
  );
}
