#!/usr/bin/env python3
"""
Genera la base de MERCADO FICTICIO de CFO de Bolsillo (SQLite + CSV).

Todo es inventado: empresas, tickers (terminan en "-F"), precios, balances y eventos.
Es reproducible: con la misma SEED siempre sale la misma base.

Uso:
    python3 seed.py            # crea mercado_ficticio.db y la carpeta ../csv
Requisitos: python 3.9+ y numpy.
"""
import csv
import math
import os
import sqlite3
from datetime import date, timedelta

import numpy as np

SEED = 20261031
FECHA_INICIO = date(2024, 11, 1)
FECHA_CORTE = date(2026, 10, 30)
TASA_REFERENCIA_FICTICIA = 0.30  # TNA ficticia usada para el ratio retorno/riesgo

AQUI = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(AQUI, "mercado_ficticio.db")
CSV_DIR = os.path.join(AQUI, "..", "csv")

# --------------------------------------------------------------------------------------
# Empresas ficticias
# --------------------------------------------------------------------------------------
# beta: sensibilidad al mercado | mu: deriva diaria | sig: volatilidad propia diaria
# pe: P/E objetivo al corte (None = pierde plata) | nm: margen neto | em: margen EBITDA
# lev: deuda neta / EBITDA | roe: ROE objetivo | g: crecimiento trimestral de ingresos
# dy: dividend yield anual objetivo (0 = no paga)
EMPRESAS = [
    dict(t="AURA-F", n="Aurora Agro S.A.", s="Agro", d="Produce y exporta granos y oleaginosas. Su resultado depende del clima y del precio internacional.",
         sh=420, p0=1850, beta=0.8, mu=0.0006, sig=0.015, pe=9, nm=0.09, em=0.17, lev=1.2, roe=0.22, g=0.025, dy=0.035),
    dict(t="BORE-F", n="Boreal Energía S.A.", s="Energía", d="Generación y distribución de energía eléctrica con contratos de largo plazo.",
         sh=610, p0=2400, beta=1.1, mu=0.0007, sig=0.017, pe=11, nm=0.12, em=0.30, lev=2.4, roe=0.19, g=0.030, dy=0.045),
    dict(t="CALD-F", n="Caldén Bancorp S.A.", s="Banca", d="Banco regional con foco en pymes y préstamos personales.",
         sh=950, p0=1320, beta=1.3, mu=0.0005, sig=0.019, pe=7, nm=0.18, em=0.28, lev=0.5, roe=0.26, g=0.020, dy=0.060),
    dict(t="DNUB-F", n="Delta Nube Tecnología S.A.", s="Tecnología", d="Software de gestión en la nube para empresas. Crece rápido pero todavía no es rentable.",
         sh=180, p0=3100, beta=1.5, mu=0.0003, sig=0.026, pe=None, nm=-0.06, em=0.08, lev=1.5, roe=-0.10, g=0.060, dy=0.0),
    dict(t="ESFD-F", n="Estancia Foods S.A.", s="Alimentos", d="Elabora y distribuye alimentos envasados para supermercados.",
         sh=300, p0=980, beta=0.7, mu=0.0005, sig=0.014, pe=14, nm=0.07, em=0.13, lev=1.8, roe=0.16, g=0.015, dy=0.025),
    dict(t="FARO-F", n="Faro Telecom S.A.", s="Telecomunicaciones", d="Internet fija y telefonía móvil en el interior del país.",
         sh=720, p0=1640, beta=0.9, mu=0.0004, sig=0.014, pe=13, nm=0.10, em=0.33, lev=2.9, roe=0.14, g=0.018, dy=0.040),
    dict(t="GLAC-F", n="Glaciar Litio S.A.", s="Minería", d="Proyecto de extracción de litio en etapa de expansión. Muy sensible al precio internacional.",
         sh=260, p0=2750, beta=1.4, mu=0.0007, sig=0.024, pe=28, nm=0.15, em=0.38, lev=3.4, roe=0.12, g=0.055, dy=0.0),
    dict(t="HORI-F", n="Horizonte Construcciones S.A.", s="Construcción", d="Obras civiles y desarrollos inmobiliarios. Depende del crédito y de la obra pública.",
         sh=380, p0=760, beta=1.2, mu=0.0003, sig=0.020, pe=10, nm=0.06, em=0.11, lev=2.2, roe=0.15, g=0.010, dy=0.020),
    dict(t="ISLA-F", n="Isla Salud S.A.", s="Salud", d="Clínicas y laboratorios de análisis con convenios con prepagas.",
         sh=210, p0=2200, beta=0.6, mu=0.0006, sig=0.013, pe=17, nm=0.11, em=0.19, lev=0.9, roe=0.21, g=0.028, dy=0.015),
    dict(t="JACA-F", n="Jacarandá Retail S.A.", s="Retail", d="Cadena de tiendas de indumentaria y hogar con venta online.",
         sh=530, p0=640, beta=1.1, mu=0.0003, sig=0.021, pe=12, nm=0.05, em=0.10, lev=2.0, roe=0.11, g=0.008, dy=0.020),
    dict(t="KUNT-F", n="Kuntur Logística S.A.", s="Logística", d="Transporte de carga y almacenes para empresas exportadoras.",
         sh=340, p0=1480, beta=1.0, mu=0.0005, sig=0.016, pe=15, nm=0.08, em=0.16, lev=1.6, roe=0.17, g=0.022, dy=0.025),
    dict(t="LUME-F", n="Lumen Consumo S.A.", s="Consumo masivo", d="Productos de limpieza y cuidado personal de venta en almacenes y supermercados.",
         sh=460, p0=1120, beta=0.7, mu=0.0004, sig=0.013, pe=16, nm=0.09, em=0.15, lev=1.1, roe=0.20, g=0.012, dy=0.030),
]

