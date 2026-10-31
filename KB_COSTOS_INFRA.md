# Base de conocimiento: costos de infraestructura y presupuesto (CFO de Bolsillo)

Consultado el 2026-10-30 en las páginas oficiales de cada proveedor. Moneda: USD. Los precios cambian: antes de citarlos en el pitch, reverificá la fecha de la página.

Convención de etiquetas (usala siempre que cites un dato de este archivo):
- **[VERIFICADO]**: figura en la fuente indicada, consultada en la fecha de arriba.
- **[CÁLCULO]**: derivado de datos verificados; la fórmula está escrita.
- **[SUPUESTO]**: estimación propia, sin fuente. No presentar como dato.
- **[NO VERIFICADO]**: no se consultó o la fuente no mostró el dato.

## 1. Precios verificados

| Servicio | Plan / ítem | Precio | Etiqueta |
|---|---|---|---|
| Supabase | Free | $0. 500 MB de base, 50.000 MAU, 1 GB de storage. Se pausa tras 1 semana de inactividad. Máx. 2 proyectos activos | [VERIFICADO] |
| Supabase | Pro | desde $25/mes, incluye $10/mes de crédito de cómputo (una instancia Micro). 8 GB de base, 100.000 MAU, 100 GB de storage | [VERIFICADO] |
| Supabase | Team | desde $599/mes. Agrega SOC2, ISO 27001, SSO, soporte con SLA. HIPAA es un add-on pago | [VERIFICADO] |
| Supabase | Cómputo extra | Micro $10, Small $15, Medium $60, Large $110, XL $210, 2XL $410, 4XL $960 por mes | [VERIFICADO] |
| Vercel | Hobby | $0. **Solo uso personal no comercial** | [VERIFICADO] |
| Vercel | Pro | $20/mes por asiento de desarrollador, incluye $20/mes de uso. Uso adicional por consumo | [VERIFICADO] |
| Railway | Free | Prueba de 30 días con $5 de crédito; después $1/mes | [VERIFICADO] |
| Railway | Hobby | mínimo $5/mes de uso, incluye $5 de crédito | [VERIFICADO] |
| Railway | Pro | mínimo $20/mes de uso, incluye $20 de crédito | [VERIFICADO] |
| Railway | Uso | CPU $0,00000772 por vCPU-segundo; RAM $0,00000386 por GB-segundo; egress $0,05 por GB | [VERIFICADO] |
| Railway | Equivalente mensual | ~$20 por vCPU-mes, ~$10 por GB de RAM-mes (x 2.592.000 s) | [CÁLCULO] |
| Claude Haiku 5.5 | Tokens | $0,10 entrada / $0,50 salida por millón (prompts hasta 100k); $0,50 / $2,50 si el prompt pasa de 100k | [VERIFICADO] |
| Claude Sonnet 5.5 | Tokens | $2 entrada / $10 salida por millón | [VERIFICADO] |
| Claude Opus 5.5 | Tokens | $4 entrada / $20 salida por millón | [VERIFICADO] |
| Claude | Batch API | 50% de descuento sobre entrada y salida | [VERIFICADO] |
| Claude | Prompt caching | Lectura: Haiku 5.5 $0,01, Sonnet 5.5 $0,10, Opus 5.5 $0,20 por millón. Escritura 5 min: 1,25x el precio de entrada | [VERIFICADO] |
| WhatsApp Business Platform | Modelo | Cobro por mensaje desde 2025-07-01 (ya no por conversación). Categorías de plantilla: marketing, utility, authentication | [VERIFICADO] |
| WhatsApp Business Platform | Gratis | Mensajes no-plantilla dentro de la ventana de 24 h; plantillas utility dentro de esa ventana; todos los mensajes durante 72 h en una ventana de punto de entrada gratuito; mensajes del usuario al negocio | [VERIFICADO] |
| WhatsApp Business Platform | Argentina | Tarifas de utility y authentication bajaron el 2025-10-01. **La página no mostró montos.** ARS disponible como moneda solo al crear una WABA nueva desde 2026-04-01 | [VERIFICADO] (sin montos) |

Fuentes:
- https://platform.claude.com/docs/en/about-claude/pricing
- https://developers.facebook.com/docs/whatsapp/pricing (rate cards: #rate-cards)
- https://supabase.com/pricing
- https://vercel.com/pricing
- https://railway.com/pricing

## 2. Infra mensual por etapa [CÁLCULO]

Suma de los precios verificados de arriba. Excluye IA, mensajes de WhatsApp y blockchain.

