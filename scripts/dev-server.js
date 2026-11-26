const http = require('http');
const fs = require('fs');
const path = require('path');
const ttsHandler = require('../api/tts');
const accountHandler = require('../api/account');

const PORT = Number(process.env.PORT) || 4173;
const ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const urlPath = (req.url || '/').split('?')[0];
  if (urlPath === '/api/tts') {
    await ttsHandler(req, res);
    return;
  }
  if (urlPath === '/api/account') {
    await accountHandler(req, res);
    return;
  }

  let safeRelPath = decodeURIComponent(urlPath);
  if (safeRelPath === '/') {
    safeRelPath = '/index.html';
  }

  const normalized = path.normalize(safeRelPath).replace(/^(\.\.[/\\])+/, '');
  let targetPath = path.join(ROOT, normalized);

  if (!targetPath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(targetPath, (err, stats) => {
    if (err || !stats.isFile()) {
      const ext = path.extname(targetPath);
      if (ext && ext !== '.html') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
        return;
      }
      targetPath = path.join(ROOT, 'index.html');
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(targetPath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`DET Prep Studio running at http://localhost:${PORT}`);
});
