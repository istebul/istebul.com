const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const required = [
  'dist/index.html',
  'dist/offline.html',
  'dist/env.js',
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

const distJs = path.join(root, 'dist/js');
const requiredPartnerBundles = [
  'dist/js/corporate/partner.js',
  'dist/js/corporate/partner-planlar.js',
  'dist/js/corporate/partner-basvuru.js',
  'dist/js/corporate/partner-guven.js',
  'dist/js/corporate/partner-docs.js'
];

if (fs.existsSync(distJs)) {
  const bundle = fs.readdirSync(distJs).find((name) => /^app\.bundle-[A-Z0-9]+\.js$/.test(name));
  if (!bundle) {
    failed = true;
    console.error('Missing build output: dist/js/app.bundle-[hash].js');
  }
} else {
  failed = true;
  console.error('Missing build output: dist/js/');
}

requiredPartnerBundles.forEach((file) => {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
    failed = true;
    console.error('Missing build output: ' + file);
  }
});

const distCss = path.join(root, 'dist/css');
if (fs.existsSync(distCss)) {
  const hashedStyle = fs.readdirSync(distCss).some((name) => /^style\.[a-f0-9]+\.css$/.test(name));
  if (!hashedStyle) {
    failed = true;
    console.error('Missing hashed CSS: dist/css/style.[hash].css');
  }
} else {
  failed = true;
  console.error('Missing build output: dist/css/');
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
  const bundleMatch = html.match(/\/js\/app\.bundle-[A-Z0-9]+\.js/);
  const bundleIndex = bundleMatch ? html.indexOf(bundleMatch[0]) : -1;

  if (envIndex === -1 || bundleIndex === -1 || envIndex > bundleIndex) {
    failed = true;
    console.error('dist/index.html must load /env.js before app.bundle script');
  }

  if (!html.includes('id="meta-canonical"')) {
    failed = true;
    console.error('dist/index.html missing route-aware meta-canonical');
  }

  if (!html.includes('data-ib-route')) {
    failed = true;
    console.error('dist/index.html missing route surface bootstrap');
  }
}

if (failed) process.exit(1);
console.log('Build output check passed.');
