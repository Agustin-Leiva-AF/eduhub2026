'use client';
// Saldo proyectado día a día, con la zona en rojo marcada. SVG puro, sin librerías.

type Dia = { fecha: string; saldo: number };

const M = (n: number) => `${(n / 1e6).toFixed(Math.abs(n) < 1e7 ? 1 : 0).replace('.', ',')} M`;
const corta = (f: string) => `${+f.slice(8, 10)}/${+f.slice(5, 7)}`;

export default function Grafico({ serie, dias }: { serie: Dia[]; dias: number }) {
  const s = serie.slice(0, dias);
  const W = 520, H = 220, L = 46, R = 8, T = 10, B = 24;
  const min = Math.min(0, ...s.map(d => d.saldo)), max = Math.max(0, ...s.map(d => d.saldo));
  const x = (i: number) => L + (i / Math.max(1, s.length - 1)) * (W - L - R);
  const y = (v: number) => T + ((max - v) / (max - min || 1)) * (H - T - B);
  const linea = s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.saldo).toFixed(1)}`).join('');
  const area = `${linea}L${x(s.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const pasos = 4;
  const ticks = Array.from({ length: pasos + 1 }, (_, k) => min + ((max - min) * k) / pasos);
  const marcasX = [0, Math.floor(s.length / 3), Math.floor((2 * s.length) / 3), s.length - 1];
  const iMin = s.reduce((a, d, i) => (d.saldo < s[a].saldo ? i : a), 0);
  return (
    <div className="grafico" role="img" aria-label={`Saldo proyectado a ${dias} días; mínimo ${M(s[iMin].saldo)} el ${corta(s[iMin].fecha)}`}>
      <svg viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <clipPath id="sobre"><rect x="0" y="0" width={W} height={y(0)} /></clipPath>
          <clipPath id="bajo"><rect x="0" y={y(0)} width={W} height={H} /></clipPath>
        </defs>
        {ticks.map(t => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--borde)" strokeWidth="1" />
            <text x={L - 6} y={y(t) + 4} fontSize="10" textAnchor="end" fill="var(--suave)">{M(t)}</text>
          </g>
        ))}
        <path d={area} fill="var(--verde-2)" opacity=".15" clipPath="url(#sobre)" />
        <path d={area} fill="var(--rojo)" opacity=".3" clipPath="url(#bajo)" />
        <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--suave)" strokeWidth="1" />
        <path d={linea} fill="none" stroke="var(--verde-2)" strokeWidth="2" clipPath="url(#sobre)" />
        <path d={linea} fill="none" stroke="var(--rojo)" strokeWidth="2" clipPath="url(#bajo)" />
        <circle cx={x(iMin)} cy={y(s[iMin].saldo)} r="4" fill={s[iMin].saldo < 0 ? 'var(--rojo)' : 'var(--verde-2)'} />
        <text x={Math.min(x(iMin), W - 90)} y={Math.min(y(s[iMin].saldo) + 16, H - B - 2)} fontSize="11" fontWeight="600" fill={s[iMin].saldo < 0 ? 'var(--rojo)' : 'var(--texto)'}>
          mín. {M(s[iMin].saldo)} · {corta(s[iMin].fecha)}
        </text>
        {marcasX.map(i => (
          <text key={i} x={x(i)} y={H - 6} fontSize="10" textAnchor={i === 0 ? 'start' : i === s.length - 1 ? 'end' : 'middle'} fill="var(--suave)">{corta(s[i].fecha)}</text>
        ))}
      </svg>
    </div>
  );
}
