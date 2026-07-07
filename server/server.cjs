const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DIST_DIR = path.join(ROOT, 'dist');
const STARTED_AT = new Date().toISOString();
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || '';
const FILES = {
  trades: path.join(DATA_DIR, 'trades.json'),
  predictions: path.join(DATA_DIR, 'predictions.json'),
};
let tursoClientPromise = null;

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of Object.values(FILES)) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '[]\n', 'utf8');
  }
}

function readJson(file) {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJson(file, value) {
  ensureStore();
  const next = Array.isArray(value) ? value.slice(0, 1000) : [];
  fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

async function getTursoClient() {
  if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) return null;
  if (!tursoClientPromise) {
    tursoClientPromise = (async () => {
      const { createClient } = await import('@libsql/client');
      const client = createClient({
        url: TURSO_DATABASE_URL,
        authToken: TURSO_AUTH_TOKEN,
      });
      await client.execute(`
        CREATE TABLE IF NOT EXISTS app_records (
          collection TEXT NOT NULL,
          id TEXT NOT NULL,
          data TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (collection, id)
        )
      `);
      return client;
    })().catch(error => {
      tursoClientPromise = null;
      console.error('Turso unavailable, falling back to local JSON:', error.message);
      return null;
    });
  }
  return tursoClientPromise;
}

function normalizeRecords(value) {
  return Array.isArray(value) ? value.slice(0, 1000).filter(item => item && item.id) : [];
}

async function readStore(key) {
  const client = await getTursoClient();
  if (!client) return readJson(FILES[key]);

  const result = await client.execute({
    sql: 'SELECT data FROM app_records WHERE collection = ? ORDER BY updated_at DESC LIMIT 1000',
    args: [key],
  });
  return result.rows.map(row => {
    try {
      return JSON.parse(row.data);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

async function replaceStore(key, value) {
  const records = normalizeRecords(value);
  const client = await getTursoClient();
  if (!client) return writeJson(FILES[key], records);

  const statements = [
    { sql: 'DELETE FROM app_records WHERE collection = ?', args: [key] },
    ...records.map(record => ({
      sql: 'INSERT INTO app_records (collection, id, data, updated_at) VALUES (?, ?, ?, ?)',
      args: [key, String(record.id), JSON.stringify(record), Date.now()],
    })),
  ];
  await client.batch(statements, 'write');
  return records;
}

async function upsertStore(key, value) {
  if (!value || !value.id) return readStore(key);
  const client = await getTursoClient();
  if (!client) {
    const current = readJson(FILES[key]);
    const idx = current.findIndex(item => item.id === value.id);
    if (idx >= 0) current[idx] = { ...current[idx], ...value };
    else current.unshift(value);
    return writeJson(FILES[key], current);
  }

  await client.execute({
    sql: `
      INSERT INTO app_records (collection, id, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
    `,
    args: [key, String(value.id), JSON.stringify(value), Date.now()],
  });
  return readStore(key);
}

async function clearStore(key) {
  const client = await getTursoClient();
  if (!client) return writeJson(FILES[key], []);

  await client.execute({
    sql: 'DELETE FROM app_records WHERE collection = ?',
    args: [key],
  });
  return [];
}

async function storeHealth() {
  const client = await getTursoClient();
  if (!client) {
    return {
      mode: TURSO_DATABASE_URL && TURSO_AUTH_TOKEN ? 'json-fallback' : 'json',
      location: DATA_DIR,
    };
  }
  return {
    mode: 'turso',
    databaseUrl: TURSO_DATABASE_URL.replace(/\/\/([^@/]+@)?/, '//'),
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : null);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
  });
  res.end(`${JSON.stringify(value, null, 2)}\n`);
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(html);
}

function serveApiIndex(res) {
  sendHtml(res, 200, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gold Signals API</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #0f172a; color: #e2e8f0; }
      main { max-width: 860px; margin: 0 auto; padding: 48px 20px; }
      h1 { margin: 0 0 8px; font-size: 32px; }
      p { color: #94a3b8; line-height: 1.6; }
      a { color: #fbbf24; text-decoration: none; font-weight: 700; }
      a:hover { text-decoration: underline; }
      .grid { display: grid; gap: 14px; margin-top: 28px; }
      .card { border: 1px solid rgba(148, 163, 184, .25); border-radius: 8px; padding: 18px; background: rgba(15, 23, 42, .8); }
      code { color: #67e8f9; }
    </style>
  </head>
  <body>
    <main>
      <h1>Gold Signals API</h1>
      <p>Backend is running. JSON endpoints are now pretty-printed so they are easier to read in the browser.</p>
      <div class="grid">
        <div class="card"><a href="/api/health">/api/health</a><p>Backend status and storage mode.</p></div>
        <div class="card"><a href="/api/predictions">/api/predictions</a><p>Saved prediction archive from Turso.</p></div>
        <div class="card"><a href="/api/trades">/api/trades</a><p>Saved trade journal records.</p></div>
        <div class="card"><a href="/">Dashboard</a><p>Main XAU/USD signal dashboard.</p></div>
      </div>
    </main>
  </body>
</html>`);
}

function serveStatic(req, res) {
  if (!fs.existsSync(DIST_DIR)) {
    sendJson(res, 404, {
      ok: false,
      error: 'Frontend build not found. Run npm run build, or use Vite dev server on port 3000.',
    });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const normalized = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(DIST_DIR, normalized);
  if (!filePath.startsWith(DIST_DIR)) filePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };
  res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

async function handleCollection(req, res, key) {
  if (req.method === 'GET') {
    sendJson(res, 200, await readStore(key));
    return;
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    sendJson(res, 200, await replaceStore(key, body));
    return;
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    sendJson(res, 200, await upsertStore(key, body));
    return;
  }
  if (req.method === 'DELETE') {
    sendJson(res, 200, await clearStore(key));
    return;
  }
  sendJson(res, 405, { ok: false, error: 'Method not allowed' });
}

ensureStore();

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {});
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api') {
      serveApiIndex(res);
      return;
    }
    if (url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        startedAt: STARTED_AT,
        store: await storeHealth(),
      });
      return;
    }
    if (url.pathname === '/api/trades') {
      await handleCollection(req, res, 'trades');
      return;
    }
    if (url.pathname === '/api/predictions') {
      await handleCollection(req, res, 'predictions');
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Gold dashboard backend running on http://127.0.0.1:${PORT}`);
  console.log(TURSO_DATABASE_URL && TURSO_AUTH_TOKEN
    ? `Saving trades and predictions in Turso: ${TURSO_DATABASE_URL}`
    : `Saving trades and predictions in ${DATA_DIR}`);
});
