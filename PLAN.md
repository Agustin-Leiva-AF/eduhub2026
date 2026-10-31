# CFO de Bolsillo: pilares, alcance, arquitectura y plan

Supuestos (a confirmar): equipo de 4 (A = backend/IA, B = front/UX, C = datos/blockchain, D = negocio/pitch), 2 días de unas 12 h útiles cada uno.

## 1. Puntaje frente al jurado (hoy, antes de construir)

| Pilar | Nota | Justificación |
|---|---|---|
| 1. Impacto | 4 | Datos duros y verificados: -32 mil empleadores desde dic-23, irregularidad 2,2%→7,3%, crédito comercial ≈0% real. Falta el % de pymes. |
| 2. Modelo de negocio | **2** | Quién paga está claro (bancos y ALyCs), pero la remuneración del referenciador no está regulada ni validada, y la publicidad de ALyCs está restringida (RG 1048, art. 7 bis). |
| 3. Pitch | 3 | La frase "el 23 te falta plata" es potente; todavía no hay guion. |
| 4. Prototipo e IA | 2 → 4 | Hoy no hay nada. Con el flujo estrella sube a 4. |
| 5. Innovación | 3 | Proyección de caja + WhatsApp + derivación neutral no existe en Argentina. Blockchain como "tesorería" resta: se reformula como constancia auditable. |

**Para subir el pilar 2 (el más flojo):** tres fuentes de ingreso y ninguna depende de una comisión de CNV:
1. **Fee por pyme derivada y aprobada (CPA), pagado por bancos y PNFC.** Es crédito, no valores: no lo alcanza la RG 1048.
2. **Plan para estudios contables**, el canal: un contador maneja de 30 a 100 pymes y ya tiene los exports de ARCA. Precio de referencia: por debajo de Xubio Básico ($98.700/mes).
3. **Pyme freemium:** una proyección gratis por mes; alertas semanales pagas.

Las ALyCs quedan como convenio de referenciamiento sin fee al principio. Para el pitch, la cuenta del lado de la oferta: cuánto le cuesta a un banco originar una pyme. Ese dato **no está verificado**; buscarlo o presentarlo como supuesto.

## 2. Alcance mínimo de la demo: un flujo estrella

**"Mandá tu extracto y en 30 segundos sabés si te falta plata, cuándo y qué hacer."**

1. En el chat (simulador web con look de WhatsApp), la pyme sube un CSV de extracto bancario y un CSV de "Mis Comprobantes" de ARCA. Opcional: una foto de factura.
2. La IA clasifica los movimientos (ventas, sueldos, proveedores, impuestos, alquiler) y detecta los recurrentes.
3. El motor proyecta la caja día a día a 15/30/60/90/120 días con: saldo, recurrentes, facturas a cobrar y a pagar con fecha, y un ajuste por inflación esperada (último IPC de OpenARG).
4. Alerta en lenguaje simple: *"El 23/11 te faltan $1,8 M. Primer día en rojo: 23/11; el hueco dura 9 días."*
5. Recomendación con datos de OpenARG: *"Cubrirlo con adelanto en cuenta corriente cuesta ~37% TNA (BCRA, jun-26). Descontar tus ECHEQ/FCE suele ser más barato (documentos 29% TNA)."* Más la opción **Quiero que un banco me contacte**.
6. Si el usuario acepta, se genera la **carpeta de crédito** (resumen de caja en PDF/HTML) y se sella el hash en testnet; aparece el link al explorador.
7. Panel de la entidad (una pantalla): el banco ve la carpeta y verifica el hash contra la cadena.

**Cortes explícitos (NO se hace):** WhatsApp real (salvo que sobre tiempo: Twilio sandbox), conexión bancaria, login y multiusuario, parsers de todos los bancos (solo uno y el de ARCA), recomendaciones de inversión con instrumento, rotación de excedentes (queda una tarjeta "próximamente"), tokens, stablecoins y fondos reales, ML entrenado, app móvil.

## 3. Arquitectura mínima

```
[Chat web estilo WhatsApp] → [API Next.js]
                               ├─ parser: CSV banco / CSV ARCA (determinístico) + foto → Claude visión → JSON
                               ├─ clasificador: Claude (categorías + recurrencia), cacheado por demo
                               ├─ motor de caja: TypeScript puro, determinístico y testeable
                               ├─ contexto OpenARG: datos/openarg_cache.json (sin red en la demo)
                               ├─ redactor: Claude → mensaje simple + recomendación con cifras citadas
                               └─ notario: viem → contrato CashProofRegistry (Base Sepolia)
[Panel entidad] → lee carpeta + verifica hash on-chain
```

| Pieza | Elección | Por qué (una línea) |
|---|---|---|
| Canal | Simulador web de WhatsApp | La aprobación de Meta no entra en 48 h y su política 2026 sobre bots de IA es un riesgo. El simulador no falla en vivo. |
| App | Next.js (App Router) + TypeScript | Front y API en un solo deploy; el equipo lo conoce (supuesto). |
| Parser | CSV determinístico + Claude visión para fotos | Lo determinístico no alucina montos; la visión aporta el "wow". |
| IA | Claude API, modelo `claude-sonnet-5-5` | Buena relación costo/velocidad para clasificar y redactar. El cálculo de la caja nunca lo hace el LLM. |
| Pronóstico | Reglas + calendario de facturas (sin ML) | Con 6 meses de datos un modelo no gana; las reglas son explicables ante el jurado. |
| OpenARG | JSON cacheado, generado con `openarg.mjs` | Cuota limitada y la demo no puede depender de la red. |
| Contrato | Solidity mínimo (`CashProofRegistry`: `registrar(hash, destinatario)`) en Base Sepolia con Foundry | Barato, rápido, con explorador público; sin fondos, así que no hace falta PSAV. |
| Deploy | Vercel + modo offline local | Plan B: `npm run demo` con datos fijos y la cadena simulada. |

## 4. Camino crítico

`Datos demo` → `Parser CSV` → `Motor de caja` → `Chat con alerta` → `Recomendación con OpenARG` → `Carpeta + sello` → `Ensayo`.
El contrato, la foto y el panel de la entidad corren en paralelo y no bloquean.

Tablero: `clickup_import.csv` (las tareas marcadas con la etiqueta `camino-critico`).
