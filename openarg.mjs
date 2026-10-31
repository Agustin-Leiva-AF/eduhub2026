// Cliente mínimo para el MCP de OpenARG. Requiere Node 18+.
// Uso (PowerShell):
//   $env:OPENARG_KEY="tu_clave"
//   node openarg.mjs tools                      -> lista herramientas y guarda openarg_tools.json
//   node openarg.mjs call <tool> '{"k":"v"}'    -> llama una herramienta con args JSON
//   node openarg.mjs run <tool> <argumento>     -> corre cada línea de preguntas.txt como {argumento: pregunta}
import fs from 'node:fs';

const URL = 'https://mcp.openarg.org/mcp';
// Fallback: lee OPENARG_KEY de .env (no versionado) si no está en el entorno.
if (!process.env.OPENARG_KEY && fs.existsSync('.env')) {
  const m = fs.readFileSync('.env', 'utf8').match(/^OPENARG_KEY=(.+)$/m);
  if (m) process.env.OPENARG_KEY = m[1].trim();
}
const KEY = process.env.OPENARG_KEY;
if (!KEY) { console.error('Falta la variable OPENARG_KEY'); process.exit(1); }

let sid = null, id = 0;

async function rpc(method, params, notify = false) {
  const body = { jsonrpc: '2.0', method, params };
  if (!notify) body.id = ++id;
  const headers = {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sid) headers['Mcp-Session-Id'] = sid;
  const r = await fetch(URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const s = r.headers.get('mcp-session-id');
  if (s) sid = s;
  if (notify) return null;
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 300)}`);
  let json;
  if ((r.headers.get('content-type') || '').includes('text/event-stream')) {
    const line = t.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).filter(Boolean).pop();
    json = JSON.parse(line);
  } else {
    json = JSON.parse(t);
  }
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function init() {
  await rpc('initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'haka', version: '1' } });
  await rpc('notifications/initialized', {}, true);
}

const text = res => (res?.content || []).map(c => c.text ?? JSON.stringify(c)).join('\n');

const [cmd, a, b] = process.argv.slice(2);
await init();

if (cmd === 'tools') {
  const res = await rpc('tools/list', {});
  fs.writeFileSync('openarg_tools.json', JSON.stringify(res, null, 2));
  for (const t of res.tools) console.log(`- ${t.name}: ${(t.description || '').slice(0, 120)}`);
  console.log('\nGuardado en openarg_tools.json');
} else if (cmd === 'call') {
  const res = await rpc('tools/call', { name: a, arguments: JSON.parse(b || '{}') });
  console.log(text(res));
} else if (cmd === 'run') {
  const qs = fs.readFileSync('preguntas.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const out = [];
  for (const q of qs) {
    console.log('> ' + q);
    try {
      const res = await rpc('tools/call', { name: a, arguments: { [b]: q } });
      out.push({ pregunta: q, respuesta: text(res), raw: res });
    } catch (e) {
      out.push({ pregunta: q, error: String(e) });
      console.error('  error: ' + e);
    }
  }
  fs.writeFileSync('openarg_resultados.json', JSON.stringify(out, null, 2));
  fs.writeFileSync('openarg_resultados.md', out.map(o => `## ${o.pregunta}\n\n${o.respuesta ?? 'ERROR: ' + o.error}\n`).join('\n'));
  console.log('\nGuardado en openarg_resultados.json y openarg_resultados.md');
} else if (cmd === 'search') {
  // Busca datasets (no descuenta preguntas). Una búsqueda por línea en busquedas.txt
  const qs = fs.readFileSync(a || 'busquedas.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  let md = '';
  for (const q of qs) {
    console.log('> ' + q);
    try {
      const res = await rpc('tools/call', { name: 'buscar_datasets', arguments: { texto: q, limite: 8 } });
      md += `## ${q}\n\n${text(res)}\n\n`;
    } catch (e) { md += `## ${q}\n\nERROR: ${e}\n\n`; console.error('  error: ' + e); }
  }
  fs.writeFileSync(b || 'openarg_busquedas.md', md);
  console.log('\nGuardado en openarg_busquedas.md');
} else if (cmd === 'describe') {
  // Describe cada tabla listada en tablas.txt (no descuenta preguntas)
  const ts = fs.readFileSync(a || 'tablas.txt', 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  let md = '';
  for (const t of ts) {
    console.log('> ' + t);
    try {
      const res = await rpc('tools/call', { name: 'describir_tabla', arguments: { tabla: t } });
      md += `## ${t}\n\n${text(res)}\n\n`;
    } catch (e) { md += `## ${t}\n\nERROR: ${e}\n\n`; console.error('  error: ' + e); }
  }
  fs.writeFileSync(b || 'openarg_tablas.md', md);
  console.log('\nGuardado en openarg_tablas.md');
} else if (cmd === 'query') {
  // Ejecuta las llamadas de consultas.json: [{"nombre":"...","tool":"...","args":{...}}]
  const qs = JSON.parse(fs.readFileSync(a || 'consultas.json', 'utf8'));
  let md = '';
  for (const q of qs) {
    console.log('> ' + q.nombre);
    try {
      const res = await rpc('tools/call', { name: q.tool, arguments: q.args });
      md += `## ${q.nombre}\n\n${text(res)}\n\n`;
    } catch (e) { md += `## ${q.nombre}\n\nERROR: ${e}\n\n`; console.error('  error: ' + e); }
  }
  fs.writeFileSync(b || 'openarg_datos.md', md);
  console.log('\nGuardado en openarg_datos.md');
} else {
  console.log('Comandos: tools | search | describe | query | call <tool> <jsonargs> | run <tool> <argumento>');
}
