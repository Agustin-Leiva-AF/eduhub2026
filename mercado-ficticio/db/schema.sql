-- Base de datos de MERCADO FICTICIO para CFO de Bolsillo
-- Todo el contenido es inventado. No representa empresas, precios ni tickers reales.
-- Motor de referencia: SQLite 3. Los tipos se pueden migrar a PostgreSQL sin cambios de fondo.

PRAGMA foreign_keys = ON;

CREATE TABLE meta (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE empresas (
  ticker TEXT PRIMARY KEY,                 -- siempre termina en "-F" (ficticio)
  nombre TEXT NOT NULL,
  sector TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  moneda TEXT NOT NULL DEFAULT 'ARS',
  acciones_circulacion_mm REAL NOT NULL,   -- millones de acciones
  es_ficticio INTEGER NOT NULL DEFAULT 1 CHECK (es_ficticio = 1)
);

CREATE TABLE precios_diarios (
  ticker TEXT NOT NULL REFERENCES empresas(ticker),
  fecha TEXT NOT NULL,                     -- AAAA-MM-DD (dias habiles lun-vie, sin feriados)
  apertura REAL NOT NULL,
  maximo REAL NOT NULL,
  minimo REAL NOT NULL,
  cierre REAL NOT NULL,
  volumen INTEGER NOT NULL,                -- acciones operadas
  PRIMARY KEY (ticker, fecha)
);

CREATE TABLE indice_diario (
  fecha TEXT PRIMARY KEY,
  valor REAL NOT NULL,                     -- Indice Ficticio 12 (IF12), base 100, equiponderado
  retorno_diario REAL NOT NULL
);

CREATE TABLE fundamentales_trimestrales (
  ticker TEXT NOT NULL REFERENCES empresas(ticker),
  periodo TEXT NOT NULL,                   -- 'AAAA-Qn'
  fecha_cierre TEXT NOT NULL,
  fecha_publicacion TEXT NOT NULL,
  ingresos_mm REAL NOT NULL,               -- millones de ARS, trimestre
  ebitda_mm REAL NOT NULL,
  resultado_neto_mm REAL NOT NULL,
  deuda_neta_mm REAL NOT NULL,             -- stock al cierre del trimestre
  patrimonio_mm REAL NOT NULL,             -- stock al cierre del trimestre
  PRIMARY KEY (ticker, periodo)
);

CREATE TABLE dividendos (
  ticker TEXT NOT NULL REFERENCES empresas(ticker),
  fecha_ex TEXT NOT NULL,
  monto_por_accion REAL NOT NULL,
  PRIMARY KEY (ticker, fecha_ex)
);

CREATE TABLE eventos_ficticios (
  id INTEGER PRIMARY KEY,
  fecha TEXT NOT NULL,
  ticker TEXT REFERENCES empresas(ticker), -- NULL = evento de todo el mercado
  tipo TEXT NOT NULL,                      -- 'mercado' | 'resultado' | 'sector' | 'dividendo'
  titulo TEXT NOT NULL,
  impacto_pct REAL NOT NULL                -- salto aplicado al precio ese dia (ya incluido en precios_diarios)
);

-- Foto de metricas calculadas al fecha_corte. Sirve como dato de prueba:
-- el backend debe recalcular estas cifras con las formulas de la skill y coincidir.
CREATE TABLE metricas_snapshot (
  ticker TEXT PRIMARY KEY REFERENCES empresas(ticker),
  fecha_corte TEXT NOT NULL,
  precio REAL NOT NULL,
  ret_1m REAL, ret_3m REAL, ret_6m REAL, ret_12m REAL,
  vol_anual REAL,
  max_dd_12m REAL,
  beta_12m REAL,
  mkt_cap_mm REAL,
  eps_ttm REAL,
  pe REAL,                                 -- NULL si EPS <= 0
  ev_ebitda REAL,                          -- NULL si EBITDA ttm <= 0
  deuda_neta_ebitda REAL,                  -- NULL si EBITDA ttm <= 0
  margen_ebitda REAL,
  roe REAL,
  crec_ingresos REAL,
  div_yield REAL,
  score_valuacion REAL,
  score_calidad REAL,
  score_crecimiento REAL,
  score_solidez REAL,
  score_riesgo REAL,
  score_total REAL,
  lectura TEXT                             -- 'Atractiva' | 'Neutral' | 'Con cautela'
);

CREATE INDEX idx_precios_fecha ON precios_diarios(fecha);
CREATE INDEX idx_fund_ticker ON fundamentales_trimestrales(ticker, fecha_cierre);
CREATE INDEX idx_eventos_fecha ON eventos_ficticios(fecha);
