// Genera una wallet NUEVA solo para TESTNET (Base Sepolia) y guarda la clave en web/.env.local.
// Si ya existe NOTARIO_PRIVATE_KEY en .env.local, NO la reemplaza: solo muestra la dirección pública.
// La clave privada nunca se imprime. Uso: node scripts/wallet.mjs
import fs from 'node:fs';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const envFile = new URL('../.env.local', import.meta.url);
let actual = '';
try { actual = fs.readFileSync(envFile, 'utf8'); } catch { /* todavía no existe */ }

const existente = actual.match(/^\s*NOTARIO_PRIVATE_KEY\s*=\s*(\S+)/m);
if (existente) {
  const address = privateKeyToAccount(existente[1].replace(/^["']|["']$/g, '')).address;
  console.log(`.env.local ya tiene NOTARIO_PRIVATE_KEY (no se reemplazó). Dirección pública: ${address}`);
} else {
  const pk = generatePrivateKey();
  const address = privateKeyToAccount(pk).address;
  const prefijo = actual && !actual.endsWith('\n') ? '\n' : '';
  const bloque = `${prefijo}# Wallet de TESTNET (Base Sepolia). Generada por scripts/wallet.mjs. No usar con fondos reales.\nNOTARIO_PRIVATE_KEY=${pk}\nNOTARIO_RPC_URL=https://sepolia.base.org\n`;
  fs.writeFileSync(envFile, actual + bloque);
  console.log(`Wallet nueva de testnet creada y guardada en web/.env.local. Dirección pública: ${address}`);
}
