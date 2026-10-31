# VALIDACIÓN: CFO de Bolsillo

Fecha de corte: 2026-10-30. Confianza: **verificado** = dato leído en la fuente primaria o en OpenARG; **parcial** = fuente secundaria confiable, o dato viejo / con limitaciones; **no verificado** = no se pudo confirmar.
Caché local: `openarg_datos.md`, `openarg_datos2.md`, `openarg_tablas2.md`, `openarg_busquedas2.md`, `datos/raw/`.

## 0. Datos macro ya validados (rechequeados)

| Afirmación | Evidencia | Fuente | Confianza |
|---|---|---|---|
| Plazo fijo real ene-jun 2026: -2,9% | PF 30-59 d. capitalizado mensual: +13,5%; IPC acumulado: +16,8% | OpenARG `…tasas_de_inter_s_rf390f3b5e3` y `…precios_al_consumidor_n_re359d1bfbe` (BCRA/INDEC vía datos.gob.ar), leído 2026-10 | verificado (recalculado) |
| Adelanto en cuenta corriente 37,0% TNA vs PF 20,9% (jun-2026) | ídem | ídem | verificado |
| Irregularidad cartera privada 2,2% → 7,3% (abr-25 a abr-26) | `sistema_finan_5_irregularidad_cartera_privada` | OpenARG `…indicadores_del_sist_r8cfa80c5d5` (BCRA) | verificado |
| Préstamos comerciales en pesos: +33,4% nominal, ≈0% real (12 m) | 29,6 → 39,5 billones; IPC jun-25→jun-26 ≈ +33,5% | OpenARG `…pr_stamos_a_las_entidades_financ_r3b7e1fe401` | verificado |

## 1. Tamaño de mercado

