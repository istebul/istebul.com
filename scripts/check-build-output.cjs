const fs = require('fs');
const path = require('path');
const { assertEnvJsFileContents } = require('./lib/public-env.cjs');
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
  'dist/rehber/tco-rehberi/index.html',
  'dist/rehber/finansman-rehberi/index.html',
  'dist/rehber/elektrikli-arac-rehberi/index.html',
  'dist/rehber/ikinci-el-rehberi/index.html',
  'dist/karar-asistani/index.html',
  'dist/planlar/index.html',
  'dist/blog/index.html',
  'dist/duyurular/index.html',
  'dist/kampanyalar/index.html',
  'dist/profil/index.html',
  'dist/en/index.html',
  'dist/blog-posts-manifest.json',
  'dist/css/seo-landing.css',
  'dist/js/runtime/route-bootstrap-head.js',
  'dist/admin/index.html',
  'dist/admin-panel.html',
  'dist/js/admin-panel.js'
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

const autoRuntimeDir = path.join(root, 'dist/assets/auto-runtime');
if (fs.existsSync(autoRuntimeDir)) {
  const hashedAutoJs = fs.readdirSync(autoRuntimeDir).some((name) => /^auto-app\.[a-f0-9]+\.js$/.test(name));
  const hashedAutoCss = fs.readdirSync(autoRuntimeDir).some((name) => /^ib-car\.[a-f0-9]+\.css$/.test(name));
  if (!hashedAutoJs) {
    failed = true;
    console.error('Missing hashed Auto bundle: dist/assets/auto-runtime/auto-app.[hash].js');
  }
  if (!hashedAutoCss) {
    failed = true;
    console.error('Missing hashed Auto CSS: dist/assets/auto-runtime/ib-car.[hash].css');
  }
} else {
  failed = true;
  console.error('Missing build output: dist/assets/auto-runtime/');
}

const sigortaRuntimeDir = path.join(root, 'dist/assets/sigorta-runtime');
if (fs.existsSync(sigortaRuntimeDir)) {
  const hashedSigortaJs = fs
    .readdirSync(sigortaRuntimeDir)
    .some((name) => /^sigorta-app\.[a-f0-9]+\.js$/.test(name));
  if (!hashedSigortaJs) {
    failed = true;
    console.error('Missing hashed Sigorta bundle: dist/assets/sigorta-runtime/sigorta-app.[hash].js');
  }
} else {
  failed = true;
  console.error('Missing build output: dist/assets/sigorta-runtime/');
}

const sigortaHtmlPath = path.join(root, 'dist/sigorta/index.html');
if (fs.existsSync(sigortaHtmlPath)) {
  const sigortaHtml = fs.readFileSync(sigortaHtmlPath, 'utf8');
  if (!/\/assets\/sigorta-runtime\/sigorta-app\.[a-f0-9]+\.js/.test(sigortaHtml)) {
    failed = true;
    console.error('dist/sigorta/index.html must reference hashed sigorta-app bundle');
  }
  if (!sigortaHtml.includes('sigorta-wizard-skeleton')) {
    failed = true;
    console.error('dist/sigorta/index.html must include wizard skeleton fallback');
  }
  if (/\/js\/sigorta\/sigorta-app\.js/.test(sigortaHtml)) {
    failed = true;
    console.error('dist/sigorta/index.html must not use immutable /js/sigorta/sigorta-app.js path');
  }
}

const autoHtmlPath = path.join(root, 'dist/auto/index.html');
if (fs.existsSync(autoHtmlPath)) {
  const autoHtml = fs.readFileSync(autoHtmlPath, 'utf8');
  if (!/\/assets\/auto-runtime\/auto-app\.[a-f0-9]+\.js/.test(autoHtml)) {
    failed = true;
    console.error('dist/auto/index.html must reference hashed auto-app bundle');
  }
  if (!/\/assets\/auto-runtime\/ib-car\.[a-f0-9]+\.css/.test(autoHtml)) {
    failed = true;
    console.error('dist/auto/index.html must reference hashed ib-car stylesheet');
  }
  if (!autoHtml.includes('Karar altyapısı') && !autoHtml.includes('auto-wizard')) {
    failed = true;
    console.error('dist/auto/index.html missing auto wizard shell');
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
  try {
    assertEnvJsFileContents(envSource, 'dist/env.js');
  } catch (err) {
    failed = true;
    console.error(err.message);
  }
} else {
  failed = true;
  console.error('Missing build output: dist/env.js');
}

const adminPanelPath = path.join(root, 'dist/admin-panel.html');
if (fs.existsSync(adminPanelPath)) {
  const adminHtml = fs.readFileSync(adminPanelPath, 'utf8');
  const envIdx = adminHtml.indexOf('/env.js');
  const adminJsIdx = adminHtml.indexOf('/js/admin-panel.js');
  if (envIdx === -1 || adminJsIdx === -1 || envIdx > adminJsIdx) {
    failed = true;
    console.error('dist/admin-panel.html must load /env.js before admin-panel.js');
  }
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

  if (!html.includes('/js/runtime/route-bootstrap-head.js')) {
    failed = true;
    console.error('dist/index.html must load /js/runtime/route-bootstrap-head.js');
  }
}

const routeBootstrapPath = path.join(root, 'dist/js/runtime/route-bootstrap-head.js');
if (fs.existsSync(routeBootstrapPath)) {
  const bootstrapSource = fs.readFileSync(routeBootstrapPath, 'utf8');
  if (!bootstrapSource.includes('Generated by scripts/lib/route-bootstrap.cjs')) {
    failed = true;
    console.error('dist/js/runtime/route-bootstrap-head.js is not a valid bootstrap script');
  }
  if (bootstrapSource.trimStart().startsWith('<!DOCTYPE') || bootstrapSource.trimStart().startsWith('<html')) {
    failed = true;
    console.error('dist/js/runtime/route-bootstrap-head.js looks like HTML fallback, not JavaScript');
  }
}

const seoHubChecks = [
  ['dist/planlar/index.html', 'Planlar ve Fiyatlandırma | isteBul', 'https://www.istebul.com/planlar'],
  ['dist/blog/index.html', 'Blog | isteBul', 'https://www.istebul.com/blog'],
  ['dist/duyurular/index.html', 'Duyurular | isteBul', 'https://www.istebul.com/duyurular'],
  ['dist/kampanyalar/index.html', 'Kampanyalar | isteBul', 'https://www.istebul.com/kampanyalar']
];

seoHubChecks.forEach(([rel, title, canonical]) => {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) return;
  const html = fs.readFileSync(full, 'utf8');
  if (!html.includes(title)) {
    failed = true;
    console.error(`${rel} missing title: ${title}`);
  }
  if (!html.includes(canonical)) {
    failed = true;
    console.error(`${rel} missing canonical: ${canonical}`);
  }
  if (!html.includes('class="seo-page"')) {
    failed = true;
    console.error(`${rel} must be static seo-page shell`);
  }
});

const profilShellPath = path.join(root, 'dist/profil/index.html');
if (fs.existsSync(profilShellPath)) {
  const profilHtml = fs.readFileSync(profilShellPath, 'utf8');
  if (!profilHtml.includes('data-ib-route="profil"')) {
    failed = true;
    console.error('dist/profil/index.html missing data-ib-route="profil"');
  }
  if (!profilHtml.includes('Hesabım | isteBul')) {
    failed = true;
    console.error('dist/profil/index.html missing account route title');
  }
}

if (failed) process.exit(1);
console.log('Build output check passed.');