# Eventos ficticios: (fecha, ticker o None, tipo, titulo, impacto %)
EVENTOS = [
    ("2025-03-12", None, "mercado", "Shock cambiario ficticio: el mercado cae con fuerza", -7.0),
    ("2025-08-20", "BORE-F", "resultado", "Boreal Energía presenta un resultado mejor al esperado (ficticio)", 8.0),
    ("2025-09-17", None, "mercado", "Rebote ficticio por acuerdo financiero: el mercado sube", 5.0),
    ("2025-11-20", "DNUB-F", "resultado", "Delta Nube informa pérdidas mayores a las esperadas (ficticio)", -10.0),
    ("2026-01-27", "AURA-F", "sector", "Sequía ficticia afecta la cosecha estimada de Aurora Agro", -5.0),
    ("2026-02-10", None, "mercado", "Suba de tasas ficticia: el mercado retrocede", -4.0),
    ("2026-03-04", "GLAC-F", "sector", "Glaciar Litio anuncia un nuevo proyecto de expansión (ficticio)", 12.0),
    ("2026-05-14", "CALD-F", "resultado", "Caldén Bancorp reporta suba de morosidad (ficticio)", -6.0),
    ("2026-08-12", "FARO-F", "resultado", "Faro Telecom supera las expectativas de ingresos (ficticio)", 4.0),
]

FECHAS_DIVIDENDO = ["2025-05-15", "2025-11-14", "2026-05-15"]
PERIODOS = [
    ("2024-Q3", "2024-09-30"), ("2024-Q4", "2024-12-31"), ("2025-Q1", "2025-03-31"), ("2025-Q2", "2025-06-30"),
    ("2025-Q3", "2025-09-30"), ("2025-Q4", "2025-12-31"), ("2026-Q1", "2026-03-31"), ("2026-Q2", "2026-06-30"),
]


