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
  const publicEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SENTRY_DSN: process.env.SENTRY_DSN || '',
    LOGROCKET_APP_ID: process.env.LOGROCKET_APP_ID || ''
  };

  res.type('application/javascript');
  res.set('Cache-Control', 'no-store');
  res.send(`window.__env = Object.assign({}, window.__env || {}, ${JSON.stringify(publicEnv)});`);
});

app.use(express.static(path.join(__dirname), {
  etag: true,
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

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

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
