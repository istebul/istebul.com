#!/usr/bin/env node
/**
 * Yerel deploy hazırlık kontrolü (secret'lar ve build çıktısı).
 * Kullanım: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/verify-deploy-setup.cjs
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
let failed = 0;

function ok(msg) {
  console.log('✓', msg);
}

function warn(msg) {
  console.warn('⚠', msg);
}

function fail(msg) {
  console.error('✗', msg);
  failed += 1;
}

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const cfEnv = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];

console.log('\nisteBul deploy hazırlık kontrolü\n');

requiredEnv.forEach((key) => {
  if (process.env[key]) ok(`${key} set`);
  else warn(`${key} missing (GitHub secret veya export gerekli)`);
});

const cfReady = cfEnv.every((key) => process.env[key]);
if (cfReady) {
  ok('Cloudflare deploy credentials present');
} else {
  warn('Cloudflare credentials missing — GitHub Actions Cloudflare adımı atlanır');
  cfEnv.filter((k) => !process.env[k]).forEach((k) => warn(`  → ${k}`));
}

const workflow = path.join(root, '.github/workflows/production-deploy.yml');
if (fs.existsSync(workflow)) ok('production-deploy.yml mevcut');
else fail('production-deploy.yml bulunamadı');

console.log('\nProduction build deneniyor...\n');
const build = spawnSync('npm', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env }
});

if (build.status !== 0) {
  fail('npm run build başarısız');
} else {
  ok('npm run build başarılı');
}

const manifestPath = path.join(root, 'dist/build-manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  ok(`build-manifest.json → builtAt ${manifest.builtAt}`);
  ok(`dist dosya sayısı: ${manifest.files?.length || '?'}`);
} else {
  fail('dist/build-manifest.json yok');
}

const seoSample = path.join(root, 'dist/rehber/arac-kredisi-hesaplama/index.html');
if (fs.existsSync(seoSample)) ok('SEO rehber sayfası dist içinde');
else warn('SEO rehber dist içinde yok (main merge / SEO branch kontrol)');

console.log('\n---');
if (failed) {
  console.error(`\n${failed} kritik hata. docs/CANLIYA_ALMA_REHBERI.md adımlarını uygulayın.\n`);
  process.exit(1);
}

console.log('\nYerel build hazır. GitHub secret\'lar + main push → canlı deploy.\n');
console.log('Manuel deploy: npm run deploy:cf\n');