| Afirmación | Evidencia | Fuente y fecha | Confianza |
|---|---|---|---|
| Hay **480.067 empleadores** privados con al menos 1 trabajador registrado (jul-2026) | -948 en el mes; -9.682 en 2026; -15.475 interanual (-3,1%); -32.290 desde dic-2023 (-6,3%) | SRT, vía [iProfesional, 11-10-2026](https://www.iprofesional.com/actualidad/466375-contundentes-numeros-de-la-srt-cuantas-empresas-cerraron-en-el-pais-durante-julio). Cruce: [Bloomberg Línea](https://www.bloomberglinea.com/latinoamerica/argentina/hay-mas-o-menos-empresas-argentinas-en-2026-esto-revelan-los-datos-oficiales/) | parcial (fuente secundaria que cita SRT; no se descargó la serie primaria) |
| La serie oficial de empleadoras privadas (SIPA, Min. Producción) da **543.870 en oct-2023** y **no se actualiza desde entonces** | Último dato 2023-10 tanto en OpenARG como en la descarga directa del CSV (2026-10-30) | OpenARG `cache_datos_gob_ar_cantidad_de_empleadores_que_decl_rf583f99e01`; [CSV oficial](https://cdn.produccion.gob.ar/cdn-cep/datos-por-actividad/empleadoras/empleadoras_privadas_total.csv) | verificado |
| Por sector (oct-2023): comercio 160.481 (29,5%), servicios personales 59.812, agro 55.219, industria 53.284, hotelería/gastronomía 36.640 | Letras CLAE G, S, A, C, H | OpenARG `…empleadores_que_decl_rb846836031` | verificado (dato 2023) |
| **2,21 millones de monotributistas** (jun-2026, s.e.), +1,9% interanual | 2.166 mil (jun-25) → 2.207 mil (jun-26) | OpenARG `raw.cache_series_monotributo` (datos.gob.ar series 151.1_IPENDIETAC_2012_M_36), leído 2026-10-30 | verificado |
| Distribución por provincia: proxy por puestos asalariados (nov-2023): PBA 3,23 M, CABA 2,16 M, Santa Fe 0,80 M, Córdoba 0,78 M, Mendoza 0,42 M | No hay serie pública de **empresas** por provincia más nueva que esta en OpenARG | OpenARG `…puestos_de_trabajo_asalariados_r_r5126011d99` | parcial (son puestos, no empresas; dato 2023) |
| % de empleadores que son pyme | El Registro MiPyME (hasta abr-2024, truncado a 500 k filas, voluntario) da 97,9% micro; no sirve como tasa. No hallé corte por tamaño de la SRT 2026 | OpenARG `raw.produccion__registro_mipyme__c937b123__v3` | **no verificado** |

**Cómo lo uso en el pitch (estimación propia, marcada como tal):**
- TAM: ~480 mil empleadores + segmento alto de monotributo (categorías altas, sin cuantificar) → "medio millón de negocios que pagan sueldos".
- SAM: comercio + servicios + gastronomía ≈ 47% de empleadoras (proporción 2023 aplicada a 2026): **~225 mil**. Supuesto: la proporción sectorial se mantuvo.
- SOM año 1: 1% del SAM ≈ 2.250 pymes. Supuesto, no dato.
- Argumento de urgencia: **-32 mil empleadores desde dic-2023** + irregularidad 2,2% → 7,3%. El problema es caja, no rentabilidad.

Limitaciones: la SRT mide empleadores con ART, no cierres (la SRT misma lo aclara). SIPA y SRT no son comparables (543 k vs 480 k incluye cambio de universo, no solo caída).

## 2. Competencia

Consultado el 2026-10-30. Si la página no tiene fecha, dice "consulta 30/10/26". Precios en ARS por mes + IVA.

| Producto | Qué hace con la caja | WhatsApp / IA | ¿Deriva a crédito? | Precio | Fuente | Confianza |
|---|---|---|---|---|---|---|
| Xubio | Saldos actuales de banco, caja y valores. Sin proyección | IA para cargar comprobantes; WhatsApp solo soporte | No | Gratis / Básico $98.700 / Estándar $161.800 | [xubio.com/ar/precios-empresas](https://xubio.com/ar/precios-empresas) (consulta 30/10/26) | verificado |
| Colppy | "Flujo de dinero" hacia atrás; tesorería multimoneda solo en Enterprise | Sin IA | Indirecto (Factura de Crédito MiPyME, en Enterprise) | $128.500 a $310.900 | [colppy.com/precios](https://colppy.com/precios) (consulta 30/10/26) | verificado |
| Contabilium | Tesorería: cajas, cheques, bancos. Sin proyección | IA en comprobantes de compra | No | $122.000 a $245.000 | [contabilium.com/ar/planes](https://contabilium.com/ar/planes) (consulta 30/10/26) | verificado |
| Alegra AR | Ingresos y gastos. Sin flujo de caja | Agente en WhatsApp, pero para contadores y solo en Colombia | No | $27.999 a $109.999 | [alegra.com/argentina/precios](https://alegra.com/argentina/precios) (consulta 30/10/26); [descubre.vc, 16/10/25](https://descubre.vc/noticia/alegra-lanza-gestor-contable-con-ia-en-whatsapp-2025-10-16) | verificado |
| Mercado Pago | Crédito "Dinero Plus" según lo que vendés en MP. Mago (IA en la app) resume ventas pasadas | IA en la app, no en WhatsApp | Sí, pero solo su propio crédito | Tasa 0% según la prensa | [iProfesional, 09/10/25](https://www.iprofesional.com/finanzas/439217); [Emprendedor, 28/09/26](https://emprendedor.com/mago-mercado-pago-asistente-inteligencia-artificial-finanzas) | parcial |
| Brubank Empresas / Cocos | Cuenta pyme. Préstamos, cheques, descuento de pagarés | No verificado | Sí, con su propio balance | Sin mantenimiento (Brubank) | infonegocios.info (2026); [iProfesional, 03/07/26](https://www.iprofesional.com/finanzas/459130) | parcial |
| Balanz | Negociación de ECheq en el MAV (7 a 360 días) | No | Sí (mercado de capitales) | No publicado | [balanz.com/inversiones/echeqs](https://balanz.com/inversiones/echeqs) (consulta 30/10/26) | verificado |
| Ualá Empresas | Cuenta y cobros. Sin herramienta de caja | WhatsApp solo soporte | No | Sin costo | [uala.com.ar/empresas](https://uala.com.ar/empresas) (consulta 30/10/26) | verificado |
| gurú + Luna (AR) | "Gestión financiera" sin detalle | IA en WhatsApp para **ventas** y atención | No | Fee a medida | Cronista / Infotechnology (14/10/26) | verificado |
| Clara (AR) | Tickets de gasto corporativo por WhatsApp | WhatsApp + IA | No (tarjeta corporativa) | No publicado | iProUP (25/10/26) | parcial |
| Payana (México) | Cuentas por pagar y saldos en WhatsApp. Sin proyección | Agentes de IA en WhatsApp | No | No publicado | ITSitio MX (13/07/26) | verificado (solo México) |
| Tango, Bejerman, Finnegans, Naranja X | Tienen módulos de tesorería; no se pudo verificar si proyectan | No verificado | No verificado | No publicado | Las páginas no cargaron | **no verificado** |

**Hueco competitivo:**
1. Ninguno de los ERP argentinos que se pudieron verificar publica una **proyección** de caja con alerta de hueco: muestran el pasado.
2. En Argentina, la IA por WhatsApp está en ventas (gurú) o en gastos (Clara); **nadie la usa para la caja de la pyme**.
3. El crédito de las billeteras es **cautivo**. Nadie compara banco, ECheq/MAV, SGR y ALyC a partir de un hueco proyectado.
4. La amenaza más cercana es Mercado Pago (Mago): tiene los datos y el crédito, pero solo ve su propio ecosistema.
5. **Riesgo de plataforma:** según blogs de proveedores (respond.io, eesel.ai, 2026), Meta prohíbe desde el 15/01/2026 los bots de IA "de propósito general" en la WhatsApp Business API; los bots con un fin acotado seguirían permitidos. **Parcial**: hay que confirmarlo en la política oficial de Meta.

## 3. Regulación

No es asesoramiento legal: antes de salir a producción hay que validarlo con un abogado de mercado de capitales. Las normas se leyeron en BO/InfoLEG/BCRA cuando fue posible.

**Correcciones al brief:** la RG CNV 1058/2025 es el régimen de PSAV y no el de agentes. La reforma de agentes y referenciamiento es la **RG 1048/2025**. El régimen PSAV vigente es la **RG 1172/2026** (vigente desde el 16/10/2026). La tokenización se rige hoy por la **RG 1150/2026** (sandbox hasta el 31/12/2027). No encontré la figura "Agente Productor Integral".

| Tema | Norma | Qué exige | Implicancia | Fuente | Confianza |
|---|---|---|---|---|---|
| Registro de agentes | Ley 26.831, arts. 2 y 47 | Para actuar como agente hace falta autorización y registro en CNV | Si "recomendamos" valores, somos agentes de hecho | [InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/205000-209999/206592/texact.htm) (BO 28/12/2012) | verificado |
| **Derivar a una ALyC sin registro** | RG CNV 1048/2025, Tít. VII, Cap. II, art. 2 inc. f | Contactar clientes con una ALyC sin autorización es válido si es accesorio, no ofrece ni recomienda valores y hay convenio previo, que la ALyC informa a CNV | **Es nuestra vía.** Cómo se nos paga: no verificado | [BO 09/01/2025](https://www.boletinoficial.gob.ar/detalleAviso/primera/319430/20250109) | verificado (remuneración: no verificado) |
| Publicidad de agentes | RG 1048/2025, Tít. VII, Cap. VII, art. 7 bis | Solo pueden publicitar a un agente los registrados en CNV, los PSAV, las entidades financieras, los PSP y las plataformas MiPyME | Sin marca ni recomendación: categorías genéricas (FCI MM, plazo fijo, caución) | ídem | verificado |
| Agente Productor (AP) | Normas CNV, Tít. VII | Vinculado por contrato a una ALyC, con idoneidad; trámite de unos 20 días hábiles, gratuito | Es la figura mínima si después queremos recomendar o cobrar por producto | [argentina.gob.ar](https://www.argentina.gob.ar/servicio/inscribirse-como-agente-productor-persona-juridica-ap-pj) | parcial |
| Crédito no bancario | BCRA, Com. A 7146 (T.O. A 7535) | Se registra quien **otorga** crédito en forma habitual | Si solo derivamos, no hace falta registro. Si prestamos o compramos FCE, hay que inscribirse como PNFC | [A 7146](https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A7146.pdf) | parcial (umbral vigente no verificado) |
| PSP | BCRA, Com. A 6885 | Registro obligatorio para quien maneja fondos o cuentas de clientes | No tocamos fondos: no aplica | [A 6885](https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A6885.pdf) | verificado |
| FCE MiPyME | Ley 27.440, arts. 12 y 13 | Se negocia en mercados CNV. En factoring solo compran entidades financieras y PNFC | Podemos mostrar las FCE y derivar a MAV o a factoring bancario; no podemos comprarlas | [InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/310000-314999/310084/norma.htm) | verificado |
| ECHEQ | BCRA, Com. A 6578 y A 6725–6727 | Cheque electrónico; se descuenta en bancos o en el MAV | Lo detectamos en los extractos y derivamos al descuento | [A 6725](https://www.bcra.gob.ar/archivos/Pdfs/comytexord/A6725.pdf) | verificado |
| PSAV | Ley 25.246, art. 4 bis; RG 1172/2026 | Registro previo para custodia, transferencia o intercambio de activos virtuales | En testnet sin valor no aplica. En producción con stablecoins hace falta ser PSAV o usar uno | [Colegio de Escribanos, 15/10/2026](https://www.colegio-escribanos.org.ar/noticias/2026_10_15_CNV-Res-Gral-1172-26.pdf) | parcial (no se leyó en el BO) |
| Tokenización | RG 1069/2025, 1081/2025 y **1150/2026** | Solo valores ya autorizados (FF, FCI cerrado, ON...), con titular PSAV o ALyC | Tokenizar FCE "sueltas" **no está habilitado** | [argentina.gob.ar, norma 426586](https://www.argentina.gob.ar/normativa/nacional/norma-426586/texto) (BO 11/06/2026) | verificado |
| Datos personales | Ley 25.326, arts. 4, 5, 11, 12 y 21 | Consentimiento expreso, minimización, cesión con consentimiento, transferencia internacional limitada, base inscripta en AAIP | Seudonimizar contrapartes; pedir consentimiento por cada destinatario de la derivación; cuidar que el LLM corra fuera del país | [InfoLEG](https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/norma.htm) | verificado |
| Open Finance | Decreto 353/2025 | Se creó el marco, pero a oct-2026 el BCRA no publicó estándares de API | No hay APIs bancarias: hay que usar extractos y ARCA | [Marval](https://www.marval.com/Publicacion/un-nuevo-paso-hacia-el-open-finance-17221) | decreto verificado; falta de norma BCRA: parcial |

**Posicionamiento "orquestador, no asesor":**
1. Ordenamos datos y proyectamos la caja. No custodiamos fondos, no prestamos, no emitimos ni negociamos valores.
2. Si sobra plata: categorías genéricas con información objetiva, sin instrumento ni emisor.
3. Derivación a ALyC con convenio de referenciamiento (RG 1048/2025).
4. Si falta plata: derivación a banco, PNFC o MAV (descuento de ECHEQ/FCE). No compramos créditos.
5. Consentimiento expreso por cada destinatario y datos de terceros seudonimizados (Ley 25.326).
6. Para escalar a recomendación personalizada: alta como AP de una ALyC. On-chain en producción solo a través de un PSAV.

## 4. Datos de las pymes para la demo (48 h, sin APIs bancarias)

| Afirmación | Evidencia | Fuente y fecha | Confianza |
|---|---|---|---|
| ARCA "Mis Comprobantes" permite descargar emitidos y recibidos en Excel/CSV con CUIT + clave fiscal | Pasos documentados por Colppy (importa desde ese archivo) | [Colppy, recibidos](https://intercom.help/Colppy/es/articles/3181130-importar-tus-facturas-desde-mis-comprobantes-recibidos-afip), [emitidos](https://intercom.help/colppy/es/articles/3177980-importar-tus-facturas-desde-mis-comprobantes-emitidos) (consultado 2026-10-30) | parcial (fuente de terceros; formato del CSV cambia y notas de crédito requieren revisión) |
| No hay web service de ARCA para comprobantes **recibidos**; la exportación manual es el camino | | [yo-facturo](https://yo-facturo.com/docs/accounting/received-invoices/) | parcial (hay fuentes contradictorias) |
| Mercado Pago genera reportes descargables en CSV: "Liquidaciones" y "Dinero en cuenta" (columna `SETTLEMENT_NET_AMOUNT` = impacto real en saldo) | Documentación oficial para desarrolladores | [MP Developers, reportes](https://www.mercadopago.com.ar/developers/es/docs/mp-point/additional-content/reports/introduction), [Dinero en cuenta](https://www.mercadopago.com.ar/developers/en/docs/reports/account-money/how-to-use) | verificado |
| Los home banking de los bancos grandes exportan movimientos a XLS/CSV/PDF | Conocimiento general; formato distinto por banco | — | no verificado (por banco) |

**Decisión para la demo:**
1. Input principal: **CSV de extracto bancario** + **CSV de "Mis Comprobantes" (facturas emitidas y recibidas con fecha)**. Las facturas dan los cobros y pagos *futuros*; el extracto da el saldo y la recurrencia. Ese cruce es lo que hace posible pronosticar.
2. Foto de comprobante: extracción con LLM con visión (Claude) → JSON. Es el efecto "wow" en vivo, pero no el núcleo.
3. Datos de demo: generamos una pyme ficticia verosímil (gastronomía en Córdoba, 8 empleados) con 6 meses de movimientos, en el formato real de cada export. Se declara como ficticia.
4. Pedido al equipo: si alguien tiene acceso a un export real (propio, anonimizado), lo usamos solo para calibrar el parser, y no se versiona.

## 5. Rol real de blockchain

| Afirmación | Evidencia | Fuente | Confianza |
|---|---|---|---|
| Tokenizar facturas no aporta nada hoy en Argentina | La FCE ya es un valor no cartular negociable en el MAV y el ECHEQ ya es digital. El cuello de botella es el riesgo crediticio, no el registro. La RG 1150 exige un vehículo con oferta pública más un PSAV | Ley 27.440; RG 1150/2026 | verificado (normas); la conclusión es nuestra |
| No hay ningún caso de tokenización de facturas o cheques de pymes en Argentina | Solo hay "exploraciones" (Blockenfy, Malbec). Los casos reales son FF tokenizados (Landtoken, VolSmart) | Infobae 25/10/2026 (secundaria); lexlatin.com | parcial |
| La tesorería con stablecoins sí aporta algo real (dólares en minutos, reglas automáticas), pero en producción exige un PSAV | Circle con Grupo BIND (USDC corporativo, 07/2026) | prensa 2026 | parcial |

**Mi posición, contra parte del brief:** el smart contract como "tesorería que ejecuta" es la parte más débil y la más fácil de atacar para el jurado ("¿por qué no lo hace el banco?"). Propongo reducirlo a una **"constancia auditable de caja"**:
- Cada pronóstico y cada derivación que el usuario acepta queda sellado en testnet: hash del extracto, hash de la proyección y el consentimiento del usuario a cada destinatario.
- El banco o la ALyC que recibe a la pyme puede verificar que la proyección no se tocó después.
- Esto ataca un problema real de originación de crédito pyme: la información es asimétrica y no hay forma de comprobarla. No custodia ni mueve fondos, así que tampoco hace falta PSAV.
- La "regla de tesorería" (si sobra X, se aparta Y) se puede mostrar como evento simulado del mismo contrato, rotulada "simulación, sin fondos".

Confianza en que suma frente al jurado: **parcial**; depende de cómo lo cuente el pitch. Alternativa más barata: eliminar blockchain y reforzar la IA. Esta decisión es tuya.
