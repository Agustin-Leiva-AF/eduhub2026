// Compila CashProofRegistry.sol y (si hay clave) lo despliega en Base Sepolia.
// Uso: node scripts/deploy.mjs            -> solo compila (contracts/CashProofRegistry.json)
//      NOTARIO_PRIVATE_KEY=0x... node scripts/deploy.mjs --deploy
// La clave debe ser de una wallet de TESTNET sin fondos reales (faucet de Base Sepolia).
import fs from 'node:fs';
import solc from 'solc';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Lee web/.env.local (Next lo carga solo dentro de la app; este script de Node no). No pisa el entorno existente.
try {
  for (const linea of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* sin .env.local */ }

const fuente = fs.readFileSync('contracts/CashProofRegistry.sol', 'utf8');
const out = JSON.parse(solc.compile(JSON.stringify({
  language: 'Solidity',
  sources: { 'CashProofRegistry.sol': { content: fuente } },
  settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
})));
const errores = (out.errors ?? []).filter(e => e.severity === 'error');
if (errores.length) { console.error(errores.map(e => e.formattedMessage).join('\n')); process.exit(1); }
const c = out.contracts['CashProofRegistry.sol'].CashProofRegistry;
const artefacto = { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object };
fs.writeFileSync('contracts/CashProofRegistry.json', JSON.stringify(artefacto, null, 1));
console.log('Compilado: contracts/CashProofRegistry.json');

if (process.argv.includes('--deploy')) {
  const pk = process.env.NOTARIO_PRIVATE_KEY;
  if (!pk) { console.error('Falta NOTARIO_PRIVATE_KEY'); process.exit(1); }
  const account = privateKeyToAccount(pk);
  const transport = http(process.env.NOTARIO_RPC_URL || 'https://sepolia.base.org');
  const wallet = createWalletClient({ account, chain: baseSepolia, transport });
  const pub = createPublicClient({ chain: baseSepolia, transport });
  const hash = await wallet.deployContract({ abi: artefacto.abi, bytecode: artefacto.bytecode });
  const rec = await pub.waitForTransactionReceipt({ hash });
  console.log(`Desplegado en ${rec.contractAddress}\nhttps://sepolia.basescan.org/address/${rec.contractAddress}\nAgregá NOTARIO_CONTRACT=${rec.contractAddress} a .env.local`);
}
