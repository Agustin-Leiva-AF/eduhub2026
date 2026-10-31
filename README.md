# CFO de Bolsillo ("Pocket CFO")

🇪🇸 [Leer en español](README.es.md)

A cash-flow co-pilot for small businesses in Argentina. It reads a bank statement and the tax-authority (ARCA) invoice exports, projects the cash balance day by day for 120 days, warns about the days you will run short, compares real-rate options to cover the gap, and, when there is safe surplus cash, shows which *classes* of placement fit that window. All amounts are computed by deterministic code; the LLM (optional) only writes the explanations.

> **Status: working prototype, demo data only.** Nothing has been validated with real bank or Mercado Pago exports yet, and it is not financial advice. It does not custody funds or name financial products.

## Try it in 3 minutes

Requirements: Node.js 20+ and npm. No API keys are needed.

```bash
git clone https://github.com/JuanIPlanes/eduhub2026.git
cd eduhub2026/web
npm install
npm run dev
```

Open <http://localhost:3000>. The app loads a fictional business ("La Esquina de Nueva Córdoba") automatically.

> The first `/api/analizar` call can take up to ~50 s without an AI key, because the optional AI write-up times out before the rule-based text is used. The cash-balance view appears first; alerts and surplus fill in afterwards.

### What to click

| Where | What to try |
|---|---|
| `/` **Today** | Balance, shortfall alert, next payments, 30-day chart. |
| `/proyeccion` **Projection** | 15/30/60/90/120-day horizons, gaps, options to cover them with their cost, consent and sealing. |
| `/excedente` **Surplus** | Safe surplus, window in days, reserve, nominal vs. inflation-adjusted return, generic placement classes. With the default demo there is *no* surplus (an upcoming gap). |
| `/datos` **Data** | Use the demo, **"Ver caso con caja holgada"** (comfortable-cash case, shows a surplus), upload your own CSVs, upload an invoice photo (needs an AI key), connect Mercado Pago (shows "pending credentials" unless configured). |
| `/sello` **Seal** | Hashes of the folders you sealed, plus an integrity check. |
| `/demo` | The WhatsApp-style chat simulator: the channel the final product is meant to use. Click "Probar con la pyme demo". |

On a phone (or a narrow browser window) you get a bottom tab bar; on desktop (≥1024 px) a sidebar and richer dashboards. It is an installable PWA in production builds.

### Use your own files

`/datos` → upload CSVs. Recognised formats (⚠ none verified against real exports yet; some are educated guesses):

- Bank statements: `Date;Description;Debit;Credit;Balance`, or a single signed `Amount` column (BNA-style).
- ARCA "Mis Comprobantes" received/issued CSVs.
- Mercado Pago account reports (release / settlement, English headers) and the Spanish activity export.
- Optional: due-date bills (`boletas`) and payroll (`nómina`) CSVs. See `web/public/demo/` for examples.

Files are processed in memory by the server; hashes (SHA-256) are shown so you can verify what was read.

## Tests

```bash
cd web
npm test        # parsers, cash engine, surplus, Mercado Pago mapping, cookie crypto
npx tsc --noEmit
npm run build   # production build (downloads Google Fonts at build time)
```

## Team setup (shared `.env.local`)

1. Get the `.env.local` file the project owner shares with you privately and put it in `web/.env.local`. It holds the shared API keys (AI, Mercado Pago). **Never commit it or repost it.**
2. Generate your own testnet wallet (Base Sepolia, no real funds). From `web/`:

   ```bash
   node scripts/wallet.mjs      # appends NOTARIO_PRIVATE_KEY and NOTARIO_RPC_URL to .env.local, prints your public address
   ```

   It never overwrites a key that is already there, and never prints the private key.
3. Fund that address with test ETH from a Base Sepolia faucet, then deploy your own registry contract and copy the printed address into `.env.local` as `NOTARIO_CONTRACT`:

   ```bash
   node scripts/deploy.mjs --deploy
   ```

4. `npm run dev`. Without steps 2-3, folder sealing stays simulated; everything else works.

## Optional configuration

Copy `web/.env.example` to `web/.env.local`. Everything is optional.

| Variable | Effect |
|---|---|
| `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY` | AI-written messages and invoice-photo reading. Without it the app falls back to rule-based text, and photos cannot be read. (OpenRouter uses only `:free` models.) |
| `MP_ACCESS_TOKEN`, `MP_MODO` | Read a Mercado Pago account directly (a test user's token works). |
| `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_REDIRECT_URI`, `MP_COOKIE_SECRET` | Enable the OAuth "connect my account" flow. It needs a public https URL, so it can only be tested once deployed. **Not tested against real Mercado Pago.** |
| `NOTARIO_PRIVATE_KEY`, `NOTARIO_CONTRACT`, `NOTARIO_RPC_URL` | Seal folder hashes on Base Sepolia (testnet only, use a throwaway wallet). Without them, sealing is **simulated**. See `web/scripts/wallet.mjs` and `web/scripts/deploy.mjs`. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Browser push alerts for due dates. Generate with `npm run vapid`. |

Never commit `.env.local`.

## Project layout

```
web/app/(app)/      the app: Today, Projection, Surplus, Data, Seal
web/app/demo/       WhatsApp-style chat simulator
web/app/api/        analizar, dashboard, foto, constancia, avisos, mp/*
web/lib/            parse, forecast (cash engine), advice, excedente, mercadopago, notario, openarg
web/public/demo/    fictional demo data
web/contracts/      CashProofRegistry.sol (hash registry)
VALIDACION.md       market, competition and regulation research (Spanish)
PLAN.md             scope and architecture (Spanish)
```

More technical detail in [`web/README.md`](web/README.md) (Spanish).

## Known limits

- Demo data is fictional; real-world accuracy is unproven.
- Macro data (inflation, rates) comes from a cached OpenARG snapshot (latest point: June 2026).
- Public holidays are hard-coded and approximate; seasonality is not learned from six months of history.
- Caution and short-term fixed-income classes have no reference rate loaded.
- Not financial advice. Under Argentine rules, recommending securities requires CNV registration; this project only shows generic classes and is designed to refer users, with consent, to an authorised broker.
