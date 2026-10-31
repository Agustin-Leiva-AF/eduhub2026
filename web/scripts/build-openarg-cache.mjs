// Convierte las respuestas cacheadas de OpenARG (openarg_datos*.md) en un JSON que la app lee sin red.
// Uso: node web/scripts/build-openarg-cache.mjs   (desde la carpeta haka)
import fs from 'node:fs';

const fuentes = ['openarg_datos.md', 'openarg_datos2.md'];
const series = [];
for (const f of fuentes) {
  const md = fs.readFileSync(f, 'utf8');
  for (const sec of md.split(/^## /m).slice(1)) {
    const nombre = sec.split('\n')[0].trim();
    const tabla = (sec.match(/`([a-z_.0-9]+)`/) || [])[1];
    const link = sec.match(/Fuente: \[([^\]]+)\]\(([^)]+)\)/);
    const csv = (sec.match(/```csv\n([\s\S]*?)```/) || [])[1];
    if (!csv) continue;
    const [head, ...rows] = csv.trim().split('\n');
    const cols = head.split(',');
    const filas = rows.map(r => {
      const v = r.split(',');
      return Object.fromEntries(cols.map((c, i) => [c, isNaN(+v[i]) || v[i] === '' ? v[i] : +v[i]]));
    });
    series.push({ nombre, tabla, fuente: link?.[1], url: link?.[2], archivo: f, columnas: cols, filas });
  }
}
const out = { generado: new Date().toISOString().slice(0, 10), origen: 'OpenARG MCP (mcp.openarg.org), tablas de INDEC/BCRA/SIPA vía datos.gob.ar', series };
fs.writeFileSync('web/data/openarg_cache.json', JSON.stringify(out, null, 1));
console.log(series.map(s => `${s.filas.length.toString().padStart(3)}  ${s.nombre}`).join('\n'));
