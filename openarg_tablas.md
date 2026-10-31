## raw.produccion__registro_mipyme__c937b123__v3

**[Registro MiPyME](https://datos.produccion.gob.ar/dataset/registro-mipyme)** — tabla `raw.produccion__registro_mipyme__c937b123__v3`
Filas: 500000
Período (fecha_emision_certificado): 2016-06-16 a 2024-04-22
Frescura: Último dato: 2024-04-22 · Leída de la fuente por OpenArg: 2026-08-24
Columnas:
- row_number (bigint)
- empresa_id (bigint)
- regimen_tributario (text)
- fecha_emision_certificado (text)
- fecha_vencimiento_certificado (text)
- categoria_empresa (text)
- sector_economico (text)
- provincia (text)
- ID_provincia (bigint)
- clae6_codigo (bigint)
- vigente (bigint)
Muestra:
```csv
row_number,empresa_id,regimen_tributario,fecha_emision_certificado,fecha_vencimiento_certificado,categoria_empresa,sector_economico,provincia,ID_provincia,clae6_codigo,vigente
1,3175948,Autonomos,2016-06-17,2017-05-31,micro,Industria,BUENOS AIRES,6,222090,0
2,2126254,Autonomos,2016-06-17,2017-05-31,micro,Servicios,MENDOZA,50,960990,0
3,3096101,Autonomos,2016-06-17,2017-05-31,micro,Servicios,SANTA FE,82,492290,0
4,2255871,Autonomos,2016-06-20,2017-05-31,micro,Servicios,SANTIAGO DEL ESTERO,86,107129,0
5,2615498,Autonomos,2016-06-20,2017-05-31,micro,Industria,BUENOS AIRES,6,466931,0
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

## cache_datos_gob_ar_ndice_de_precios_al_consumidor_n_re359d1bfbe

**[Índice de Precios al Consumidor Nacional (IPC). Base diciembre 2016.](https://infra.datos.gob.ar/catalog/sspm/dataset/145/distribution/145.3/download/indice-precios-al-consumidor-nivel-general-base-diciembre-2016-mensual.csv)** — tabla `cache_datos_gob_ar_ndice_de_precios_al_consumidor_n_re359d1bfbe`
Filas: 115
Período (indice_tiempo): 2016-12-01 a 2026-06-01
Frescura: Último dato: 2026-06-01 · Leída de la fuente por OpenArg: 2026-07-30
Nota: OpenArg la leyó de su fuente por última vez hace 91 días (30 de julio de 2026): el portal puede tener datos más nuevos.
Columnas:
- indice_tiempo (text)
- ipc_ng_nacional (double precision)
- ipc_ng_gba (double precision)
- ipc_ng_pampeana (double precision)
- ipc_ng_nea (double precision)
- ipc_ng_noa (double precision)
- ipc_ng_cuyo (double precision)
- ipc_ng_patagonia (double precision)
- ipc_ng_nacional_tasa_variacion_mensual (double precision)
- ipc_ng_gba_tasa_variacion_mensual (double precision)
- ipc_ng_pampeana_tasa_variacion_mensual (double precision)
- ipc_ng_nea_tasa_variacion_mensual (double precision)
- ipc_ng_noa_tasa_variacion_mensual (double precision)
- ipc_ng_cuyo_tasa_variacion_mensual (double precision)
- ipc_ng_patagonia_tasa_variacion_mensual (double precision)
- ipc_ng_nacional_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_gba_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_pampeana_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_nea_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_noa_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_cuyo_tasa_variacion_acumulada_dic_ano_anterior (double precision)
- ipc_ng_patagonia_tasa_variacion_acumulada_dic_ano_anterior (double precision)
Muestra:
```csv
indice_tiempo,ipc_ng_nacional,ipc_ng_gba,ipc_ng_pampeana,ipc_ng_nea,ipc_ng_noa,ipc_ng_cuyo,ipc_ng_patagonia,ipc_ng_nacional_tasa_variacion_mensual,ipc_ng_gba_tasa_variacion_mensual,ipc_ng_pampeana_tasa_variacion_mensual,ipc_ng_nea_tasa_variacion_mensual,ipc_ng_noa_tasa_variacion_mensual,ipc_ng_cuyo_tasa_variacion_mensual,ipc_ng_patagonia_tasa_variacion_mensual,ipc_ng_nacional_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_gba_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_pampeana_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_nea_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_noa_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_cuyo_tasa_variacion_acumulada_dic_ano_anterior,ipc_ng_patagonia_tasa_variacion_acumulada_dic_ano_anterior
2016-12-01,100.0,100.0,100.0,100.0,100.0,100.0,100.0,,,,,,,,,,,,,,
2017-01-01,101.5859,101.313,101.7874,101.6727,101.6014,101.7074,102.5593,0.0158589999999998,0.01313,0.0178739999999999,0.0167270000000001,0.0160139999999999,0.017074,0.0255929999999999,0.0158589999999998,0.01313,0.0178739999999999,0.0167270000000001,0.0160139999999999,0.017074,0.0255929999999999
2017-02-01,103.6859,103.8085,103.5312,103.4617,103.7115,103.2652,104.2827,0.0206721602112105,0.0246315872592854,0.0171317864490103,0.0175956771089975,0.0207684146084601,0.0153164863126968,0.0168039368443428,0.0368589999999999,0.0380849999999999,0.035312,0.0346169999999999,0.037115,0.0326519999999999,0.0428269999999999
2017-03-01,106.1476,106.2627,105.8173,105.988,107.055,105.9238,106.5167,0.0237418974036005,0.0236416093094495,0.0220812663235816,0.0244177313923896,0.0322384692150823,0.0257453624260641,0.0214225370075764,0.0614759999999998,0.0626269999999999,0.058173,0.0598799999999999,0.0705500000000001,0.0592379999999999,0.0651669999999999
2017-04-01,108.9667,109.0613,108.6912,108.3473,109.9626,109.4506,108.6517,0.0265583018363109,0.0263366167055796,0.0271590751228767,0.0222600671774164,0.0271598710942972,0.0332956332759963,0.0200438053375668,0.0896669999999999,0.090613,0.0869119999999998,0.0834730000000001,0.0996259999999999,0.0945059999999999,0.0865169999999999
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

## cache_datos_gob_ar_principales_tasas_de_inter_s_rf390f3b5e3

**[Principales tasas de interés](https://infra.datos.gob.ar/catalog/sspm/dataset/89/distribution/89.1/download/principales-tasas-interes.csv)** — tabla `cache_datos_gob_ar_principales_tasas_de_inter_s_rf390f3b5e3`
Filas: 366
Período (indice_tiempo): 1996-01-01 a 2026-06-01
Frescura: Último dato: 2026-06-01 · Leída de la fuente por OpenArg: 2026-07-31
Nota: OpenArg la leyó de su fuente por última vez hace 91 días (31 de julio de 2026): el portal puede tener datos más nuevos.
Columnas:
- indice_tiempo (text)
- tasas_interes_cajas_ahorro (double precision)
- tasas_interes_plazo_fijo_30_59_dias (double precision)
- tasas_interes_plazo_fijo_mas_60_dias (double precision)
- tasas_interes_call (double precision)
- tasas_interes_prime (double precision)
- tasas_interes_adelantos_cc (double precision)
- tasas_interes_badlar (double precision)
- instr_bcra_pases_pesos_pasivos_1_dia (double precision)
- instr_bcra_pases_pesos_pasivos_7_dias (double precision)
- instr_bcra_pases_pesos_activos_1_dias (double precision)
- instr_bcra_pases_pesos_activos_7_dias (double precision)
- instr_bcra_tasa_politica_monetaria (double precision)
- instr_bcra_lebac_pesos_1_m (double precision)
- instr_bcra_lebac_pesos_2_m (double precision)
- instr_bcra_lebac_pesos_3_m (double precision)
- instr_bcra_lebac_pesos_4_m (double precision)
- instr_bcra_lebac_pesos_5_m (double precision)
- instr_bcra_lebac_pesos_6_m (double precision)
- instr_bcra_lebac_pesos_7_m (double precision)
- instr_bcra_lebac_pesos_8_m (double precision)
- instr_bcra_lebac_pesos_9_m (double precision)
- instr_bcra_lebac_pesos_10_m (double precision)
- tasas_interes_activas_adelantos (double precision)
- tasas_interes_activas_documentos (double precision)
- tasas_interes_activas_hipotecarios (double precision)
- tasas_interes_activas_prendarios (double precision)
- tasas_interes_activas_personales (double precision)
- tasas_interes_activas_tarjetas (double precision)
Muestra:
```csv
indice_tiempo,tasas_interes_cajas_ahorro,tasas_interes_plazo_fijo_30_59_dias,tasas_interes_plazo_fijo_mas_60_dias,tasas_interes_call,tasas_interes_prime,tasas_interes_adelantos_cc,tasas_interes_badlar,instr_bcra_pases_pesos_pasivos_1_dia,instr_bcra_pases_pesos_pasivos_7_dias,instr_bcra_pases_pesos_activos_1_dias,instr_bcra_pases_pesos_activos_7_dias,instr_bcra_tasa_politica_monetaria,instr_bcra_lebac_pesos_1_m,instr_bcra_lebac_pesos_2_m,instr_bcra_lebac_pesos_3_m,instr_bcra_lebac_pesos_4_m,instr_bcra_lebac_pesos_5_m,instr_bcra_lebac_pesos_6_m,instr_bcra_lebac_pesos_7_m,instr_bcra_lebac_pesos_8_m,instr_bcra_lebac_pesos_9_m,instr_bcra_lebac_pesos_10_m,tasas_interes_activas_adelantos,tasas_interes_activas_documentos,tasas_interes_activas_hipotecarios,tasas_interes_activas_prendarios,tasas_interes_activas_personales,tasas_interes_activas_tarjetas
1996-01-01,3.6264372756206895,8.615811887716857,9.549221059072348,5.73,11.541383399209488,,,,,,,,,,,,,,,,,,,,,,,
1996-02-01,3.554812182053123,7.621401784811485,8.390582911698594,5.64,10.648178053830229,,,,,,,,,,,,,,,,,,,,,,,
1996-03-01,3.4694208781345584,7.274121728813776,8.116158378146862,5.48,10.228737060041407,,,,,,,,,,,,,,,,,,,,,,,
1996-04-01,3.465388580919313,7.106231385485606,7.870444168433658,5.43,9.986252723311546,,,,,,,,,,,,,,,,,,,,,,,
1996-05-01,3.4574429858043336,6.662615344190191,7.440791752815414,5.32,9.735612648221345,,,,,,,,,,,,,,,,,,,,,,,
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

## cache_datos_gob_ar_pr_stamos_a_las_entidades_financ_r3b7e1fe401

**[Préstamos a las entidades financieras](https://infra.datos.gob.ar/catalog/sspm/dataset/91/distribution/91.1/download/prestamos-entidades-financieras-sector-privado.csv)** — tabla `cache_datos_gob_ar_pr_stamos_a_las_entidades_financ_r3b7e1fe401`
Filas: 282
Período (indice_tiempo): 2003-01-01 a 2026-06-01
Frescura: Último dato: 2026-06-01 · Leída de la fuente por OpenArg: 2026-07-31
Nota: OpenArg la leyó de su fuente por última vez hace 91 días (31 de julio de 2026): el portal puede tener datos más nuevos.
Columnas:
- indice_tiempo (text)
- prestamos_sect_priv_pesos_y_dolares (double precision)
- prestamos_sect_priv_pesos_dolares_consumo (double precision)
- detalle_prestamos_sect_priv_pesos_dolares_consumo_personales (double precision)
- detalle_prestamos_sector_priv_pesos_dolares_consumo_tarjetas (double precision)
- prestamos_sect_priv_pesos_dolares_comerciales (double precision)
- detalle_prestamos_sect_priv_pesos_dolares_comerc_adelantos (double precision)
- detalle_prestamos_sect_priv_pesos_dolares_comer_doc (double precision)
- detalle_prestamos_sect_priv_pesos_dolares_comerciales_otros (double precision)
- prestamos_sect_priv_pesos_dolares_garantia_real (double precision)
- detalle_prest_sect_priv_pesos_dolares_garantia_real_hip (double precision)
- detalle_prest_sect_priv_pesos_dolares_garantia_real_prend (double precision)
- prestamos_sect_priv_pesos (double precision)
- prestamos_sect_priv_pesos_consumo (double precision)
- detalle_prestamos_sect_priv_pesos_consumo_personales (double precision)
- detalle_prestamos_sector_priv_pesos_privado_consumo_tarjetas (double precision)
- prestamos_sect_priv_pesos_comerciales (double precision)
- detalle_prestamos_sect_priv_pesos_comerciales_adelantos (double precision)
- detalle_prestamos_sect_priv_pesos_comerciales_documentos (double precision)
- detalle_prestamos_sect_priv_pesos_comerciales_otros (double precision)
- prestamos_sect_priv_pesos_garantia_real (double precision)
- detalle_prestamos_sect_priv_pesos_garantia_real_hipot (double precision)
- detalle_prestamos_sect_priv_pesos_garantia_real_prend (double precision)
- prestamos_sect_priv_dolares (double precision)
- prestamos_sect_priv_dolares_consumo (double precision)
- detalle_prestamos_sect_priv_dolares_consumo_personales (double precision)
- detalle_prestamos_sector_priv_dolares_consumo_tarjetas (double precision)
- prestamos_sect_priv_dolares_comerciales (double precision)
- detalle_prestamos_sect_priv_dolares_comerciales_adelantos (double precision)
- detalle_prestamos_sect_priv_dolares_comerciales_documentos (double precision)
- detalle_prestamos_sect_priv_dolares_comerciales_otros (double precision)
- prestamos_sect_priv_dolares_garantia_real (double precision)
- detalle_prestamos_sect_priv_dolares_garantia_real_hipot (double precision)
- detalle_prestamos_sect_priv_dolares_garantia_real_prend (double precision)
Muestra:
```csv
indice_tiempo,prestamos_sect_priv_pesos_y_dolares,prestamos_sect_priv_pesos_dolares_consumo,detalle_prestamos_sect_priv_pesos_dolares_consumo_personales,detalle_prestamos_sector_priv_pesos_dolares_consumo_tarjetas,prestamos_sect_priv_pesos_dolares_comerciales,detalle_prestamos_sect_priv_pesos_dolares_comerc_adelantos,detalle_prestamos_sect_priv_pesos_dolares_comer_doc,detalle_prestamos_sect_priv_pesos_dolares_comerciales_otros,prestamos_sect_priv_pesos_dolares_garantia_real,detalle_prest_sect_priv_pesos_dolares_garantia_real_hip,detalle_prest_sect_priv_pesos_dolares_garantia_real_prend,prestamos_sect_priv_pesos,prestamos_sect_priv_pesos_consumo,detalle_prestamos_sect_priv_pesos_consumo_personales,detalle_prestamos_sector_priv_pesos_privado_consumo_tarjetas,prestamos_sect_priv_pesos_comerciales,detalle_prestamos_sect_priv_pesos_comerciales_adelantos,detalle_prestamos_sect_priv_pesos_comerciales_documentos,detalle_prestamos_sect_priv_pesos_comerciales_otros,prestamos_sect_priv_pesos_garantia_real,detalle_prestamos_sect_priv_pesos_garantia_real_hipot,detalle_prestamos_sect_priv_pesos_garantia_real_prend,prestamos_sect_priv_dolares,prestamos_sect_priv_dolares_consumo,detalle_prestamos_sect_priv_dolares_consumo_personales,detalle_prestamos_sector_priv_dolares_consumo_tarjetas,prestamos_sect_priv_dolares_comerciales,detalle_prestamos_sect_priv_dolares_comerciales_adelantos,detalle_prestamos_sect_priv_dolares_comerciales_documentos,detalle_prestamos_sect_priv_dolares_comerciales_otros,prestamos_sect_priv_dolares_garantia_real,detalle_prestamos_sect_priv_dolares_garantia_real_hipot,detalle_prestamos_sect_priv_dolares_garantia_real_prend
2003-01-01,33934.39099032259,4586.220526700635,2610.967675509531,1975.2528511911037,16193.684219594828,4834.662573154306,7049.085706486263,4309.935939954257,13154.48624402712,11174.266879780667,1980.2193642464536,29411.838709677424,4539.645161290323,2607.8064516129034,1931.8387096774195,11911.806451612903,4128.129032258064,5089.548387096775,2694.1290322580644,12960.387096774191,11082.064516129032,1878.3225806451608,1384.483870967742,14.258064516129032,0.967741935483871,13.290322580645162,1310.8064516129032,216.29032258064515,599.8709677419355,,,,
2003-02-01,33364.55756785715,4522.172984969257,2517.2041834719093,2004.9688014973487,15919.416525446177,4458.655924695316,7052.339428563679,4408.421172187183,12922.968057441709,11032.518584244011,1890.449473197693,28931.64285714286,4469.214285714285,2514.035714285714,1955.1785714285716,11713.5,3870.678571428572,5001.321428571428,2841.5,12748.92857142857,10947.535714285714,1801.392857142857,1399.0714285714284,16.714285714285715,1.0,15.714285714285714,1327.428571428571,185.57142857142856,647.3214285714286,,,,
2003-03-01,32282.00476774193,4309.070930744684,2310.3608434645707,1998.7100872801136,15420.633096095657,4218.733754665187,6905.235609646007,4296.663731784463,12552.300740901594,10783.769120149209,1768.531620752386,28038.83870967742,4257.322580645161,2308.870967741936,1948.4516129032256,11396.677419354835,3705.3225806451615,4890.129032258064,2801.2258064516127,12384.83870967742,10702.32258064516,1682.516129032258,1378.0645161290324,16.806451612903228,0.4838709677419355,16.322580645161292,1306.8709677419356,166.74193548387098,654.4516129032259,,,,
2003-04-01,31385.93290666667,4152.446069842134,2230.0,1922.4460698421344,15024.54782671434,4252.779318040102,6715.827073195333,4055.9414354789055,12208.939010110187,10523.43401257798,1685.5049975322097,27412.966666666667,4102.0,2230.0,1872.0,11250.466666666664,3779.533333333333,4761.766666666666,2709.1666666666665,12060.5,10453.466666666667,1607.0333333333333,1370.3666666666668,17.4,0.0,17.4,1301.7666666666669,163.23333333333332,674.0,,,,
2003-05-01,30990.112416129028,4133.508809463807,2137.0967741935483,1996.412035270259,14953.806004656892,4139.070606486244,6641.032104182259,4173.70329398839,11902.797602008332,10279.633217950672,1623.1643840576608,27086.419354838705,4084.6451612903215,2137.0967741935483,1947.548387096774,11247.58064516129,3729.677419354839,4744.225806451613,2773.6774193548385,11754.193548387098,10207.16129032258,1547.032258064516,1376.1612903225807,17.225806451612904,0.0,17.225806451612904,1306.548387096774,144.32258064516128,668.6774193548387,,,,
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

## cache_datos_gob_ar_principales_indicadores_del_sist_r8cfa80c5d5

**[Principales Indicadores del Sistema Financiero](https://infra.datos.gob.ar/catalog/sspm/dataset/332/distribution/332.2/download/datos-principales-indicadores-sistema-financiero-mensuales.csv)** — tabla `cache_datos_gob_ar_principales_indicadores_del_sist_r8cfa80c5d5`
Filas: 196
Período (indice_tiempo): 2010-01-01 a 2026-04-01
Frescura: Último dato: 2026-04-01 · Leída de la fuente por OpenArg: 2026-07-31
Nota: OpenArg la leyó de su fuente por última vez hace 91 días (31 de julio de 2026): el portal puede tener datos más nuevos.
Columnas:
- indice_tiempo (text)
- sistema_finan_1_liquidez_amplia (double precision)
- sistema_finan_1_liquidez_amplia_pesos (double precision)
- liquidez_con_pases (double precision)
- sistema_finan_2_liquidez (double precision)
- sistema_finan_2_liquidez_pesos (double precision)
- sistema_finan_3_credito_sector_publico (double precision)
- sistema_finan_4_credito_sector_privado (double precision)
- sistema_finan_5_irregularidad_cartera_privada (double precision)
- sistema_finan_6_exposicion_patrimonial_sector_privado (double precision)
- sistema_finan_7_roa_acumulado_anual (double precision)
- sistema_finan_8_roe_acumulado_anual (double precision)
- sistema_finan_9_eficiencia_acumulado_anual (double precision)
- sistema_finan_10a_integracion_capital_ (double precision)
- sistema_finan_10b_integracion_capital_riesgo_cred (double precision)
- sistema_finan_11a_integracion_capital_nivel_1 (double precision)
- sistema_finan_11b_integracion_capital_nivel_1_riesgo_cred (double precision)
- sistema_finan_12_posicion_capital (double precision)
- bancos_priv_1_liquidez_amplia (double precision)
- bancos_priv_1_liquidez_amplia_pesos (double precision)
- bancos_priv_liquidez_con_pases (double precision)
- bancos_priv_2_liquidez (double precision)
- bancos_priv_2_liquidez_pesos (double precision)
- bancos_priv_3_credito_sector_publico (double precision)
- bancos_priv_4_credito_sector_privado (double precision)
- bancos_priv_5_irregularidad_cartera_privada (double precision)
- bancos_priv_6_exposicion_patrimonial_sector_privado (double precision)
- bancos_priv_7_roa_acumulado_anual (double precision)
- bancos_priv_8_roe_acumulado_anual (double precision)
- bancos_priv_9_eficiencia_acumulado_anual (double precision)
- bancos_priv_10a_integracion_capital_ (double precision)
- bancos_priv_10b_integracion_capital_riesgo_credito (double precision)
- bancos_priv_11a_integracion_capital_nivel_1 (double precision)
- bancos_priv_11b_integracion_capital_nivel_1_riesgo_cred (double precision)
- bancos_priv_12_posicion_capital (double precision)
- bancos_priv_nacionales_1_liquidez_amplia (double precision)
- bancos_priv_nacionales_1_liquidez_amplia_pesos (double precision)
- bancos_priv_nacionales_liquidez_con_pases (double precision)
- bancos_priv_nacionales_2_liquidez (double precision)
- bancos_priv_nacionales_2_liquidez_pesos (double precision)
- bancos_priv_nacionales_3_credito_sector_publico (double precision)
- bancos_priv_nacionales_4_credito_sector_privado (double precision)
- bancos_priv_nacionales_5_irregularidad_cartera_privada (double precision)
- bancos_priv_nacionales_6_exposicion_patrimonial_sector_priv (double precision)
- bancos_priv_nacionales_7_roa_acumulado_anual (double precision)
- bancos_priv_nacionales_8_roe_acumulado_anual (double precision)
- bancos_priv_nacionales_9_eficiencia_acumulado_anual (double precision)
- bancos_priv_nacionales_10a_integracion_capital (double precision)
- bancos_priv_nacionales_10b_integracion_cap_riesgo_cred (double precision)
- bancos_priv_nacionales_11a_integracion_cap_nivel_1 (double precision)
- bancos_priv_nacionales_11b_integ_cap_nivel_1_riesgo_cred (double precision)
- bancos_priv_nacionales_12_posicion_capital_ (double precision)
- bancos_priv_extranjeros_1_liquidez_amplia (double precision)
- bancos_priv_extranjeros_1_liquidez_amplia_pesos (double precision)
- bancos_priv_extranjeros_liquidezconpases (double precision)
- bancos_priv_extranjeros_2_liquidez (double precision)
- bancos_priv_extranjeros_2_liquidez_pesos (double precision)
- bancos_priv_extranjeros_3_credito_sector_publico (double precision)
- bancos_priv_extranjeros_4_credito_sector_privado (double precision)
- bancos_priv_extranjeros_5_irregularidad_cartera_privada (double precision)
- bancos_priv_extranjeros_6_exposicion_pat_sector_priv (double precision)
- bancos_priv_extranjeros_7_roa_acumulado_anual (double precision)
- bancos_priv_extranjeros_8_roe_acumulado_anual (double precision)
- bancos_priv_extranjeros_9_eficiencia_acumulado_anual (double precision)
- bancos_priv_extranjeros_10a_integracion_capital_ (double precision)
- bancos_priv_extranjeros_10b_integracion_cap_riesgo_cred (double precision)
- bancos_priv_extranjeros_11a_integracion_capital_nivel_1 (double precision)
- bancos_priv_extranjeros_11b_integ_cap_nivel_1_riesgo_cred (double precision)
- bancos_priv_extranjeros_12_posicion_capital (double precision)
- bancos_publicos_1_liquidez_amplia (double precision)
- bancos_publicos_1_liquidez_amplia_pesos (double precision)
- bancos_publicos_liquidez_con_pases (double precision)
- bancos_publicos_2_liquidez (double precision)
- bancos_publicos_2_liquidez_pesos (double precision)
- bancos_publicos_3_credito_sector_publico (double precision)
- bancos_publicos_4_credito_sector_privado (double precision)
- bancos_publicos_5_irregularidad_cartera_privada (double precision)
- bancos_publicos_6_exposicion_patrimonial_sector_privado (double precision)
- bancos_publicos_7_roa_acumulado_anual (double precision)
- bancos_publicos_8_roe_acumulado_anual (double precision)
- bancos_publicos_9_eficiencia_acumulado_anual (double precision)
- bancos_publicos_10a_integracion_capital_ (double precision)
- bancos_publicos_10b_integracion_capital_riesgo_cred (double precision)
- bancos_publicos_11a_integracion_capital_nivel_1 (double precision)
- bancos_publicos_11b_integracion_capital_nivel_1_riesgo_cred (double precision)
- bancos_publicos_12_posicion_capital (double precision)
- entidades_finan_no_banc_1_liquidez_amplia (double precision)
- entidades_finan_no_banc_1_liquidez_amplia_pesos (double precision)
- entidades_finan_no_banc_liquidez_con_pases (double precision)
- entidades_finan_no_banc_2_liquidez (double precision)
- entidades_finan_no_banc_2_liquidez_pesos (double precision)
- entidades_finan_no_banc_3_credito_sector_publico (double precision)
- entidades_finan_no_banc_4_credito_sector_privado (double precision)
- entidades_finan_no_banc_5_irregularidad_cartera_privada (double precision)
- entidades_finan_no_banc_6_exposicion_pat_sector_priv (double precision)
- entidades_finan_no_banc_7_roa_acumulado_anual (double precision)
- entidades_finan_no_banc_8_roe_acumulado_anual (double precision)
- entidades_finan_no_banc_9_eficiencia_acumulado_anual (double precision)
- entidades_finan_no_banc_10a_integracion_capital_ (double precision)
- entidades_finan_no_banc_10b_integracion_cap_riesgo_cred (double precision)
- entidades_finan_no_banc_11a_integracion_capital_nivel_1 (double precision)
- entidades_finan_no_banc_11b_integ_cap_nivel_1_riesgo_cred (double precision)
- entidades_finan_no_banc_12_posicion_capital (double precision)
Muestra:
```csv
indice_tiempo,sistema_finan_1_liquidez_amplia,sistema_finan_1_liquidez_amplia_pesos,liquidez_con_pases,sistema_finan_2_liquidez,sistema_finan_2_liquidez_pesos,sistema_finan_3_credito_sector_publico,sistema_finan_4_credito_sector_privado,sistema_finan_5_irregularidad_cartera_privada,sistema_finan_6_exposicion_patrimonial_sector_privado,sistema_finan_7_roa_acumulado_anual,sistema_finan_8_roe_acumulado_anual,sistema_finan_9_eficiencia_acumulado_anual,sistema_finan_10a_integracion_capital_,sistema_finan_10b_integracion_capital_riesgo_cred,sistema_finan_11a_integracion_capital_nivel_1,sistema_finan_11b_integracion_capital_nivel_1_riesgo_cred,sistema_finan_12_posicion_capital,bancos_priv_1_liquidez_amplia,bancos_priv_1_liquidez_amplia_pesos,bancos_priv_liquidez_con_pases,bancos_priv_2_liquidez,bancos_priv_2_liquidez_pesos,bancos_priv_3_credito_sector_publico,bancos_priv_4_credito_sector_privado,bancos_priv_5_irregularidad_cartera_privada,bancos_priv_6_exposicion_patrimonial_sector_privado,bancos_priv_7_roa_acumulado_anual,bancos_priv_8_roe_acumulado_anual,bancos_priv_9_eficiencia_acumulado_anual,bancos_priv_10a_integracion_capital_,bancos_priv_10b_integracion_capital_riesgo_credito,bancos_priv_11a_integracion_capital_nivel_1,bancos_priv_11b_integracion_capital_nivel_1_riesgo_cred,bancos_priv_12_posicion_capital,bancos_priv_nacionales_1_liquidez_amplia,bancos_priv_nacionales_1_liquidez_amplia_pesos,bancos_priv_nacionales_liquidez_con_pases,bancos_priv_nacionales_2_liquidez,bancos_priv_nacionales_2_liquidez_pesos,bancos_priv_nacionales_3_credito_sector_publico,bancos_priv_nacionales_4_credito_sector_privado,bancos_priv_nacionales_5_irregularidad_cartera_privada,bancos_priv_nacionales_6_exposicion_patrimonial_sector_priv,bancos_priv_nacionales_7_roa_acumulado_anual,bancos_priv_nacionales_8_roe_acumulado_anual,bancos_priv_nacionales_9_eficiencia_acumulado_anual,bancos_priv_nacionales_10a_integracion_capital,bancos_priv_nacionales_10b_integracion_cap_riesgo_cred,bancos_priv_nacionales_11a_integracion_cap_nivel_1,bancos_priv_nacionales_11b_integ_cap_nivel_1_riesgo_cred,bancos_priv_nacionales_12_posicion_capital_,bancos_priv_extranjeros_1_liquidez_amplia,bancos_priv_extranjeros_1_liquidez_amplia_pesos,bancos_priv_extranjeros_liquidezconpases,bancos_priv_extranjeros_2_liquidez,bancos_priv_extranjeros_2_liquidez_pesos,bancos_priv_extranjeros_3_credito_sector_publico,bancos_priv_extranjeros_4_credito_sector_privado,bancos_priv_extranjeros_5_irregularidad_cartera_privada,bancos_priv_extranjeros_6_exposicion_pat_sector_priv,bancos_priv_extranjeros_7_roa_acumulado_anual,bancos_priv_extranjeros_8_roe_acumulado_anual,bancos_priv_extranjeros_9_eficiencia_acumulado_anual,bancos_priv_extranjeros_10a_integracion_capital_,bancos_priv_extranjeros_10b_integracion_cap_riesgo_cred,bancos_priv_extranjeros_11a_integracion_capital_nivel_1,bancos_priv_extranjeros_11b_integ_cap_nivel_1_riesgo_cred,bancos_priv_extranjeros_12_posicion_capital,bancos_publicos_1_liquidez_amplia,bancos_publicos_1_liquidez_amplia_pesos,bancos_publicos_liquidez_con_pases,bancos_publicos_2_liquidez,bancos_publicos_2_liquidez_pesos,bancos_publicos_3_credito_sector_publico,bancos_publicos_4_credito_sector_privado,bancos_publicos_5_irregularidad_cartera_privada,bancos_publicos_6_exposicion_patrimonial_sector_privado,bancos_publicos_7_roa_acumulado_anual,bancos_publicos_8_roe_acumulado_anual,bancos_publicos_9_eficiencia_acumulado_anual,bancos_publicos_10a_integracion_capital_,bancos_publicos_10b_integracion_capital_riesgo_cred,bancos_publicos_11a_integracion_capital_nivel_1,bancos_publicos_11b_integracion_capital_nivel_1_riesgo_cred,bancos_publicos_12_posicion_capital,entidades_finan_no_banc_1_liquidez_amplia,entidades_finan_no_banc_1_liquidez_amplia_pesos,entidades_finan_no_banc_liquidez_con_pases,entidades_finan_no_banc_2_liquidez,entidades_finan_no_banc_2_liquidez_pesos,entidades_finan_no_banc_3_credito_sector_publico,entidades_finan_no_banc_4_credito_sector_privado,entidades_finan_no_banc_5_irregularidad_cartera_privada,entidades_finan_no_banc_6_exposicion_pat_sector_priv,entidades_finan_no_banc_7_roa_acumulado_anual,entidades_finan_no_banc_8_roe_acumulado_anual,entidades_finan_no_banc_9_eficiencia_acumulado_anual,entidades_finan_no_banc_10a_integracion_capital_,entidades_finan_no_banc_10b_integracion_cap_riesgo_cred,entidades_finan_no_banc_11a_integracion_capital_nivel_1,entidades_finan_no_banc_11b_integ_cap_nivel_1_riesgo_cred,entidades_finan_no_banc_12_posicion_capital
2010-01-01,43.99054111104355,37.678411475267744,31.00334436626422,26.18098367829449,16.41943883732022,14.19162411382792,37.353241304396256,3.509483031211498,-1.279932930791951,2.2551995051913463,16.617384047725892,162.35266702601936,,18.959508165798358,,16.56723749013452,100.87434046050888,49.97678954487036,43.82744243927411,31.751588982815317,27.030205363739523,15.37455311077863,6.073593496844923,42.710048658989685,3.339014638467628,-1.52366643777342,2.617698051088811,18.939972525138742,172.30788673516798,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
2010-02-01,43.19775068135569,37.52440968181078,29.736047149008765,23.917249344764336,14.665119213486737,14.176708217753635,37.39071105818324,3.4146482152564586,-1.5041211751918602,1.9518832317547337,14.334915566937966,165.7745105758347,,19.03682814682383,,16.971231754131917,101.32184632395638,48.75942734248968,42.95071623913818,30.098889498148505,26.3299037291814,15.302391487576386,5.677286412731404,44.0718621795105,3.2608203687402524,-1.6756486817045164,2.2339363187529653,16.008639141553964,170.75563749462145,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
2010-03-01,45.74285762721895,38.45460557542094,31.94149259126992,28.62994851173845,17.07497870238941,13.899914918777522,37.03671183436394,3.28358990497584,-1.596638490933721,2.275507425825255,16.879159469668036,170.31555706880516,,19.04569547947245,,16.76768418020531,99.04154481656056,49.14735165400636,45.33811278597831,30.442377969925893,26.58973020062529,17.302598953961237,5.748075124488894,43.61594364038116,3.0998448600548096,-1.7489018735944857,2.7450210467512925,19.706176667447608,175.4348241146021,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
2010-04-01,46.63822811166404,38.73144986906555,32.98981840953283,27.91090660105072,15.17448157901852,13.078086251727832,36.23965262340603,3.1331575143856774,-1.8167345515269688,2.397868817655284,18.11926408845621,169.1197863359571,,18.54136659154984,,16.200263608272497,92.80122484178374,48.56667112075488,43.52237711074048,30.93646106033591,27.555363923452937,17.133397468977527,5.4330197919850045,44.14202188856223,2.9511730668324474,-1.9948602352418852,2.8558468478601813,20.864978513469755,174.00538334666365,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
2010-05-01,46.36161022804115,38.58113933695488,32.72726678083792,27.45156510831151,14.888653247434144,12.51323669997562,36.26298578645791,3.0736082284853565,-1.812554036314187,2.230484353030104,17.119849598978707,164.88432855656282,,18.141272095081217,,15.640814717277692,89.29060560360134,46.155439051393245,40.126778751166654,30.399555242376117,26.82321501379756,15.75856373425237,5.062837349751855,44.98132825534512,2.8432447601918835,-2.1500112844636545,2.581231862988927,19.100158821071407,169.5738645048171,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

## cache_datos_gob_ar_puestos_de_trabajo_asalariados_r_r5126011d99

**[Puestos de trabajo asalariados registrados, por provincia y sector de actividad](https://cdn.produccion.gob.ar/cdn-cep/datos-por-provincia/por-provincia/puestos/puestos_todos.csv)** — tabla `cache_datos_gob_ar_puestos_de_trabajo_asalariados_r_r5126011d99`
Filas: 3144
Período (fecha): 2013-01-01 a 2023-11-01
Frescura: Último dato: 2023-11-01 · Leída de la fuente por OpenArg: 2026-07-31
Nota: OpenArg la leyó de su fuente por última vez hace 91 días (31 de julio de 2026): el portal puede tener datos más nuevos.
Columnas:
- fecha (text)
- zona_prov (text)
- puestos (bigint)
Muestra:
```csv
fecha,zona_prov,puestos
2013-01-01,BUENOS AIRES,2807088
2013-01-01,CAPITAL FEDERAL,2046574
2013-01-01,CATAMARCA,86351
2013-01-01,CHACO,146422
2013-01-01,CHUBUT,144595
```
Pedí las filas con `obtener_datos` (columnas, desde, hasta, filtros, limite) o un total, promedio, conteo o ranking con `agregar_datos`.