def dias_habiles(desde, hasta):
    d, out = desde, []
    while d <= hasta:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def generar_precios(rng, fechas):
    n = len(fechas)
    idx_fecha = {f.isoformat(): i for i, f in enumerate(fechas)}
    mkt = rng.normal(0.0004, 0.011, n)
    sector_ruido = {}
    saltos_mercado = np.zeros(n)
    saltos_empresa = {e["t"]: np.zeros(n) for e in EMPRESAS}
    for f, t, _tipo, _tit, imp in EVENTOS:
        i = idx_fecha[f]
        if t is None:
            saltos_mercado[i] += math.log(1 + imp / 100)
        else:
            saltos_empresa[t][i] += math.log(1 + imp / 100)

    precios, retornos_simples = {}, {}
    for e in EMPRESAS:
        s = e["s"]
        if s not in sector_ruido:
            sector_ruido[s] = rng.normal(0, 0.007, n)
        idio = rng.normal(0, e["sig"], n)
        r = e["mu"] + e["beta"] * (mkt + saltos_mercado) + sector_ruido[s] + idio + saltos_empresa[e["t"]]
        # Piso/techo para evitar movimientos diarios absurdos (los eventos ya son explícitos)
        r = np.clip(r, -0.18, 0.18)
        cierre = e["p0"] * np.exp(np.cumsum(r))
        apertura = np.empty(n)
        apertura[0] = e["p0"]
        apertura[1:] = cierre[:-1] * (1 + rng.normal(0, 0.004, n - 1))
        maximo = np.maximum(apertura, cierre) * (1 + np.abs(rng.normal(0, 0.006, n)))
        minimo = np.minimum(apertura, cierre) * (1 - np.abs(rng.normal(0, 0.006, n)))
        vol_base = 30000 + 3500 * e["sh"] ** 0.5
        volumen = (vol_base * np.exp(rng.normal(0, 0.45, n)) * (1 + 6 * np.abs(r))).astype(int)
        precios[e["t"]] = dict(apertura=np.round(apertura, 2), maximo=np.round(maximo, 2),
                               minimo=np.round(minimo, 2), cierre=np.round(cierre, 2), volumen=volumen)
    return precios


def generar_fundamentales(rng, precios):
    filas = []
    for e in EMPRESAS:
        precio_final = precios[e["t"]]["cierre"][-1]
        mkt_cap = precio_final * e["sh"]  # millones de ARS
        if e["pe"] is not None:
            rn_ttm = mkt_cap / e["pe"]
            ing_ttm = rn_ttm / e["nm"]
        else:
            ing_ttm = mkt_cap / 4.0
            rn_ttm = ing_ttm * e["nm"]
        pesos = np.array([(1 + e["g"]) ** i * (1 + rng.normal(0, 0.03)) for i in range(8)])
        k = ing_ttm / pesos[4:].sum()
        ing_q = pesos * k
        ebitda_q = ing_q * e["em"] * (1 + rng.normal(0, 0.03, 8))
        rn_q = ing_q * e["nm"] * (1 + rng.normal(0, 0.06, 8)) if e["pe"] is not None else ing_q * e["nm"] * (1 + rng.normal(0, 0.15, 8))
        ebitda_ttm_final = ebitda_q[4:].sum()
        deuda_final = e["lev"] * ebitda_ttm_final
        patrimonio_final = abs(rn_ttm) / abs(e["roe"])
        for i, (per, cierre) in enumerate(PERIODOS):
            factor_t = (i - 7) / 7.0  # 0 en el último trimestre, -1 en el primero
            deuda = deuda_final * (1 - 0.10 * factor_t + rng.normal(0, 0.02))
            patrimonio = patrimonio_final * (1 + 0.12 * factor_t + rng.normal(0, 0.01))
            fecha_cierre = date.fromisoformat(cierre)
            filas.append((e["t"], per, cierre, (fecha_cierre + timedelta(days=45)).isoformat(),
                          round(float(ing_q[i]), 1), round(float(ebitda_q[i]), 1), round(float(rn_q[i]), 1),
                          round(float(deuda), 1), round(float(patrimonio), 1)))
    return filas


def generar_dividendos(precios, fechas):
    idx = {f.isoformat(): i for i, f in enumerate(fechas)}
    filas = []
    for e in EMPRESAS:
        if e["dy"] <= 0:
            continue
        for f in FECHAS_DIVIDENDO:
            p = float(precios[e["t"]]["cierre"][idx[f]])
            filas.append((e["t"], f, round(p * e["dy"] / 2, 2)))
    return filas


def rank_pct(valores, mayor_es_mejor):
    """Percentil 0-100 dentro del universo. Los None puntúan 0. Empates: promedio."""
    validos = {k: v for k, v in valores.items() if v is not None}
    n = len(validos)
    out = {}
    for k, v in valores.items():
        if v is None:
            out[k] = 0.0
            continue
        peores = sum(1 for x in validos.values() if (x < v if mayor_es_mejor else x > v))
        iguales = sum(1 for x in validos.values() if x == v) - 1
        out[k] = 100.0 * (peores + 0.5 * iguales) / (n - 1) if n > 1 else 50.0
    return out


