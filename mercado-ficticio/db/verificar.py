#!/usr/bin/env python3
"""
Recalcula las métricas desde las tablas base (siguiendo las fórmulas de SKILL.md)
y las compara con metricas_snapshot. Sirve de modelo para el test del backend.

Uso: python3 verificar.py
"""
import math
import os
import sqlite3
from datetime import date, timedelta

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
con = sqlite3.connect(os.path.join(AQUI, "mercado_ficticio.db"))
corte = con.execute("SELECT valor FROM meta WHERE clave='fecha_corte'").fetchone()[0]
V = 253

fechas = [r[0] for r in con.execute("SELECT fecha FROM indice_diario ORDER BY fecha")]
idx = np.array([r[0] for r in con.execute("SELECT valor FROM indice_diario ORDER BY fecha")], dtype=float)
# El índice en la base está redondeado a 4 decimales; el snapshot se calculó con el valor sin redondear.
ret_idx = np.diff(idx[-V:]) / idx[-V:-1]

tickers = [r[0] for r in con.execute("SELECT ticker FROM empresas ORDER BY ticker")]
acc = dict(con.execute("SELECT ticker, acciones_circulacion_mm FROM empresas"))
calc = {}
for t in tickers:
    c = np.array([r[0] for r in con.execute("SELECT cierre FROM precios_diarios WHERE ticker=? ORDER BY fecha", (t,))], dtype=float)
    w = c[-V:]
    rs = np.diff(w) / w[:-1]
    lr = np.diff(np.log(w))
    q = con.execute("SELECT ingresos_mm, ebitda_mm, resultado_neto_mm, deuda_neta_mm, patrimonio_mm FROM fundamentales_trimestrales WHERE ticker=? ORDER BY fecha_cierre", (t,)).fetchall()
    ing = np.array([x[0] for x in q]); ebd = np.array([x[1] for x in q]); rn = np.array([x[2] for x in q])
    deuda, patr = q[-1][3], q[-1][4]
    precio = c[-1]
    eps = rn[4:].sum() / acc[t]
    mc = precio * acc[t]
    desde = (date.fromisoformat(corte) - timedelta(days=365)).isoformat()
    div = sum(r[0] for r in con.execute("SELECT monto_por_accion FROM dividendos WHERE ticker=? AND fecha_ex>? AND fecha_ex<=?", (t, desde, corte)))
    calc[t] = dict(
        ret_1m=precio / c[-22] - 1, ret_3m=precio / c[-64] - 1, ret_6m=precio / c[-127] - 1, ret_12m=precio / w[0] - 1,
        vol_anual=np.std(lr, ddof=1) * math.sqrt(252), max_dd_12m=np.min(w / np.maximum.accumulate(w) - 1),
        beta_12m=np.cov(rs, ret_idx, ddof=1)[0, 1] / np.var(ret_idx, ddof=1),
        pe=precio / eps if eps > 0 else None,
        ev_ebitda=(mc + deuda) / ebd[4:].sum() if ebd[4:].sum() > 0 else None,
        deuda_neta_ebitda=deuda / ebd[4:].sum() if ebd[4:].sum() > 0 else None,
        margen_ebitda=ebd[4:].sum() / ing[4:].sum(), roe=rn[4:].sum() / patr,
        crec_ingresos=ing[4:].sum() / ing[:4].sum() - 1, div_yield=div / precio,
    )


def pct(vals, mayor_mejor):
    ok = {k: v for k, v in vals.items() if v is not None}
    n = len(ok); out = {}
    for k, v in vals.items():
        if v is None:
            out[k] = 0.0; continue
        peores = sum(1 for x in ok.values() if (x < v if mayor_mejor else x > v))
        iguales = sum(1 for x in ok.values() if x == v) - 1
        out[k] = 100 * (peores + 0.5 * iguales) / (n - 1)
    return out


g = lambda k: {t: calc[t][k] for t in tickers}
pe, ev = pct(g("pe"), False), pct(g("ev_ebitda"), False)
mg, ro = pct(g("margen_ebitda"), True), pct(g("roe"), True)
cr, de = pct(g("crec_ingresos"), True), pct(g("deuda_neta_ebitda"), False)
vo, dd = pct(g("vol_anual"), False), pct(g("max_dd_12m"), True)
for t in tickers:
    calc[t]["score_total"] = (0.25 * (pe[t] + ev[t]) / 2 + 0.25 * (mg[t] + ro[t]) / 2 + 0.15 * cr[t]
                              + 0.15 * de[t] + 0.20 * (vo[t] + dd[t]) / 2)

errores = 0
con.row_factory = sqlite3.Row
for fila in con.execute("SELECT * FROM metricas_snapshot ORDER BY ticker"):
    for k, v in calc[fila["ticker"]].items():
        esperado = fila[k]
        tol = 0.01 if k == "score_total" else 0.0005
        if v is None or esperado is None:
            ok = v is None and esperado is None
        else:
            ok = abs(float(v) - esperado) <= tol * (1 if k == "score_total" else max(1, abs(esperado)))
        if not ok:
            errores += 1
            print(f"DIFERENCIA {fila['ticker']} {k}: calculado={v} snapshot={esperado}")
print("TODO COINCIDE" if errores == 0 else f"{errores} diferencias")
