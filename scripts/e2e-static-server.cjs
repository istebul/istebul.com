/**
 * Serves production build (dist/) for Playwright — includes /auto/ bundle.
 */
const express = require('express');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.static(dist, { index: 'index.html' }));
app.listen(PORT, HOST, () => {
  console.log(`E2E static server: http://${HOST}:${PORT} (dist/)`);
});