def calcular_metricas(precios, fund, divs, idx_valor, fechas):
    corte = FECHA_CORTE.isoformat()
    n_cierres = 253  # ventana de 12 meses: 253 cierres = 252 retornos
    ret_idx = np.diff(idx_valor[-n_cierres:]) / idx_valor[-n_cierres:-1]
    m = {}
    for e in EMPRESAS:
        t = e["t"]
        c = precios[t]["cierre"].astype(float)
        w = c[-n_cierres:]
        rs = np.diff(w) / w[:-1]
        lr = np.diff(np.log(w))
        pico = np.maximum.accumulate(w)
        qs = sorted([f for f in fund if f[0] == t], key=lambda f: f[2])
        ing = np.array([f[4] for f in qs]); ebd = np.array([f[5] for f in qs]); rn = np.array([f[6] for f in qs])
        deuda = qs[-1][7]; patr = qs[-1][8]
        ing_ttm, ing_prev = ing[4:].sum(), ing[:4].sum()
        ebd_ttm, rn_ttm = ebd[4:].sum(), rn[4:].sum()
        precio = float(c[-1])
        eps = rn_ttm / e["sh"]
        mkt_cap = precio * e["sh"]
        corte_div = (FECHA_CORTE - timedelta(days=365)).isoformat()
        div_12m = sum(d[2] for d in divs if d[0] == t and corte_div < d[1] <= corte)
        m[t] = dict(
            precio=precio,
            ret_1m=precio / c[-22] - 1, ret_3m=precio / c[-64] - 1, ret_6m=precio / c[-127] - 1, ret_12m=precio / w[0] - 1,
            vol_anual=float(np.std(lr, ddof=1) * math.sqrt(252)),
            max_dd_12m=float(np.min(w / pico - 1)),
            beta_12m=float(np.cov(rs, ret_idx, ddof=1)[0, 1] / np.var(ret_idx, ddof=1)),
            mkt_cap_mm=mkt_cap, eps_ttm=eps,
            pe=precio / eps if eps > 0 else None,
            ev_ebitda=(mkt_cap + deuda) / ebd_ttm if ebd_ttm > 0 else None,
            deuda_neta_ebitda=deuda / ebd_ttm if ebd_ttm > 0 else None,
            margen_ebitda=ebd_ttm / ing_ttm, roe=rn_ttm / patr,
            crec_ingresos=ing_ttm / ing_prev - 1, div_yield=div_12m / precio,
        )
    tick = [e["t"] for e in EMPRESAS]
    g = lambda k: {t: m[t][k] for t in tick}
    r_pe = rank_pct(g("pe"), False); r_ev = rank_pct(g("ev_ebitda"), False)
    r_mg = rank_pct(g("margen_ebitda"), True); r_roe = rank_pct(g("roe"), True)
    r_cr = rank_pct(g("crec_ingresos"), True); r_de = rank_pct(g("deuda_neta_ebitda"), False)
    r_vo = rank_pct(g("vol_anual"), False); r_dd = rank_pct(g("max_dd_12m"), True)
    for t in tick:
        s = dict(
            score_valuacion=(r_pe[t] + r_ev[t]) / 2, score_calidad=(r_mg[t] + r_roe[t]) / 2,
            score_crecimiento=r_cr[t], score_solidez=r_de[t], score_riesgo=(r_vo[t] + r_dd[t]) / 2,
        )
        total = (0.25 * s["score_valuacion"] + 0.25 * s["score_calidad"] + 0.15 * s["score_crecimiento"]
                 + 0.15 * s["score_solidez"] + 0.20 * s["score_riesgo"])
        s["score_total"] = total
        s["lectura"] = "Atractiva" if total >= 65 else ("Neutral" if total >= 40 else "Con cautela")
        m[t].update(s)
    return m


