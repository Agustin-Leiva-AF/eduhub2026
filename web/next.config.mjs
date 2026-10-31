/** @type {import('next').NextConfig} */
// NEXT_DIST_DIR permite compilar la versión de producción mientras corre el servidor de desarrollo.
export default { distDir: process.env.NEXT_DIST_DIR || '.next' };