| Etapa | Composición | Infra/mes |
|---|---|---|
| Hackathon (48 hs) | Supabase Free + Vercel Hobby + crédito de prueba de Railway | $0 |
| Piloto (uso comercial, 10-30 pymes) | Supabase Pro $25 + Vercel Pro $20 (1 asiento) + Railway ~$5-20 | ~$50-70 |
| MVP simple (3 asientos) | Supabase Pro $25 + Vercel Pro $60 + Railway ~$30 | ~$115-150 |
| MVP premium (6 asientos) | Supabase Pro con cómputo Large ~$135 + Vercel $120 + Railway ~$100-200 | ~$350-500 |
| Producción | Supabase Team $599 + cómputo $110-210 + Vercel ~$160 + Railway ~$200-500 | ~$1.100-1.500 |

Notas:
- Vercel Hobby no permite uso comercial: pasar a Pro apenas haya usuarios pagos o piloto con empresas.
- SOC2 solo aparece en Supabase Team. Si un banco o ALyC lo exige, el costo de infra salta a ese nivel.
- Railway Hobby/Pro: los rangos dependen de cuántas vCPU y GB de RAM consuma el backend; recalcular con el uso real.

## 3. Costo de IA por usuario activo [CÁLCULO sobre SUPUESTOS]

Supuestos de uso por usuario al mes (**[SUPUESTO]**, validar con el flujo real): 1 extracto de ~30.000 tokens de entrada y ~3.000 de salida, más ~20 turnos de chat de ~4.000 tokens de entrada y ~500 de salida.
Total: ~110.000 tokens de entrada y ~13.000 de salida.

| Modelo | Cuenta | Costo por usuario/mes |
|---|---|---|
| Haiku 5.5 | 0,11 x $0,10 + 0,013 x $0,50 | ~$0,02 |
| Sonnet 5.5 | 0,11 x $2 + 0,013 x $10 | ~$0,35 |

Con 3.000 usuarios activos: ~$55/mes con Haiku, ~$1.050/mes con Sonnet. Elegir el modelo pesa más que el hosting. Sin aplicar caching ni Batch (que bajan el costo).

## 4. Presupuesto por etapa (incluye equipo) [SUPUESTO]

Sin fuente: sueldos, legales, auditoría y marketing son estimaciones propias. No usar como dato en el pitch sin validarlos.

| Etapa | Duración y equipo | Total aprox. |
|---|---|---|
| 0. Hackathon | 48 hs, 3-4 personas sin sueldo | $50-150 |
| 1. Piloto | 6-8 semanas, 2 personas part-time | $4-10k |
| 2. MVP simple | 3-4 meses, 3 personas | $40-60k |
| 3. MVP premium | 5-6 meses, 5-6 personas, auditoría de contrato, KYC, seguridad, legal | $120-220k |
| 4. Producción, año 1 | 8-12 personas | $450-900k/año |

El equipo es el 70-85% del costo desde la etapa 2. La infra verificada (sección 2) es una fracción mínima del total.

Punto de equilibrio ilustrativo **[SUPUESTO]**: suscripción de $15/mes y costo variable de $2 dejan $13 por pyme. Con un gasto mensual de $40k hacen falta ~3.100 pymes pagando solo suscripción. El fee de ALyCs y bancos por cliente calificado lo acortaría; ese monto no está validado con ninguna ALyC.

## 5. Lo que falta verificar (tareas para Claude Code)

1. **[NO VERIFICADO]** Tarifa por mensaje de WhatsApp para Argentina (utility, marketing, authentication) en el rate card de Meta. Obtener montos en USD y la fecha de vigencia.
2. **[NO VERIFICADO]** Costo del proveedor de mensajería (BSP) si no se usa la API directa de Meta.
3. **[NO VERIFICADO]** Gas de la red elegida para el contrato y precio de una auditoría de smart contract.
4. **[NO VERIFICADO]** Proveedores y precios de verificación de identidad (KYC) y de conexión bancaria automática disponibles en Argentina.
5. **[NO VERIFICADO]** Sueldos de mercado y costos legales/regulatorios en Argentina para el equipo previsto.
6. Si encontrás un dato que contradiga este archivo, marcá la diferencia, citá la fuente con fecha y proponé la corrección. No lo sobrescribas en silencio.

## 6. Reglas de uso de este archivo

- Citá siempre la etiqueta junto al dato. Nada con etiqueta [SUPUESTO] o [NO VERIFICADO] se presenta como cifra firme.
- Si un precio de la sección 1 tiene más de 30 días, reverificalo antes de usarlo en un entregable.
- El pilar "modelo de negocio" del jurado (20%) se defiende con datos de las secciones 1 y 3 y con supuestos explícitos; evitá afirmar rentabilidad sin validar el fee con una ALyC o un banco real.
