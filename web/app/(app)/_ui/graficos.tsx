'use client';
// Gráficos en SVG puro (sin librerías): saldo diario con huecos y barras apiladas por categoría.
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ejeM, fCorta, fLarga, MESES, millones, pesos, type Evento, type MesCat, type Pronostico } from './formato';
import s from '../app.module.css';

function ticks(min: number, max: number, n = 5): number[] {
  const span = max - min || 1;
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v / step) * step);
  return out;
}
function useAncho<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.round(el.clientWidth)));
    ro.observe(el);
    setW(Math.round(el.clientWidth));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ====================================================================== */
type Punto = { fecha: string; saldo: number; entradas: number; salidas: number; corte?: boolean };

export function GraficoSaldo({ p, horizonte, compacto = false, conTabla = true }: { p: Pronostico; horizonte: number; compacto?: boolean; conTabla?: boolean }) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [idx, setIdx] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = compacto ? (W < 520 ? 180 : 210) : W < 520 ? 260 : 340;
  const m = { l: W < 520 ? 48 : 58, r: 12, t: 20, b: 26 };

  const pts: Punto[] = useMemo(
    () => [{ fecha: p.hoy, saldo: p.saldoInicial, entradas: 0, salidas: 0, corte: true }, ...p.serie.slice(0, horizonte)], [p, horizonte]);
  const porFecha = useMemo(() => {
    const mp = new Map<string, Evento[]>();
    for (const e of p.eventos) mp.set(e.fecha, [...(mp.get(e.fecha) ?? []), e]);
    return mp;
  }, [p.eventos]);

  const n = pts.length;
  const iw = Math.max(10, W - m.l - m.r), ih = H - m.t - m.b;
  const vals = pts.map(x => x.saldo);
  const mn = Math.min(0, ...vals), mx = Math.max(0, ...vals);
  const lo = mn < 0 ? mn - (mx - mn) * 0.12 : 0, hi = mx + (mx - mn) * 0.08;
  const x = (i: number) => m.l + (i / Math.max(1, n - 1)) * iw;
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo || 1)) * ih;
  const y0 = y(0);
  const linea = pts.map((q, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(q.saldo).toFixed(1)}`).join('');
  const area = `${linea}L${x(n - 1).toFixed(1)},${y0.toFixed(1)}L${x(0).toFixed(1)},${y0.toFixed(1)}Z`;
  const yt = ticks(lo, hi, compacto || W < 520 ? 3 : 5);
  const xt = pts.map((q, i) => ({ q, i }))
    .filter(({ q, i }) => i > 0 && (q.fecha.slice(8) === '01' || (horizonte <= 30 && +q.fecha.slice(8) % 7 === 0)))
    .filter(({ i }) => x(i) - x(0) > 34);
  const hayNeg = vals.some(v => v < 0);

  const ultima = pts[n - 1].fecha;
  const huecos = p.huecos.filter(hu => hu.inicio <= ultima).map(hu => {
    const i0 = pts.findIndex(q => q.fecha === hu.inicio);
    const iF = hu.fin ? pts.findIndex(q => q.fecha === hu.fin) : -1;
    const i1 = iF < 0 ? n - 1 : iF;
    let vi = i0;
    for (let k = Math.max(0, i0); k <= i1; k++) if (pts[k].saldo < pts[vi].saldo) vi = k;
    return { hu, i0: Math.max(0, i0), i1, vi, vmin: pts[vi]?.saldo ?? hu.minimo };
  });

  const resumen = `Saldo proyectado a ${horizonte} días: hoy ${millones(p.saldoInicial)}, mínimo ${millones(Math.min(...vals))}, final ${millones(pts[n - 1].saldo)}.` +
    (huecos.length ? ` ${huecos.length} ${huecos.length > 1 ? 'tramos' : 'tramo'} en rojo: ${huecos.map(k => `desde el ${fCorta(k.hu.inicio)}, mínimo ${millones(k.vmin)}`).join('; ')}.` : ' Sin días en rojo.');

  const mover = (clientX: number, el: SVGSVGElement) => {
    const r = el.getBoundingClientRect();
    const px = ((clientX - r.left) / r.width) * W;
    setIdx(Math.max(0, Math.min(n - 1, Math.round(((px - m.l) / iw) * (n - 1)))));
  };
  const act = idx !== null && idx < n ? pts[idx] : null;
  const evs = act ? (porFecha.get(act.fecha) ?? []).slice().sort((a, b) => Math.abs(b.monto) - Math.abs(a.monto)) : [];
  const tipLeft = act ? (x(idx!) > W * 0.55 ? x(idx!) - 270 : x(idx!) + 14) : 0;

  return (
    <div ref={ref} className={s.chart}>
      {!compacto && (
        <div className={s.legend} aria-hidden>
          <span><i className={`${s.sw} ${s.swLinea}`} style={{ borderColor: 'var(--accent)' }} />Saldo proyectado</span>
          {hayNeg && <span><i className={`${s.sw} ${s.swLinea}`} style={{ borderColor: 'var(--neg)' }} />Saldo en rojo</span>}
          {hayNeg && <span><i className={s.sw} style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg)' }} />Hueco de caja</span>}
        </div>
      )}
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" tabIndex={0} aria-label={resumen}
          onPointerMove={e => mover(e.clientX, e.currentTarget)} onPointerDown={e => mover(e.clientX, e.currentTarget)} onPointerLeave={() => setIdx(null)}
          onFocus={() => setIdx(i => i ?? 0)} onBlur={() => setIdx(null)}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') { setIdx(i => Math.min(n - 1, (i ?? -1) + 1)); e.preventDefault(); }
            else if (e.key === 'ArrowLeft') { setIdx(i => Math.max(0, (i ?? 1) - 1)); e.preventDefault(); }
            else if (e.key === 'Escape') setIdx(null);
          }}>
          <defs>
            <clipPath id={`${uid}a`}><rect x={m.l} y={0} width={iw} height={Math.max(0, y0)} /></clipPath>
            <clipPath id={`${uid}b`}><rect x={m.l} y={y0} width={iw} height={Math.max(0, H - y0)} /></clipPath>
            <linearGradient id={`${uid}g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--accent)" stopOpacity={0.22} />
              <stop offset="1" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {yt.map(v => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={1} />
              <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{ejeM(v)}</text>
            </g>
          ))}
          {huecos.map((k, j) => (
            <rect key={j} x={x(k.i0)} y={m.t} width={Math.max(2, x(k.i1) - x(k.i0))} height={ih} fill="var(--neg-soft)" />
          ))}
          <path d={area} clipPath={`url(#${uid}a)`} fill={`url(#${uid}g)`} />
          <path d={area} clipPath={`url(#${uid}b)`} fill="var(--neg)" fillOpacity={0.22} />
          <path d={linea} clipPath={`url(#${uid}a)`} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
          <path d={linea} clipPath={`url(#${uid}b)`} fill="none" stroke="var(--neg)" strokeWidth={2} strokeLinejoin="round" />
          {hayNeg && <line x1={m.l} x2={m.l + iw} y1={y0} y2={y0} stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="4 4" />}
          {xt.map(({ q, i }) => (
            <text key={q.fecha} x={x(i)} y={H - 6} textAnchor="middle">{+q.fecha.slice(8)} {MESES[+q.fecha.slice(5, 7) - 1]}</text>
          ))}
          <text x={x(0)} y={H - 6} textAnchor="start" className="eje">hoy</text>
          {huecos.map((k, j) => {
            const cx = x(k.vi), cy = y(k.vmin);
            const ancla = cx > m.l + iw - 100 ? 'end' : cx < m.l + 100 ? 'start' : 'middle';
            const ly = Math.min(H - m.b - 4, cy + 18);
            return (
              <g key={`h${j}`}>
                <circle cx={cx} cy={cy} r={4.5} fill="var(--neg)" stroke="var(--surface)" strokeWidth={2} />
                {(!compacto || j === 0) && <text x={cx} y={ly} textAnchor={ancla} className="anot">{millones(k.vmin)} · {fCorta(k.hu.fechaMinimo)}</text>}
              </g>
            );
          })}
          <circle cx={x(n - 1)} cy={y(pts[n - 1].saldo)} r={3.5} fill={pts[n - 1].saldo < 0 ? 'var(--neg)' : 'var(--accent)'} stroke="var(--surface)" strokeWidth={2} />
          {act && (
            <g pointerEvents="none">
              <line x1={x(idx!)} x2={x(idx!)} y1={m.t} y2={m.t + ih} stroke="var(--ink-2)" strokeWidth={1} />
              <circle cx={x(idx!)} cy={y(act.saldo)} r={5} fill={act.saldo < 0 ? 'var(--neg)' : 'var(--accent)'} stroke="var(--surface)" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {act && W > 0 && (
        <div className={s.tooltip} style={{ left: Math.max(4, Math.min(W - 264, tipLeft)), top: compacto ? 4 : 30 }} role="status">
          <div className={s.tipHead}>{act.corte ? 'Hoy, ' : ''}{fLarga(act.fecha)}</div>
          <div className={s.tipRow}><span>Saldo</span><b className={`${s.num} ${act.saldo < 0 ? s.neg : ''}`}>{pesos(act.saldo)}</b></div>
          {!act.corte && <>
            <div className={s.tipRow}><span>Entra</span><span className={s.num}>{pesos(act.entradas)}</span></div>
            <div className={s.tipRow}><span>Sale</span><span className={s.num}>{pesos(-act.salidas)}</span></div>
          </>}
          {evs.length > 0 && <div className={s.tipSep} />}
          {evs.slice(0, 5).map((e, i) => (
            <div className={s.tipRow} key={i}><span title={e.concepto}>{e.concepto}</span><span className={s.num}>{millones(e.monto)}</span></div>
          ))}
          {evs.length > 5 && <div className={s.tipRow}><span>y {evs.length - 5} movimientos más</span></div>}
        </div>
      )}
      {conTabla && (
        <details className={s.details}>
          <summary>Ver los datos del gráfico en una tabla</summary>
          <div className={`${s.scroller} ${s.scrollerAlto}`} tabIndex={0} role="region" aria-label="Saldo diario en tabla">
            <table className={s.tabla}>
              <caption className={s.sr}>Saldo diario proyectado</caption>
              <thead><tr><th scope="col">Fecha</th><th scope="col" className={s.der}>Entradas</th><th scope="col" className={s.der}>Salidas</th><th scope="col" className={s.der}>Saldo</th></tr></thead>
              <tbody>{pts.slice(1).map(q => (
                <tr key={q.fecha}><th scope="row" style={{ fontWeight: 400 }}>{fCorta(q.fecha)}</th><td className={s.der}>{pesos(q.entradas)}</td><td className={s.der}>{pesos(-q.salidas)}</td><td className={`${s.der} ${q.saldo < 0 ? s.neg : ''}`}>{pesos(q.saldo)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

/* ====================================================================== */
/* Entradas y salidas por categoría: meses reales + proyectados             */
type Grupo = { nombre: string; color: string };
const G: Record<string, Grupo> = {
  ventas: { nombre: 'Ventas (tarjeta/QR)', color: 'var(--s1)' },
  cobros: { nombre: 'Cobros a clientes', color: 'var(--s2)' },
  otros_ent: { nombre: 'Otras entradas', color: 'var(--s3)' },
  proveedores: { nombre: 'Proveedores', color: 'var(--s1)' },
  personal: { nombre: 'Personal (sueldos, SAC, cargas)', color: 'var(--s2)' },
  impuestos: { nombre: 'Impuestos', color: 'var(--s3)' },
  fijos: { nombre: 'Alquiler y servicios', color: 'var(--s4)' },
  otros_sal: { nombre: 'Retiros, bancarios y otros', color: 'var(--s5)' },
};
export const ENT = ['ventas', 'cobros', 'otros_ent'], SAL = ['proveedores', 'personal', 'impuestos', 'fijos', 'otros_sal'];
function grupoDe(cat: string, signo: 1 | -1): string {
  if (signo > 0) return cat === 'ventas' ? 'ventas' : cat === 'cobro_clientes' ? 'cobros' : 'otros_ent';
  if (cat === 'proveedores') return 'proveedores';
  if (cat === 'sueldos' || cat === 'aguinaldo' || cat === 'cargas_sociales') return 'personal';
  if (cat === 'impuestos') return 'impuestos';
  if (cat === 'alquiler' || cat === 'servicios') return 'fijos';
  return 'otros_sal';
}
export type Barra = { mes: string; etiqueta: string; real: boolean; parcial: boolean; dias: number; diasMes: number; valores: Record<string, number>; total: number };

export function armarBarras(mensual: MesCat[], lado: 'ent' | 'sal'): Barra[] {
  const signo = lado === 'ent' ? 1 : -1;
  const hist = mensual.filter(x => x.real).slice(-6);
  const proy = mensual.filter(x => !x.real);
  return [...hist, ...proy].map(x => {
    const valores: Record<string, number> = {};
    for (const [cat, v] of Object.entries(x.porCategoria)) {
      if (!v || Math.sign(v) !== signo) continue;
      const g = grupoDe(cat, signo);
      valores[g] = (valores[g] ?? 0) + Math.abs(v);
    }
    const mm = +x.mes.slice(5, 7);
    return { mes: x.mes, etiqueta: MESES[mm - 1] + (mm === 1 ? ` ${x.mes.slice(2, 4)}` : ''), real: x.real, parcial: x.dias < x.diasMes - 3, dias: x.dias, diasMes: x.diasMes, valores, total: Object.values(valores).reduce((a, b) => a + b, 0) };
  });
}

function techo(x0: number, y0: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h);
  return `M${x0},${y0 + h}V${y0 + rr}Q${x0},${y0} ${x0 + rr},${y0}H${x0 + w - rr}Q${x0 + w},${y0} ${x0 + w},${y0 + rr}V${y0 + h}Z`;
}

export function BarrasApiladas({ barras, grupos, titulo }: { barras: Barra[]; grupos: string[]; titulo: string }) {
  const [ref, W] = useAncho<HTMLDivElement>();
  const [act, setAct] = useState<number | null>(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const H = 250;
  const m = { l: 46, r: 4, t: 18, b: 40 };
  const n = barras.length;
  const iw = Math.max(10, W - m.l - m.r), ih = H - m.t - m.b;
  const max = Math.max(1, ...barras.map(b => b.total));
  const yt = ticks(0, max * 1.05, 4);
  const top = yt[yt.length - 1] || max;
  const y = (v: number) => m.t + (1 - v / top) * ih;
  const paso = iw / Math.max(1, n), bw = Math.min(34, paso * 0.62);
  const cx = (i: number) => m.l + paso * i + paso / 2;
  const iCorte = barras.findIndex(b => !b.real);
  const resumen = `${titulo}: ${barras.map(b => `${b.etiqueta} ${b.real ? 'real' : 'proyectado'} ${millones(b.total)}`).join(', ')}.`;
  const a = act !== null ? barras[act] : null;
  const usados = grupos.filter(g => barras.some(b => b.valores[g]));
  return (
    <div ref={ref} className={s.chart}>
      <div className={s.legend}>
        {usados.map(g => <span key={g}><i className={s.sw} style={{ background: G[g].color }} />{G[g].nombre}</span>)}
      </div>
      {W > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={resumen} onPointerLeave={() => setAct(null)}>
          <defs>
            <pattern id={`${uid}h`} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={6} height={6} fill="var(--surface)" fillOpacity={0.45} />
              <rect width={2.2} height={6} fill="var(--surface)" />
            </pattern>
          </defs>
          {yt.map(v => (
            <g key={v}>
              <line x1={m.l} x2={m.l + iw} y1={y(v)} y2={y(v)} stroke={v === 0 ? 'var(--line-2)' : 'var(--grid)'} />
              <text x={m.l - 6} y={y(v) + 4} textAnchor="end">{ejeM(v)}</text>
            </g>
          ))}
          {iCorte > 0 && (
            <g>
              <line x1={m.l + paso * iCorte} x2={m.l + paso * iCorte} y1={m.t - 6} y2={H - 16} stroke="var(--ink-2)" strokeDasharray="3 4" />
              <text x={m.l + paso * iCorte - 6} y={H - 3} textAnchor="end" className="eje">real</text>
              <text x={m.l + paso * iCorte + 6} y={H - 3} textAnchor="start" className="eje">proyectado</text>
            </g>
          )}
          {barras.map((b, i) => {
            let acum = 0;
            const segs = grupos.filter(g => b.valores[g]).map(g => { const v = b.valores[g]; const y1 = y(acum + v), y0 = y(acum); acum += v; return { g, y1, h: y0 - y1 }; });
            return (
              <g key={b.mes} tabIndex={0} role="img" aria-label={`${b.etiqueta}, ${b.real ? 'real' : 'proyectado'}: ${millones(b.total)}`} opacity={act !== null && act !== i ? 0.5 : 1}
                onPointerEnter={() => setAct(i)} onPointerDown={() => setAct(i)} onFocus={() => setAct(i)} onBlur={() => setAct(null)}>
                <rect x={m.l + paso * i} y={m.t - 6} width={paso} height={ih + 6} fill="transparent" />
                {segs.map((sg, k) => {
                  const d = k === segs.length - 1 ? techo(cx(i) - bw / 2, sg.y1, bw, sg.h, 4) : `M${cx(i) - bw / 2},${sg.y1}h${bw}v${sg.h}h${-bw}Z`;
                  return (
                    <g key={sg.g}>
                      <path d={d} fill={G[sg.g].color} stroke="var(--surface)" strokeWidth={2} />
                      {!b.real && <path d={d} fill={`url(#${uid}h)`} />}
                    </g>
                  );
                })}
                <text x={cx(i)} y={H - m.b + 16} textAnchor="middle">{b.etiqueta}{b.parcial ? '*' : ''}</text>
              </g>
            );
          })}
        </svg>
      )}
      {a && W > 0 && (
        <div className={s.tooltip} style={{ left: Math.max(4, Math.min(W - 264, cx(act!) - 130)), top: 26 }} role="status">
          <div className={s.tipHead}>{MESES[+a.mes.slice(5, 7) - 1]} {a.mes.slice(0, 4)} · {a.real ? 'real' : 'proyectado'}{a.parcial ? ` (${a.dias} de ${a.diasMes} días)` : ''}</div>
          {grupos.filter(g => a.valores[g]).map(g => (
            <div className={s.tipRow} key={g}><span><i className={s.sw} style={{ background: G[g].color }} />{G[g].nombre}</span><span className={s.num}>{millones(a.valores[g])}</span></div>
          ))}
          <div className={s.tipSep} />
          <div className={s.tipRow}><span>Total</span><b className={s.num}>{millones(a.total)}</b></div>
        </div>
      )}
    </div>
  );
}

export function TablaBarras({ barras, grupos, titulo }: { barras: Barra[]; grupos: string[]; titulo: string }) {
  const gs = grupos.filter(g => barras.some(b => b.valores[g]));
  return (
    <div className={s.scroller} tabIndex={0} role="region" aria-label={titulo}>
      <table className={s.tabla}>
        <caption className={s.sr}>{titulo}</caption>
        <thead><tr>
          <th scope="col">Mes</th>
          {gs.map(g => <th scope="col" key={g} className={s.der}>{G[g].nombre}</th>)}
          <th scope="col" className={s.der}>Total</th>
        </tr></thead>
        <tbody>{barras.map(b => (
          <tr key={b.mes}>
            <th scope="row" style={{ fontWeight: 400, whiteSpace: 'nowrap' }}>{b.etiqueta}{b.parcial ? '*' : ''} <span className={s.chip}>{b.real ? 'real' : 'proyectado'}</span></th>
            {gs.map(g => <td key={g} className={s.der}>{b.valores[g] ? millones(b.valores[g]) : '–'}</td>)}
            <td className={s.der}><b>{millones(b.total)}</b></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
