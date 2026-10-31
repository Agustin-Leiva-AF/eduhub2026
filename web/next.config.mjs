import nextEnv from '@next/env';

// Las claves viven en el .env de la raíz del repo; Next solo lee web/.env*, así que se carga también ../.env.
nextEnv.loadEnvConfig('..');

/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR permite compilar la versión de producción mientras corre el servidor de desarrollo.
export default { distDir: process.env.NEXT_DIST_DIR || '.next' };