def main():
    rng = np.random.default_rng(SEED)
    fechas = dias_habiles(FECHA_INICIO, FECHA_CORTE)
    precios = generar_precios(rng, fechas)
    fund = generar_fundamentales(rng, precios)
    divs = generar_dividendos(precios, fechas)

    # Índice ficticio IF12: equiponderado, base 100
    mat = np.array([precios[e["t"]]["cierre"] for e in EMPRESAS], dtype=float)
    ret = np.diff(mat, axis=1) / mat[:, :-1]
    ret_idx = np.concatenate([[0.0], ret.mean(axis=0)])
    idx_valor = 100 * np.cumprod(1 + ret_idx)

    metricas = calcular_metricas(precios, fund, divs, idx_valor, fechas)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    con = sqlite3.connect(DB_PATH)
    with open(os.path.join(AQUI, "schema.sql"), encoding="utf-8") as f:
        con.executescript(f.read())

    meta = {
        "aviso": "MERCADO FICTICIO. Empresas, tickers, precios, balances y eventos son inventados. No es información de mercado ni una recomendación de inversión.",
        "fecha_corte": FECHA_CORTE.isoformat(),
        "fecha_inicio": FECHA_INICIO.isoformat(),
        "moneda": "ARS",
        "indice": "IF12 (Índice Ficticio 12, equiponderado, base 100 al inicio)",
        "tasa_referencia_ficticia": str(TASA_REFERENCIA_FICTICIA),
        "ventana_12m_cierres": "253",
        "semilla": str(SEED),
        "version": "1.0",
    }
    con.executemany("INSERT INTO meta VALUES (?,?)", meta.items())
    con.executemany("INSERT INTO empresas VALUES (?,?,?,?,?,?,1)",
                    [(e["t"], e["n"], e["s"], e["d"], "ARS", e["sh"]) for e in EMPRESAS])
    filas_p = []
    for e in EMPRESAS:
        p = precios[e["t"]]
        for i, f in enumerate(fechas):
            filas_p.append((e["t"], f.isoformat(), float(p["apertura"][i]), float(p["maximo"][i]),
                            float(p["minimo"][i]), float(p["cierre"][i]), int(p["volumen"][i])))
    con.executemany("INSERT INTO precios_diarios VALUES (?,?,?,?,?,?,?)", filas_p)
    con.executemany("INSERT INTO indice_diario VALUES (?,?,?)",
                    [(f.isoformat(), round(float(v), 4), round(float(r), 6)) for f, v, r in zip(fechas, idx_valor, ret_idx)])
    con.executemany("INSERT INTO fundamentales_trimestrales VALUES (?,?,?,?,?,?,?,?,?)", fund)
    con.executemany("INSERT INTO dividendos VALUES (?,?,?)", divs)
    con.executemany("INSERT INTO eventos_ficticios (fecha,ticker,tipo,titulo,impacto_pct) VALUES (?,?,?,?,?)",
                    [(f, t, tipo, tit, imp) for f, t, tipo, tit, imp in EVENTOS])
    cols = ["ret_1m", "ret_3m", "ret_6m", "ret_12m", "vol_anual", "max_dd_12m", "beta_12m", "mkt_cap_mm", "eps_ttm",
            "pe", "ev_ebitda", "deuda_neta_ebitda", "margen_ebitda", "roe", "crec_ingresos", "div_yield",
            "score_valuacion", "score_calidad", "score_crecimiento", "score_solidez", "score_riesgo", "score_total"]
    for e in EMPRESAS:
        t = e["t"]; v = metricas[t]
        vals = [None if v[c] is None else round(float(v[c]), 4) for c in cols]
        con.execute(f"INSERT INTO metricas_snapshot (ticker,fecha_corte,precio,{','.join(cols)},lectura) VALUES ({','.join(['?'] * (4 + len(cols)))})",
                    [t, FECHA_CORTE.isoformat(), round(v["precio"], 2)] + vals + [v["lectura"]])
    con.commit()

    os.makedirs(CSV_DIR, exist_ok=True)
    for tabla in ["meta", "empresas", "precios_diarios", "indice_diario", "fundamentales_trimestrales",
                  "dividendos", "eventos_ficticios", "metricas_snapshot"]:
        cur = con.execute(f"SELECT * FROM {tabla}")
        with open(os.path.join(CSV_DIR, f"{tabla}.csv"), "w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow([d[0] for d in cur.description])
            w.writerows(cur.fetchall())
    con.close()
    print(f"OK: {DB_PATH} | días hábiles: {len(fechas)} | empresas: {len(EMPRESAS)}")


if __name__ == "__main__":
    main()
