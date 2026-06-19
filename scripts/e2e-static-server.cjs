/**
 * Serves production build (dist/) for Playwright — includes /auto/ bundle.
 * Mirrors Cloudflare Pages: static files first, then SPA index.html fallback.
 */
const fs = require('fs');
const express = require('express');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const indexHtml = path.join(dist, 'index.html');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.static(dist, { index: false }));

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }

  const pathname = decodeURIComponent(req.path.split('?')[0]);
  const candidates = [
    path.join(dist, pathname),
    path.join(dist, pathname, 'index.html'),
    path.join(dist, `${pathname}.html`)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return res.sendFile(candidate);
    }
  }

  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }

  return next();
});

app.listen(PORT, HOST, () => {
  console.log(`E2E static server: http://${HOST}:${PORT} (dist/)`);
});
