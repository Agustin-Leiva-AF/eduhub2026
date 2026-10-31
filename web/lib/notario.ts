// Constancia auditable: guarda la carpeta de crédito y registra su hash.
// Modo "testnet" si hay NOTARIO_PRIVATE_KEY + NOTARIO_CONTRACT (Base Sepolia); si no, modo "simulado" (registro local),
// rotulado como tal en la interfaz. Nunca se mueven fondos.
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createPublicClient, createWalletClient, http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

const ABI = [
  { type: 'function', name: 'registrar', stateMutability: 'nonpayable', inputs: [{ name: 'carpeta', type: 'bytes32' }, { name: 'destinatario', type: 'bytes32' }], outputs: [] },
  { type: 'function', name: 'verificar', stateMutability: 'view', inputs: [{ name: 'carpeta', type: 'bytes32' }], outputs: [{ name: 'existe', type: 'bool' }, { name: 'emisor', type: 'address' }, { name: 'fecha', type: 'uint64' }, { name: 'destinatario', type: 'bytes32' }] },
] as const;

const DIR = path.join(process.cwd(), 'data', 'carpetas');
const REGISTRO_LOCAL = path.join(process.cwd(), 'data', 'registro_local.json');
const EXPLORADOR = 'https://sepolia.basescan.org';

export type Constancia = { hash: Hex; destinatario: Hex; modo: 'testnet' | 'simulado'; tx?: string; url?: string; fecha: string };

// JSON canónico: claves ordenadas, para que el hash no dependa del orden de serialización.
export function canonico(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonico).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${canonico((x as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(x);
}
export const sha = (s: string) => ('0x' + createHash('sha256').update(s).digest('hex')) as Hex;

// Next carga .env.local solo dentro de la app; los scripts de Node (tsx) no. Lectura simple, sin dependencias.
// No pisa variables que ya estén definidas en el entorno.
function cargarEnvLocal() {
  try {
    const txt = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    for (const linea of txt.split(/\r?\n/)) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sin .env.local: sigue en modo simulado */ }
}

const red = () => {
  cargarEnvLocal();
  const pk = process.env.NOTARIO_PRIVATE_KEY as Hex | undefined;
  const contrato = process.env.NOTARIO_CONTRACT as Hex | undefined;
  if (!pk || !contrato) return null;
  const transport = http(process.env.NOTARIO_RPC_URL || 'https://sepolia.base.org');
  return {
    contrato,
    wallet: createWalletClient({ account: privateKeyToAccount(pk), chain: baseSepolia, transport }),
    pub: createPublicClient({ chain: baseSepolia, transport }),
  };
};

async function leerLocal(): Promise<Record<string, Constancia>> {
  try { return JSON.parse(await fs.readFile(REGISTRO_LOCAL, 'utf8')); } catch { return {}; }
}

export async function sellar(carpeta: object, destinatarioId: string): Promise<Constancia> {
  const hash = sha(canonico(carpeta));
  const destinatario = sha(destinatarioId);
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(path.join(DIR, `${hash}.json`), JSON.stringify(carpeta, null, 1));
  const fecha = new Date().toISOString();
  const r = red();
  if (r) {
    try {
      const tx = await r.wallet.writeContract({ address: r.contrato, abi: ABI, functionName: 'registrar', args: [hash, destinatario] });
      await r.pub.waitForTransactionReceipt({ hash: tx });
      return { hash, destinatario, modo: 'testnet', tx, url: `${EXPLORADOR}/tx/${tx}`, fecha };
    } catch (e) {
      console.error('Testnet no disponible, uso registro simulado:', e);
    }
  }
  const reg = await leerLocal();
  const c: Constancia = reg[hash] ?? { hash, destinatario, modo: 'simulado', fecha };
  reg[hash] = c;
  await fs.writeFile(REGISTRO_LOCAL, JSON.stringify(reg, null, 1));
  return c;
}

export type Verificacion = { carpeta: Record<string, unknown> | null; hashRecalculado: Hex | null; coincide: boolean; registro: { existe: boolean; modo: 'testnet' | 'simulado'; fecha?: string; url?: string } };

export async function verificar(hash: Hex): Promise<Verificacion> {
  let carpeta: Record<string, unknown> | null = null;
  try { carpeta = JSON.parse(await fs.readFile(path.join(DIR, `${hash}.json`), 'utf8')); } catch { /* carpeta inexistente */ }
  const hashRecalculado = carpeta ? sha(canonico(carpeta)) : null;
  const r = red();
  if (r) {
    try {
      const [existe, , fecha] = await r.pub.readContract({ address: r.contrato, abi: ABI, functionName: 'verificar', args: [hash] });
      return { carpeta, hashRecalculado, coincide: hashRecalculado === hash, registro: { existe, modo: 'testnet', fecha: existe ? new Date(Number(fecha) * 1000).toISOString() : undefined, url: `${EXPLORADOR}/address/${r.contrato}#events` } };
    } catch (e) { console.error('No pude leer la testnet:', e); }
  }
  const c = (await leerLocal())[hash];
  return { carpeta, hashRecalculado, coincide: hashRecalculado === hash, registro: { existe: Boolean(c), modo: c?.modo ?? 'simulado', fecha: c?.fecha, url: c?.url } };
}
