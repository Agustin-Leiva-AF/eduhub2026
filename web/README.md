# CFO de Bolsillo: prototipo

Chat estilo WhatsApp que lee el extracto bancario y los comprobantes de ARCA, proyecta la caja a 15/30/60/90/120 días, avisa del hueco y compara cómo cubrirlo con tasas reales del BCRA (vía OpenARG). Al aceptar, arma una carpeta de caja con consentimiento y sella su hash (constancia auditable).

## Correr

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm test           # parser + motor de caja + recomendación
npm run demo       # build de producción + start (plan B: no necesita internet)
```

## Piezas

| Archivo | Qué hace |
|---|---|
| `lib/parse.ts` | Parser determinístico de CSV de home banking y "Mis Comprobantes" (ARCA). Notas de crédito restan. |
| `lib/forecast.ts` | Motor de caja: concilia facturas con el banco, aprende plazos y cadencias por contraparte, detecta recurrentes, aguinaldo, ventas por día de semana, ajuste por IPC. |
| `lib/advice.ts` | Opciones para cubrir el hueco con costo calculado: renegociar plazo, descontar facturas (tasa documentos BCRA), adelanto en cuenta (tasa adelantos BCRA). |
| `lib/openarg.ts` + `data/openarg_cache.json` | Contexto macro sin red. Regenerar: `node web/scripts/build-openarg-cache.mjs` desde `haka/`. |
| `lib/ia.ts` | Claude (opcional): redacta el mensaje y lee fotos de comprobantes. Sin `ANTHROPIC_API_KEY` usa textos por reglas. |
| `lib/notario.ts` + `contracts/CashProofRegistry.sol` | Constancia: hash de la carpeta en Base Sepolia, o registro **simulado** si no hay testnet configurada. |
| `app/entidad/[hash]` | Panel del banco: recalcula el hash y lo compara con el registro. |
| `scripts/gen-demo.mjs` | Genera la pyme **ficticia** "La Esquina de Nueva Córdoba". |

## Variables (`web/.env.local`, nunca en el repo)

```
ANTHROPIC_API_KEY=...            # opcional: redacción con IA
NOTARIO_PRIVATE_KEY=0x...        # wallet SOLO de testnet (faucet Base Sepolia)
NOTARIO_CONTRACT=0x...           # dirección que imprime `node scripts/deploy.mjs --deploy`
NOTARIO_RPC_URL=https://sepolia.base.org
```

## Supuestos y límites (decirlos en el pitch si preguntan)
- Datos de la pyme: **ficticios**. El formato de "Mis Comprobantes" es aproximado; hay que validarlo con un export real.
- Inflación proyectada = último IPC mensual disponible en OpenARG (jun-26). Las tasas también son de jun-26, el último dato de la tabla.
- Feriados cargados a mano (aprox.). La estacionalidad no se aprende con 6 meses de historia.
- No es asesoramiento financiero; no custodia fondos ni nombra instrumentos.
