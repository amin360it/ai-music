const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORTS = [8000, 8001, 8002, 8003, 8004, 8080, 3000];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const NO_CACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' };

function tryListen(ports, i = 0) {
  if (i >= ports.length) {
    console.error('Could not bind to any port.', ports);
    process.exit(1);
  }
  const port = ports[i];
  const server = http.createServer((req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }
    // Helper to always include CORS headers
    const wh = (code, h) => { res.writeHead(code, { ...h, ...CORS, ...NO_CACHE }); };
    try {
      let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      if (urlPath === '/') urlPath = '/index.html';

      // Sync endpoint – store/retrieve user data (favorites, playlists, settings)
      if (urlPath === '/api/sync') {
        const dbPath = path.join(ROOT, 'userdata.json');
        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(dbPath, 'utf8');
            wh(200, { 'Content-Type': 'application/json' });
            res.end(data);
          } catch { wh(200, { 'Content-Type': 'application/json' }); res.end('{}'); }
          return;
        }
        if (req.method === 'PUT') {
          let body = '';
          req.on('data', c => body += c);
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf8');
              wh(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch { wh(400); res.end('Bad JSON'); }
          });
          return;
        }
        wh(405); res.end('Method not allowed'); return;
      }

      // Auto-discovery of all MP3s in the served folder (excludes vendor/)
      if (urlPath === '/api/tracks') {
        const out = [];
        const walk = (dir, base) => {
          for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            const rel = (base + '/' + e.name).replace(/\\/g, '/');
            if (e.isDirectory()) { if (e.name === 'vendor') continue; walk(full, rel); }
            else if (/\.mp3$/i.test(e.name)) { const st = fs.statSync(full); out.push({ name: e.name, size: st.size, rel }); }
          }
        };
        walk(ROOT, '');
        wh(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(out));
        return;
      }

      const filePath = path.normalize(path.join(ROOT, urlPath));
      if (!filePath.startsWith(ROOT)) {
        wh(403); res.end('Forbidden'); return;
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          wh(404, { 'Content-Type': 'text/plain' });
          res.end('Not found: ' + urlPath);
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        wh(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        const stm = fs.createReadStream(filePath); stm.on('error',()=>{wh(500);res.end()}); stm.pipe(res);
      });
    } catch (e) {
      wh(500); res.end('Server error');
    }
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') { tryListen(ports, i + 1); }
    else { console.error(e); process.exit(1); }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log('SPA running at: ' + url);
    console.log('Serving folder:  ' + ROOT);
    console.log('Press Ctrl+C to stop.\n');
  });
}

tryListen(PORTS);
