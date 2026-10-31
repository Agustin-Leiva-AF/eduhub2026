# Prompt para Claude Code: CFO de Bolsillo (EduHub LABITCONF)

Pegá todo lo que sigue como primer mensaje en Claude Code, dentro de la carpeta `haka`.

---

## Rol
Sos mi socio técnico y de producto en un hackathon de 2 días (EduHub, LABITCONF, track **Inclusión Financiera**). Respondé en español, directo y compacto. Contradecime cuando mi enfoque sea peor que otro. No afirmes nada que no hayas verificado; si no podés verificar una fuente, decilo explícito en lugar de aproximar. Buscá en fuentes vivas antes de responder sobre el mundo actual.

## Reglas del hackathon (no negociables)
- Entregable: **demo funcional**. No se aceptan solo diapositivas.
- Obligatorio: justificar con datos de **OpenARG** y aplicar al territorio argentino.
- Jurado, 20% cada uno: (1) impacto y relevancia del problema, (2) modelo de negocio, (3) pitch y comunicación, (4) calidad del prototipo y uso de tecnología/IA, (5) innovación y creatividad.

## La idea
**CFO de Bolsillo**: asistente de caja por WhatsApp para pymes y emprendedores sin tiempo para hacer números. El usuario manda un extracto o foto de comprobantes; la IA ordena ingresos y egresos, proyecta la caja a 15/30/60/90/120 días, avisa en lenguaje simple ("el 23 te falta plata") y propone una acción: financiar el hueco o rotar el excedente. Una capa on-chain (tesorería programable, reglas ejecutadas por smart contract, en testnet) la ejecuta de forma auditable. Se deriva a bancos y ALyCs habilitadas; el sistema orquesta, no asesora.

## Lo ya validado con datos de OpenARG (jun-2025 a jun-2026)
Fuentes: tablas de INDEC y BCRA vía OpenARG. Resultados reales, no estimaciones:
- Plazo fijo vs. inflación: +2,8% real en 12 meses, pero **-2,9% real en ene-jun 2026** (13,5% vs 16,9%). Rindió menos que la inflación en 7 de 13 meses, todos desde dic-2025.
- Adelanto en cuenta corriente ~37% TNA vs plazo fijo 20,9% TNA (jun-2026): ~16 puntos de diferencia.
- Irregularidad de cartera privada: 2,2% → 7,3% (abr-2025 a abr-2026).
- Préstamos comerciales en pesos: +33,4% nominal, **-0,1% real** en 12 meses.

Tablas usadas: ver `openarg_tablas.md` y `consultas.json`. Los resultados están en `openarg_datos.md`.

## Conclusión estratégica ya tomada
El centro de la propuesta es **"no te quedes sin caja y llegá ordenado a pedir crédito"**, no "invertí tus excedentes" (esto último depende del momento y es lo más débil). Rotación de excedentes = módulo secundario. Quien paga fuerte: bancos, ALyCs y prestamistas, que reciben pymes con caja ordenada y comprobable.

## Lo que NO está validado (tu primer trabajo)
1. **Tamaño del mercado**: cuántas pymes/empleadoras hay en Argentina y por provincia. El Registro MiPyME en OpenARG llega solo a abril 2024, está truncado a 500.000 filas y es voluntario: no sirve para dimensionar. Buscá una fuente más fresca (otras tablas de OpenARG de empresas empleadoras/puestos, o fuentes oficiales por web) y reportá año y limitaciones.
2. **Competencia actual**: ERPs y apps de gestión con cash flow, billeteras y fintech para pymes en Argentina. Qué ofrecen hoy, qué no, precios si están publicados. Cada afirmación con fuente y fecha.
3. **Regulación**: qué exige CNV y BCRA para derivar/recomendar productos de inversión o crédito; si hace falta registro; cómo posicionarse como orquestador. Citá la norma.
4. **Datos de las pymes**: qué input real podemos usar en 48 hs (extracto PDF/CSV, foto de comprobantes) y cómo conseguirlo para la demo sin APIs bancarias.
5. **Rol real de blockchain**: confirmar que la tesorería programable o el factoring de facturas aporta algo que un banco no hace, o proponer una alternativa mejor.

## Uso de OpenARG (cuota limitada)
- MCP: `https://mcp.openarg.org/mcp`, con clave en variable de entorno `OPENARG_KEY` (nunca en el código ni en el chat).
- Cuota gratuita: 200 consultas de datos y **10 preguntas por mes**. `consultar_datos_publicos` descuenta preguntas: evitala. Usá `buscar_datasets`, `describir_tabla`, `obtener_datos` y `agregar_datos`.
- Cacheá toda respuesta en archivos locales. La demo en vivo no debe depender de la API.
- Scripts ya hechos: `openarg.mjs` (comandos `tools`, `search`, `describe`, `query`). Reutilizalos.
- Si la red bloquea `mcp.openarg.org`, no lo esquives: decímelo.

## Tareas, en este orden
1. Leé los archivos de la carpeta. Resumí en 10 líneas lo que entendiste, sin repetirme lo de arriba.
2. Resolvé los puntos "no validado" 1 a 5. Entregá `VALIDACION.md` con: afirmación, evidencia, fuente con link y fecha, y nivel de confianza (verificado / parcial / no verificado).
3. Reevaluá la idea contra los 5 pilares del jurado con puntaje 1 a 5 y una línea de justificación cada uno. Decime qué cambiarías para subir el pilar más flojo.
4. Definí el **alcance mínimo de la demo** (un solo flujo estrella, de punta a punta) y los cortes explícitos de lo que NO se hace.
5. Armá la arquitectura mínima: canal (WhatsApp o simulador web de chat), parser de extractos/comprobantes, motor de pronóstico de caja, uso de datos OpenARG en la recomendación, contrato en testnet. Proponé stack y justificá cada elección en una línea.
6. Generá el plan de trabajo y el tablero de ClickUp (abajo).
7. Recién entonces, empezá a construir el prototipo siguiendo el tablero. Primero lo que más pesa en el jurado: demo funcional (pilar 4) y uso de OpenARG.

## Tablero de ClickUp
Si tenés el MCP de ClickUp conectado, creá el tablero ahí. Si no, generá `clickup_import.csv` listo para importar y decime los pasos de importación.

- **Espacio**: Hackathon LABITCONF. **Lista**: CFO de Bolsillo.
- **Estados**: Backlog, A hacer, En curso, En revisión, Hecho, Bloqueado.
- **Campos**: responsable, prioridad (Urgente/Alta/Normal), estimación en horas, pilar del jurado que impacta (1 a 5), etiqueta de bloque.
- **Bloques (etiquetas)**: `Validación`, `Datos OpenARG`, `Producto/UX`, `Backend/IA`, `Blockchain`, `Demo`, `Pitch`, `Negocio`.
- **Una tarea por entregable concreto**, con criterio de "hecho" en la descripción. Subtareas solo si la tarea pasa de 3 horas.
- Incluí obligatoriamente: `VALIDACION.md`, dataset cacheado de OpenARG, flujo estrella funcionando, contrato en testnet, guion de pitch de 3 minutos, ensayo de preguntas del jurado, plan B de la demo si falla la red.
- Orden por dependencia y por peso en la evaluación. Marcá el camino crítico.
- Reservá las últimas horas solo para ensayo del pitch y congelar el código.

## Formato de tus respuestas
Compactas. Tablas solo para comparar. Cada dato externo con fuente y fecha. Marcá "no verificado" donde corresponda. Cuando termines un bloque, decime qué sigue y qué decisión mía necesitás.
