# CFO de Bolsillo

🇬🇧 [Read in English](README.md)

Copiloto de caja para pymes argentinas. Lee el extracto bancario y los comprobantes de ARCA, proyecta el saldo día por día a 120 días, avisa en qué días te va a faltar plata, compara opciones con tasas reales para cubrir el hueco y, cuando sobra plata de forma segura, muestra qué *clases* de colocación encajan en esa ventana. Todos los montos los calcula código determinístico; el LLM (opcional) solo redacta los mensajes.

> **Estado: prototipo funcional, solo con datos de demo.** Todavía no se validó con exports reales de bancos ni de Mercado Pago, y no es asesoramiento financiero. No custodia fondos ni nombra productos financieros.

## Probalo en 3 minutos

Requisitos: Node.js 20+ y npm. No hacen falta claves de API.

```bash
git clone https://github.com/JuanIPlanes/eduhub2026.git
cd eduhub2026/web
npm install
npm run dev
```

Abrí <http://localhost:3000>. La app carga sola una pyme ficticia ("La Esquina de Nueva Córdoba").

> La primera llamada a `/api/analizar` puede tardar hasta ~50 s sin clave de IA, porque la redacción con IA espera hasta agotar el tiempo antes de usar el texto por reglas. Primero aparece la proyección de caja; las alertas y el excedente se completan después.

### Qué tocar

| Dónde | Qué probar |
|---|---|
| `/` **Hoy** | Saldo, alerta de hueco, próximos pagos, gráfico a 30 días. |
| `/proyeccion` **Proyección** | Horizontes de 15/30/60/90/120 días, huecos, opciones para cubrirlos con su costo, consentimiento y sellado. |
| `/excedente` **Excedente** | Excedente seguro, ventana en días, reserva, rendimiento nominal vs. real, clases de colocación genéricas. Con la demo por defecto *no* hay excedente (hay un hueco próximo). |
| `/datos` **Datos** | Usar la demo, **"Ver caso con caja holgada"** (muestra un excedente), subir tus CSV, subir la foto de una factura (requiere clave de IA), conectar Mercado Pago (dice "Pendiente de credenciales" si no está configurado). |
| `/sello` **Sello** | Huellas de las carpetas selladas y verificación de integridad. |
| `/demo` | El simulador de chat tipo WhatsApp: el canal que usará el producto final. Tocá "Probar con la pyme demo". |

En el celular (o una ventana angosta) hay barra de pestañas abajo; en escritorio (≥1024 px), sidebar y dashboards más completos. En el build de producción es una PWA instalable.

### Usar tus propios archivos

`/datos` → subir CSV. Formatos reconocidos (⚠ ninguno está verificado con exports reales; algunos son suposiciones):

- Extractos bancarios: `Fecha;Descripción;Débito;Crédito;Saldo`, o una sola columna `Importe` con signo (estilo BNA).
- CSV de "Mis Comprobantes" de ARCA, recibidos y emitidos.
- Reportes de cuenta de Mercado Pago (release / settlement, encabezados en inglés) y el export de actividad en español.
- Opcionales: boletas con vencimiento y nómina. Hay ejemplos en `web/public/demo/`.

El servidor procesa los archivos en memoria; se muestran sus huellas (SHA-256) para que verifiques qué se leyó.

## Tests

```bash
cd web
npm test        # parsers, motor de caja, excedente, mapeo de Mercado Pago, cifrado de cookie
npx tsc --noEmit
npm run build   # build de producción
```

## Setup del equipo (claves compartidas)

1. Creá tu propia wallet de testnet (Base Sepolia, sin fondos reales). Desde `web/`:

   ```bash
   node scripts/wallet.mjs      # crea web/.env.local con NOTARIO_PRIVATE_KEY y NOTARIO_RPC_URL e imprime tu dirección pública
   ```

   Nunca pisa una clave que ya exista ni imprime la clave privada.
2. **Después** pegá al final de `web/.env.local` el bloque de claves que te pasó el dueño del proyecto por un canal privado (OpenRouter + la app de Mercado Pago). **No lo subas al repo ni lo reenvíes.**
3. Opcional, para sellar carpetas on-chain: cargale ETH de prueba a tu dirección desde un faucet de Base Sepolia, corré `node scripts/deploy.mjs --deploy` y agregá la dirección que imprime a `.env.local` como `NOTARIO_CONTRACT`. Sin esto el sellado queda simulado.
4. `npm run dev`. Reiniciá el servidor después de editar `.env.local`.

> Las claves OAuth de Mercado Pago solo funcionan con una URL de redirect pública con https, así que "conectar mi cuenta" no se puede completar en `localhost`. Localmente, Mercado Pago muestra los datos simulados.

## Configuración opcional

Copiá `web/.env.example` a `web/.env.local`. Todo es opcional.

| Variable | Efecto |
|---|---|
| `ANTHROPIC_API_KEY` o `OPENROUTER_API_KEY` | Mensajes redactados con IA y lectura de fotos de comprobantes. Sin clave se usan textos por reglas y no se pueden leer fotos. (OpenRouter usa solo modelos `:free`.) |
| `MP_ACCESS_TOKEN`, `MP_MODO` | Lee una cuenta de Mercado Pago directamente (sirve el token de un usuario de prueba). |
| `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_COOKIE_SECRET` | Activan el flujo OAuth "conectar mi cuenta". Necesita una URL pública con https, así que solo se puede probar ya desplegada. **No probado contra Mercado Pago real.** |
| `NOTARIO_PRIVATE_KEY`, `NOTARIO_CONTRACT`, `NOTARIO_RPC_URL` | Sella los hashes de las carpetas en Base Sepolia (solo testnet, usá una wallet descartable). Sin esto el sellado es **simulado**. Ver `web/scripts/wallet.mjs` y `web/scripts/deploy.mjs`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Avisos push de vencimientos en el navegador. Se generan con `npm run vapid`. |

Nunca subas `.env.local` al repo.

## Estructura

```
web/app/(app)/      la app: Hoy, Proyección, Excedente, Datos, Sello
web/app/demo/       simulador de chat tipo WhatsApp
web/app/api/        analizar, dashboard, foto, constancia, avisos, mp/*
web/lib/            parse, forecast (motor de caja), advice, excedente, mercadopago, notario, openarg
web/public/demo/    datos de demo ficticios
web/contracts/      CashProofRegistry.sol (registro de hashes)
VALIDACION.md       investigación de mercado, competencia y regulación
PLAN.md             alcance y arquitectura
```

Más detalle técnico en [`web/README.md`](web/README.md).

## Límites conocidos

- Los datos de demo son ficticios; la precisión con datos reales no está probada.
- Los datos macro (inflación, tasas) salen de una copia en caché de OpenARG (último dato: junio de 2026).
- Los feriados están cargados a mano y son aproximados; la estacionalidad no se aprende con seis meses de historia.
- Caución y renta fija a corto plazo no tienen tasa de referencia cargada.
- No es asesoramiento financiero. Según la normativa argentina, recomendar valores exige registro en la CNV; este proyecto solo muestra clases genéricas y está pensado para derivar al usuario, con su consentimiento, a un agente habilitado.
