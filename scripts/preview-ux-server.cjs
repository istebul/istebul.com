#!/usr/bin/env node
/**
 * UX önizleme — tek komut, yönlendirme yok.
 * Kullanım: npm run preview:ux
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'docs', 'previews');
const PORT = Number(process.env.PREVIEW_PORT || 9876);
const FILE = 'onay-oncesi-ux-preview.html';

const htmlPath = path.join(ROOT, FILE);

if (!fs.existsSync(htmlPath)) {
  console.error('Dosya bulunamadı:', htmlPath);
  console.error('Proje kökünden çalıştırın: npm run preview:ux');
  process.exit(1);
}

const html = fs.readFileSync(htmlPath);

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];

  if (url === '/' || url === '/onay-oncesi-ux-preview.html' || url === '/onay-oncesi-ux-preview') {
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(html);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — Sadece önizleme sayfası var.\nAçın: http://127.0.0.1:' + PORT + '/\n');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}/`;
  console.log('');
  console.log('  isteBul UX önizleme');
  console.log('  ───────────────────');
  console.log('  Tarayıcıda açın:  ' + url);
  console.log('  Durdurmak için:   Ctrl+C');
  console.log('');
  console.log('  Dosya yolu (sunucusuz):');
  console.log('  ' + htmlPath);
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' dolu. Başka port: PREVIEW_PORT=9877 npm run preview:ux');
  } else {
    console.error(err.message);
  }
  process.exit(1);
});
