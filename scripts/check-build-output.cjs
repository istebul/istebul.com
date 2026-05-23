const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const required = [
  'dist/index.html',
  'dist/offline.html',
  'dist/env.js',
  'dist/css/style.css',
  'dist/js/app.js',
  'dist/js/core/security.js',
  'dist/sw.js',
  'dist/robots.txt',
  'dist/sitemap.xml',
  'dist/build-manifest.json',
  'dist/rehber/arac-kredisi-hesaplama/index.html',
  'dist/karar-asistani/index.html',
  'dist/css/seo-landing.css'
];
let failed = false;
for (const file of required) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
    failed = true;
    console.error('Missing build output: ' + file);
  }
}

const envPath = path.join(root, 'dist/env.js');
if (fs.existsSync(envPath)) {
  const envSource = fs.readFileSync(envPath, 'utf8');
  ['SERVICE_ROLE', 'CLAUDE_API_KEY', 'NETLIFY_AUTH_TOKEN'].forEach((secretName) => {
    if (envSource.includes(secretName)) {
      failed = true;
      console.error('Build env.js exposes forbidden secret key name: ' + secretName);
    }
  });
}

const indexPath = path.join(root, 'dist/index.html');
if (fs.existsSync(indexPath)) {
  const html = fs.readFileSync(indexPath, 'utf8');
  const envIndex = html.indexOf('/env.js');
  const appIndex = html.indexOf('js/app.js');
  if (envIndex === -1 || appIndex === -1 || envIndex > appIndex) {
    failed = true;
    console.error('dist/index.html must load /env.js before js/app.js');
  }
}

if (failed) process.exit(1);
console.log('Build output check passed.');
