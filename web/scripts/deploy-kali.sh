#!/usr/bin/env bash
# Deja la app corriendo en esta máquina (Kali/WSL) y publicada con Tailscale (HTTPS con el nombre MagicDNS).
# Uso (desde web/):  bash scripts/deploy-kali.sh            -> actualiza desde GitHub, compila y reinicia
#                    bash scripts/deploy-kali.sh --funnel   -> además la abre a internet (cualquiera con el link)
#                    (sin bandera conserva la publicación actual; la primera vez usá --funnel o --privado)
#                    bash scripts/deploy-kali.sh --privado  -> la deja solo dentro de tu tailnet
# Requiere: node 20+, git, tailscale conectado. No necesita sudo. Las claves van en web/.env.local (nunca en el repo).
set -euo pipefail

PUERTO="${PUERTO:-3100}"
cd "$(dirname "$0")/.."
RAIZ="$(git rev-parse --show-toplevel)"

echo "→ Actualizando código"
git -C "$RAIZ" pull --ff-only
npm ci --no-audit --no-fund

# Secreto estable para cifrar la cookie del token de Mercado Pago (se crea una vez).
if ! grep -q '^MP_COOKIE_SECRET=' .env.local 2>/dev/null; then
  printf '\nMP_COOKIE_SECRET=%s\n' "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")" >> .env.local
  echo "→ Generé MP_COOKIE_SECRET en .env.local"
fi

echo "→ Compilando"
npm run build

NODO="$(command -v node)"
UNIDAD="$HOME/.config/systemd/user/cfo-web.service"
mkdir -p "$(dirname "$UNIDAD")"
cat > "$UNIDAD" <<EOF
[Unit]
Description=CFO de Bolsillo (Next.js)
After=network-online.target

[Service]
WorkingDirectory=$PWD
Environment=NODE_ENV=production
Environment=PATH=$(dirname "$NODO"):/usr/local/bin:/usr/bin:/bin
ExecStart=$NODO $PWD/node_modules/next/dist/bin/next start -p $PUERTO
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable cfo-web.service >/dev/null 2>&1
systemctl --user restart cfo-web.service

echo "→ Esperando que responda"
for _ in $(seq 1 30); do curl -fs -o /dev/null "http://127.0.0.1:$PUERTO/" && break; sleep 1; done
curl -fs -o /dev/null "http://127.0.0.1:$PUERTO/" || { echo "No levantó. Mirá: journalctl --user -u cfo-web -n 50"; exit 1; }

case "${1:-}" in
  --funnel)  tailscale funnel --bg "$PUERTO" >/dev/null ;;
  --privado) tailscale funnel --https=443 off >/dev/null 2>&1 || true; tailscale serve --bg --https=443 "http://127.0.0.1:$PUERTO" >/dev/null ;;
  *)         ;; # sin bandera no se toca la publicación: se conserva lo que haya (privado o Funnel)
esac
echo; tailscale serve status
