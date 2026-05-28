#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const checks = [];

function addCheck(name, status, detail = '') {
  checks.push({ name, status, detail });
}

function readSafe(file) {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    return '';
  }
}

const configSource = readSafe('js/platform/home-category-config.js');
const indexSource = readSafe('index.html');
const routeSource = readSafe('js/runtime/full-page-navigation.js');
const adminSource = readSafe('admin-panel.html');
let distSource = '';
try {
  const distJsDir = path.join(root, 'dist/js');
  const files = fs.readdirSync(distJsDir).filter((file) => file.endsWith('.js'));
  distSource = files.map((file) => readSafe(path.join('dist/js', file))).join('\n');
} catch {
  distSource = '';
}

const hasLive = ['araba', 'konut', 'tatil', 'finansman'].every((id) => configSource.includes(`id: '${id}'`) && configSource.includes("status: 'active'"));
addCheck('Kategori config canlı durumları', hasLive ? 'PASS' : 'FAIL');

const hasSoon = ['sigorta', 'kasko'].every((id) => configSource.includes(`id: '${id}'`) && configSource.includes("status: 'coming_soon'"));
addCheck('Kategori config yakında durumları', hasSoon ? 'PASS' : 'FAIL');

const hasRoutes = ['/araba', '/konut', '/tatil', '/finansman', '/sigorta', '/kasko'].every((route) => routeSource.includes(`'${route}'`));
addCheck('Route alias kapsamı', hasRoutes ? 'PASS' : 'WARN');

const hasNoStuckLoading = !indexSource.includes('Yükleniyor...');
addCheck('Ana sayfada sonsuz yükleniyor metni', hasNoStuckLoading ? 'PASS' : 'WARN');

const hasFooterTrust = indexSource.includes('isteBul karar destek platformudur; nihai karar kullanıcıya aittir.');
addCheck('Footer güven metni', hasFooterTrust ? 'PASS' : 'FAIL');

const hasAdminCategories = ['s-home_category_auto_enabled', 's-home_category_konut_enabled', 's-home_category_tatil_enabled', 's-home_category_finans_enabled', 's-home_category_sigorta_enabled', 's-home_category_kasko_enabled']
  .every((key) => adminSource.includes(key));
addCheck('Admin kategori görünürlük kontrolleri', hasAdminCategories ? 'PASS' : 'WARN');

const leakPatterns = [/sk_live_[a-zA-Z0-9]{16,}/, /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/];
const secretLeakDetected = leakPatterns.some((pattern) => pattern.test(distSource));
addCheck('Client bundle secret leakage', distSource ? (secretLeakDetected ? 'FAIL' : 'PASS') : 'WARN');

const summary = checks.reduce((acc, check) => {
  acc[check.status] = (acc[check.status] || 0) + 1;
  return acc;
}, {});

console.log('=== Release Final Audit ===');
checks.forEach((check) => {
  console.log(`${check.status}: ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
});
console.log(`Summary: PASS=${summary.PASS || 0} WARN=${summary.WARN || 0} FAIL=${summary.FAIL || 0}`);

if ((summary.FAIL || 0) > 0) {
  process.exitCode = 1;
}
