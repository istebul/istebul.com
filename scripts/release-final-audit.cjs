#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const checks = [];

const HOME_CATEGORY_ORDER = ['araba', 'tatil', 'konut', 'finansman', 'sigorta', 'kasko'];

const EXPECTED_HOME_CATEGORY_HREFS = Object.freeze({
  araba: '/auto/',
  tatil: '/tatil/',
  konut: '/konut/',
  finansman: '/finans/',
  sigorta: '/sigorta/',
  kasko: '/kasko/'
});

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

function isRegistryHomeKeyLive(registrySource, homeKey) {
  const pattern = new RegExp(`homeKey:\\s*'${homeKey}'[\\s\\S]{0,500}?status:\\s*'live'`);
  return pattern.test(registrySource);
}

function extractHomeCategoryGridSection(html) {
  const marker = 'id="home-category-grid"';
  const start = html.indexOf(marker);
  if (start === -1) return '';
  const end = html.indexOf('</section>', start);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

function extractActiveCategoryCards(sectionHtml) {
  return [...sectionHtml.matchAll(/<a\b[^>]*data-category-id="([^"]+)"[^>]*>/g)].map((match) => {
    const href = match[0].match(/href="([^"]+)"/)?.[1] || '';
    return { id: match[1], href };
  });
}

const configSource = readSafe('js/platform/home-category-config.js');
const registrySource = readSafe('js/platform/category-registry.js');
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

const liveRegistryKeys = HOME_CATEGORY_ORDER.filter((homeKey) =>
  isRegistryHomeKeyLive(registrySource, homeKey)
);
const hasLiveCategories =
  liveRegistryKeys.length === HOME_CATEGORY_ORDER.length &&
  configSource.includes("from './category-registry.js'") &&
  configSource.includes('listVerticals()') &&
  configSource.includes("live: 'active'");
addCheck(
  'Kategori config canlı durumları',
  hasLiveCategories ? 'PASS' : 'FAIL',
  hasLiveCategories ? '' : `live registry keys: ${liveRegistryKeys.join(', ') || 'none'}`
);

const sigortaLive = isRegistryHomeKeyLive(registrySource, 'sigorta');
addCheck('Sigorta kategorisi canlı', sigortaLive ? 'PASS' : 'FAIL');

const kaskoLive = isRegistryHomeKeyLive(registrySource, 'kasko');
addCheck('Kasko kategorisi canlı', kaskoLive ? 'PASS' : 'FAIL');

const distIndexPath = path.join(root, 'dist/index.html');
if (!fs.existsSync(distIndexPath)) {
  addCheck('dist home-category prerender', 'FAIL', 'dist/index.html missing — run npm run build');
} else {
  const distIndexSource = fs.readFileSync(distIndexPath, 'utf8');
  const distFailures = [];
  const gridSection = extractHomeCategoryGridSection(distIndexSource);

  if (!gridSection) {
    distFailures.push('missing #home-category-grid');
  } else if (!gridSection.includes('ib-cat-mockup-shell')) {
    distFailures.push('#home-category-grid is empty or missing .ib-cat-mockup-shell');
  }

  if (!distIndexSource.includes('data-home-category-prerender="1"')) {
    distFailures.push('missing data-home-category-prerender="1"');
  }

  const activeCards = extractActiveCategoryCards(gridSection);
  const cardIds = activeCards.map((card) => card.id);

  if (activeCards.length !== HOME_CATEGORY_ORDER.length) {
    distFailures.push(`expected ${HOME_CATEGORY_ORDER.length} active cards, found ${activeCards.length}`);
  }

  if (cardIds.join(',') !== HOME_CATEGORY_ORDER.join(',')) {
    distFailures.push(`card order mismatch: ${cardIds.join(', ') || 'none'}`);
  }

  for (const card of activeCards) {
    const expectedHref = EXPECTED_HOME_CATEGORY_HREFS[card.id];
    if (expectedHref && card.href !== expectedHref) {
      distFailures.push(`${card.id} href=${card.href || 'missing'}, expected ${expectedHref}`);
    }
  }

  const h1Count = (distIndexSource.match(/<h1\b/gi) || []).length;
  if (h1Count !== 1) {
    distFailures.push(`expected 1 h1, found ${h1Count}`);
  }

  addCheck(
    'dist home-category prerender',
    distFailures.length ? 'FAIL' : 'PASS',
    distFailures.join('; ')
  );
}

const hasRoutes = ['/araba', '/konut', '/tatil', '/finansman', '/sigorta', '/kasko'].every((route) =>
  routeSource.includes(`'${route}'`)
);
addCheck('Route alias kapsamı', hasRoutes ? 'PASS' : 'WARN');

const hasRehberBypass = routeSource.includes("'/rehber'") && routeSource.includes('REHBER_PREFIX');
addCheck('Rehber sayfaları SPA bypass', hasRehberBypass ? 'PASS' : 'FAIL');

const hasNoStuckLoading = !indexSource.includes('Yükleniyor...');
addCheck('Ana sayfada sonsuz yükleniyor metni', hasNoStuckLoading ? 'PASS' : 'WARN');

const hasFooterTrust = indexSource.includes('isteBul karar destek platformudur; nihai karar kullanıcıya aittir.');
addCheck('Footer güven metni', hasFooterTrust ? 'PASS' : 'FAIL');

const hasAdminCategories = [
  's-home_category_auto_enabled',
  's-home_category_konut_enabled',
  's-home_category_tatil_enabled',
  's-home_category_finans_enabled',
  's-home_category_sigorta_enabled',
  's-home_category_kasko_enabled'
].every((key) => adminSource.includes(key));
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
