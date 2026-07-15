const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;
const MAX_PORT_ATTEMPTS = 10;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/env.js', (_req, res) => {
  const { buildPublicEnv, formatEnvJs } = require('./scripts/lib/public-env.cjs');
  const publicEnv = buildPublicEnv(process.env);

  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(formatEnvJs(publicEnv));
});


app.get('/js/app.bundle.js', (_req, res, next) => {
  const fs = require('fs');
  const distJs = path.join(__dirname, 'dist', 'js');

  if (!fs.existsSync(distJs)) return next();

  const bundle = fs.readdirSync(distJs).find((name) => /^app\.bundle-[A-Z0-9]+\.js$/.test(name));
  if (!bundle) return next();

  res.type('application/javascript');
  res.sendFile(path.join(distJs, bundle));
});

/** PR-564 — serve bundled Platform Landing Preview (TS → ESM) without changing `/`. */
app.get('/js/runtime/platform-shell-preview.js', (_req, res, next) => {
  const fs = require('fs');
  const distFile = path.join(__dirname, 'dist', 'js', 'runtime', 'platform-shell-preview.js');
  if (fs.existsSync(distFile)) {
    res.type('application/javascript');
    return res.sendFile(distFile);
  }
  try {
    const esbuild = require('esbuild');
    const result = esbuild.buildSync({
      entryPoints: [path.join(__dirname, 'js', 'runtime', 'platform-shell-preview.js')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: 'es2020',
      write: false
    });
    res.type('application/javascript');
    return res.send(result.outputFiles[0].text);
  } catch {
    return next();
  }
});

app.use('/js/chunks', express.static(path.join(__dirname, 'dist', 'js', 'chunks'), {
  fallthrough: false,
  setHeaders: (res) => {
    res.type('application/javascript');
  }
}));

app.use(express.static(path.join(__dirname), {
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

// P7-J CX Vite assets (built to dist/r/cx-assets)
app.use(
  '/r/cx-assets',
  express.static(path.join(__dirname, 'dist', 'r', 'cx-assets'), {
    etag: true,
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  }),
);

if (process.env.NODE_ENV === 'production') {
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }));
}

// API routes (simple proxy for development)
app.use('/api', (req, res) => {
  res.json({
    message: 'API endpoint - use Netlify functions in production',
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Static HTML / Auto — do not SPA-fallback over standalone pages
app.get('*', (req, res, next) => {
  const fs = require('fs');
  const raw = req.path.split('?')[0];
  const rel = raw.replace(/^\//, '');

  if (rel.endsWith('.html')) {
    const file = path.join(__dirname, rel);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return res.sendFile(file);
    }
    return next();
  }

  if (raw === '/auto' || raw === '/auto/') {
    const autoIndex = path.join(__dirname, 'auto', 'index.html');
    if (fs.existsSync(autoIndex)) {
      return res.sendFile(autoIndex);
    }
  }

  if (raw === '/platform-preview' || raw === '/platform-preview/') {
    const previewIndex = path.join(__dirname, 'platform-preview', 'index.html');
    if (fs.existsSync(previewIndex)) {
      return res.sendFile(previewIndex);
    }
  }

  if (raw === '/r/onay' || raw === '/r/onay/') {
    const confirmIndex = path.join(__dirname, 'r', 'onay', 'index.html');
    if (fs.existsSync(confirmIndex)) {
      return res.sendFile(confirmIndex);
    }
  }

  // P7-J Customer Experience Platform SPA (/r/{slug}). Prefer built dist; keep /r/onay above.
  if (raw === '/r' || raw === '/r/' || raw.startsWith('/r/')) {
    const cxIndex = path.join(__dirname, 'dist', 'r', 'index.html');
    const reservationIndex = path.join(__dirname, 'r', 'index.html');
    const file = fs.existsSync(cxIndex) ? cxIndex : reservationIndex;
    if (fs.existsSync(file)) {
      return res.sendFile(file);
    }
  }

  if (raw.startsWith('/auto/') && !path.extname(raw)) {
    const autoIndex = path.join(__dirname, 'auto', 'index.html');
    if (fs.existsSync(autoIndex)) {
      return res.sendFile(autoIndex);
    }
  }

  let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  html = html.replace(/js\/app\.bundle-[A-Z0-9]+\.js/g, 'js/app.bundle.js');
  res.type('html').send(html);
});

const startServer = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
  const server = app.listen(port, HOST, () => {
    console.log(`isteBu v2 development server running on http://${HOST}:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.warn(`Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1, attemptsLeft - 1);
      return;
    }

    console.error(`Failed to start development server: ${error.message}`);
    process.exit(1);
  });
};

startServer(PORT);
