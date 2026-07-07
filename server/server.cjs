const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DIST_DIR = path.join(ROOT, 'dist');
const STARTED_AT = new Date().toISOString();
const FILES = {
  trades: path.join(DATA_DIR, 'trades.json'),
  predictions: path.join(DATA_DIR, 'predictions.json'),
};

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
  res.end(JSON.stringify(value));
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
  const file = FILES[key];
  if (req.method === 'GET') {
    sendJson(res, 200, readJson(file));
    return;
  }
  if (req.method === 'PUT') {
    const body = await readBody(req);
    sendJson(res, 200, writeJson(file, body));
    return;
  }
  if (req.method === 'POST') {
    const body = await readBody(req);
    const current = readJson(file);
    if (body && body.id) {
      const idx = current.findIndex(item => item.id === body.id);
      if (idx >= 0) current[idx] = { ...current[idx], ...body };
      else current.unshift(body);
    }
    sendJson(res, 200, writeJson(file, current));
    return;
  }
  if (req.method === 'DELETE') {
    sendJson(res, 200, writeJson(file, []));
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
    if (url.pathname === '/api/health') {
      sendJson(res, 200, {
        ok: true,
        startedAt: STARTED_AT,
        store: DATA_DIR,
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
  console.log(`Saving trades and predictions in ${DATA_DIR}`);
});
