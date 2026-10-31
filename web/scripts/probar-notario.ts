// Ida y vuelta del notario en Base Sepolia: sella una carpeta de prueba y la verifica.
// Requiere NOTARIO_PRIVATE_KEY + NOTARIO_CONTRACT en web/.env.local (lib/notario.ts los lee).
// Uso (desde web/): npx tsx scripts/probar-notario.ts
import { sellar, verificar } from '../lib/notario';

async function main() {
  const carpeta = {
    tipo: 'prueba-notario',
    empresa: 'Carpeta de prueba (ficticia)',
    creada: new Date().toISOString(),
    nota: 'Ida y vuelta de testnet Base Sepolia',
  };

  const constancia = await sellar(carpeta, 'entidad-de-prueba');
  console.log('sellar -> modo:', constancia.modo, '| hash:', constancia.hash);
  if (constancia.modo !== 'testnet') {
    throw new Error('El sellado no fue a testnet (quedó en modo simulado). Revisá .env.local y el saldo.');
  }
  console.log('tx:', constancia.url);

  const v = await verificar(constancia.hash);
  console.log('verificar -> modo:', v.registro.modo, '| existe:', v.registro.existe, '| coincide:', v.coincide);
  if (v.registro.modo !== 'testnet' || !v.registro.existe || !v.coincide) {
    throw new Error('La verificación no confirmó el registro en testnet.');
  }
  console.log('OK: ida y vuelta confirmada en testnet.');
  console.log('contrato:', v.registro.url);
}

main().catch(e => {
  console.error('FALLÓ:', e instanceof Error ? e.message : e);
  process.exit(1);
});
