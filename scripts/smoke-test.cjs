const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const index = read('index.html');
assert(read('js/core/router.js').includes('/karar-asistani'), 'Decision assistant route is missing.');
assert(index.includes('/auto/'), 'Primary conversion path should link to Auto.');
assert(index.includes('Ücretsiz analiz başlat'), 'Hero primary CTA should emphasize free analysis start.');
assert(index.includes('Karar altyapısı'), 'Homepage should position decision infrastructure.');
const premiumPages = read('js/ui/premium-pages.js');
const uiSource = read('js/ui/ui.js');
assert(premiumPages.includes('decision-assistant-form'), 'Decision assistant form is missing.');
assert(premiumPages.includes('assistant-results'), 'Decision assistant results container is missing.');
assert(premiumPages.includes('Karar önizlemesi'), 'Assistant section should use decision preview title.');
assert(
  premiumPages.includes('ib-premium-step-list') || premiumPages.includes('ib-premium-steps'),
  'Premium how-it-works steps are missing.'
);
assert(
  premiumPages.includes('Nasıl çalışır') || premiumPages.includes('aria-label="Süreç"'),
  'Premium process section is missing.'
);
assert(index.includes('cookie-consent'), 'Cookie consent UI is missing.');
assert(
  index.includes('enterprise-card-readability.css'),
  'Homepage should load enterprise-card-readability.css for contrast.'
);
assert(index.includes('/kvkk.html'), 'KVKK policy link is missing.');
assert(index.includes('/sitemap.xml'), 'Sitemap link is missing.');
assert(!index.includes('https://plausible.io/js/plausible.js'), 'Analytics should not load before consent.');
assert(index.includes('decision-preview'), 'Professional hero preview is missing.');
assert(index.includes('listing-filter-form'), 'Listing filter form is missing.');
assert(index.includes('marketplace-results-toolbar'), 'Marketplace results toolbar is missing.');
assert(index.includes('listing-sort'), 'Listing sort control is missing.');
assert(index.includes('filter-province'), 'Province filter is missing.');
assert(index.includes('filter-district'), 'District filter is missing.');
assert(index.includes('data-filter-scope="arac"'), 'Category-specific listing filters are missing.');
assert(
  index.includes('theme-toggle') || uiSource.includes('theme-toggle'),
  'Theme toggle wiring is missing.'
);
assert(index.includes('comparison-content'), 'Comparison center markup is missing.');
assert(index.includes('karsilastir'), 'Comparison route link is missing.');
assert(uiSource.includes('comparison-count'), 'Comparison nav counter id is missing.');
assert(uiSource.includes('favorites-count'), 'Favorites nav counter id is missing.');
assert(read('js/core/storage-keys.js').includes('istebu_theme'), 'Theme storage key is missing.');
assert(index.includes('cro-sticky-cta'), 'Mobile sticky CTA is missing.');
assert(index.includes('ib-trust-rail'), 'Trust rail is missing.');

const pkg = JSON.parse(read('package.json'));
assert(pkg.scripts.build.includes('scripts/production-build.cjs'), 'Production build script should create optimized output.');
assert(pkg.scripts['build:check'].includes('check-build-output'), 'Build output check script is missing.');
const netlifyConfig = read('netlify.toml');
assert(netlifyConfig.includes('publish = "dist"'), 'Netlify should publish optimized dist output.');
assert(netlifyConfig.includes('from = "/*"'), 'Netlify SPA fallback route is missing.');
assert(netlifyConfig.includes('Content-Security-Policy'), 'Content Security Policy is missing.');
assert(netlifyConfig.includes('Strict-Transport-Security'), 'HSTS header is missing.');
assert(netlifyConfig.includes('Cache-Control = "public, max-age=31536000, immutable"'), 'Long-lived asset cache header is missing.');
assert(!index.includes('browser.sentry-cdn.com/7.100.0/bundle.min.js'), 'Sentry should not load before consent.');
assert(!index.includes('cdn.lr-in-prod.com/LogRocket.min.js'), 'LogRocket should not load before consent.');
assert(fs.existsSync(path.join(root, 'Dockerfile')), 'Dockerfile is missing.');
assert(fs.existsSync(path.join(root, 'docker-compose.yml')), 'docker-compose.yml is missing.');
assert(fs.existsSync(path.join(root, 'netlify/functions/health.js')), 'Health endpoint is missing.');
const robotsTxt = read('robots.txt');
assert(robotsTxt.includes('Sitemap:') && robotsTxt.includes('sitemap.xml'), 'robots.txt sitemap declaration is missing.');
const sitemapXml = read('sitemap.xml');
assert(sitemapXml.includes('www.istebul.com/auto/') || sitemapXml.includes('karar-asistani'), 'sitemap.xml should include Auto or decision assistant URL.');
assert(read('docs/openapi.yaml').includes('/ai-proxy'), 'OpenAPI spec should document AI proxy.');
assert(read('docs/quality-security-checklist.md').includes('OWASP'), 'Security checklist is missing OWASP coverage.');
assert(fs.existsSync(path.join(root, 'docs/architecture.md')), 'Architecture guide is missing.');
assert(fs.existsSync(path.join(root, 'docs/contributing.md')), 'Contributing guide is missing.');
assert(fs.existsSync(path.join(root, 'docs/troubleshooting.md')), 'Troubleshooting guide is missing.');

const router = read('js/core/router.js');
assert(router.includes("{ path: '/karar-asistani', component: 'page-karar-analizi' }"), 'Decision assistant route is not registered.');
assert(router.includes("{ path: '/gecmis', component: 'history' }"), 'History route is not registered.');
assert(router.includes("{ path: '/karsilastir', component: 'compare' }"), 'Comparison route is not registered.');
assert(router.includes('decodeURIComponent'), 'Dynamic route params should be decoded.');
assert(router.includes("activePath.startsWith('/ilan/')"), 'Listing detail route should keep listings nav active.');

const auth = read('js/features/auth/auth.js');
assert(auth.includes("from '../../core/supabase.js'"), 'Auth supabase import path is incorrect.');
assert(auth.includes('getForgotPasswordForm'), 'Forgot password form renderer is missing.');
assert(!auth.includes('prompt(') && !auth.includes('alert('), 'Auth flow should not use blocking browser prompt/alert.');
const css = read('css/style.css');
assert(css.includes(':root[data-theme="dark"]'), 'Dark mode styles are missing.');
assert(css.includes('Assistant result layout guard'), 'Assistant result layout guard is missing.');
assert(css.includes('Assistant decision summary polish'), 'Assistant decision summary polish is missing.');
assert(css.includes('Premium header refinement'), 'Premium header refinement is missing.');
assert(css.includes('Marketplace result controls'), 'Marketplace result controls CSS is missing.');
assert(css.includes('Authenticated history gate'), 'Authenticated history gate CSS is missing.');
assert(css.includes('Hero decision preview controls'), 'Hero decision preview controls CSS is missing.');
assert(css.includes('Durable notifications'), 'Durable notification styles are missing.');
assert(css.includes('Marketplace empty state polish'), 'Marketplace empty state polish CSS is missing.');
assert(css.includes('--header-max: 1640px'), 'Header max width should prevent desktop nav crowding.');
assert(css.includes('.assistant-recommendation.featured > *'), 'Featured recommendation children should use a single safe grid flow.');
const indexHtml = read('index.html');
const security = read('js/core/security.js');
const appSource = read('js/app.js');
assert(indexHtml.includes('data-preview-title'), 'Hero preview dynamic title target is missing.');
assert(indexHtml.includes('preview-category-label') || indexHtml.includes('data-preview-category'), 'Hero preview category marker is missing.');
assert(appSource.includes('data-preview-sources'), 'Hero preview source links renderer is missing.');
assert(indexHtml.includes('data-my-listings'), 'User menu should expose a real my-listings action.');
assert(security.includes('export const escapeHtml'), 'Shared security escape helper is missing.');
assert(security.includes('export const safeUrl'), 'Shared safe URL helper is missing.');
assert(appSource.includes('loadAnalytics()'), 'Consent-gated analytics loader is missing.');
assert(appSource.includes('monitoring.init(true)'), 'Consent-gated monitoring loader is missing.');
assert(
  appSource.includes('STORAGE_KEYS.COOKIE_CONSENT') || appSource.includes('istebul_cookie_consent'),
  'Cookie consent preference key is missing.'
);
const monitoringSource = read('js/core/monitoring.js');
assert(monitoringSource.includes('init(') && appSource.includes('monitoring.init'), 'Monitoring init wiring is missing.');
assert(fs.existsSync(path.join(root, 'js/core/error-boundary.js')), 'Error boundary module is missing.');
const aiProxy = read('functions/ai-proxy.js');
assert(aiProxy.includes('checkRateLimit'), 'AI proxy rate limiting is missing.');
const ui = read('js/ui/ui.js');
assert(ui.includes("from '../core/security.js'"), 'UI should use shared security helpers.');
assert(ui.includes('setupTheme()'), 'Theme setup is missing.');
assert(
  ui.includes('const navCompactBreakpoint = 1280;') || ui.includes('navCompactBreakpoint = 1280'),
  'Responsive nav breakpoint should protect tablet headers.'
);
assert(ui.includes('applyTheme(theme)'), 'Theme apply method is missing.');
assert(ui.includes('renderComparison'), 'Comparison renderer is missing.');
assert(ui.includes('updateCollectionBadges'), 'Collection badge updater is missing.');
assert(ui.includes('renderListings'), 'Listing renderer is missing.');
assert(appSource.includes('initEnterpriseUx'), 'Enterprise UX polish init is missing.');
assert(read('js/runtime/enterprise-ux.js').includes('initP4ProductPolish'), 'P4 polish wiring is missing.');
assert(read('css/style.css').includes('p4-premium-product.css'), 'P4 premium stylesheet import is missing.');

(async () => {
  global.window = {
    __env: {},
    location: { origin: 'http://127.0.0.1:3001', pathname: '/', search: '', hash: '' },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {} }),
    requestAnimationFrame: (cb) => setTimeout(cb, 0),
    setTimeout,
    clearTimeout,
    supabase: {
      createClient: () => ({
        auth: {},
        from: () => ({})
      })
    }
  };
  const escapeHtmlForMock = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  global.document = {
    documentElement: {
      lang: 'tr',
      dir: 'ltr',
      dataset: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      setAttribute: () => {},
      getAttribute: () => null
    },
    body: { classList: { add: () => {}, remove: () => {}, toggle: () => {} } },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({
      innerHTML: '',
      set textContent(value) {
        this.innerHTML = escapeHtmlForMock(value);
      },
      get textContent() {
        return this.innerHTML;
      },
      append: () => {}
    })
  };
  const storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key)
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: { serviceWorker: undefined },
    configurable: true
  });

  const { default: App } = await import(path.join(root, 'js/app.js'));
  const app = Object.create(App.prototype);
  app.catalog = app.createDecisionCatalog();
  app.marketData = app.createMarketData();
  app.decisionAssistant = app.createDecisionAssistantConfig();
  app.assistantCategory = 'arac';
  app.currentUser = { id: 'seller-1', email: 'seller@example.com', profile: { full_name: 'Satıcı Test' } };
  app.localListings = [];
  const localListing = app.createLocalListing({
    title: 'Yerel Toyota Hibrit Test İlanı',
    description: 'Canlı servis olmasa bile platform içinde saklanan test ilanı.',
    price: 1234000,
    currency: 'TRY',
    category: 'arac',
    location: 'İstanbul/Kadıköy',
    province: 'İstanbul',
    district: 'Kadıköy',
    vehicleBrand: 'Toyota',
    images: [],
    external_url: null
  });
  assert(localListing.id.startsWith('local-'), 'Local listing should receive a local id.');
  assert.strictEqual(app.getLocalListings({ category: 'arac', province: 'İstanbul' }).length, 1, 'Local listing should be filterable.');
  assert.strictEqual(app.getListingFallbackById(localListing.id).title, localListing.title, 'Local listing detail fallback failed.');
  assert.strictEqual(app.mergeListings([localListing], [localListing]).length, 1, 'Listing merge should de-duplicate ids.');

  app.assistantAnswers = {
    province: 'İstanbul',
    district: 'Kadıköy',
    carModel: 'Toyota|Corolla',
    usage: 'city',
    budget: '1850000',
    fuel: 'hybrid',
    body: 'sedan',
    priority: 'lowCost'
  };

  const originalCreateElement = global.document.createElement;
  const originalQuerySelector = global.document.querySelector;
  const createClassList = () => ({
    values: new Set(),
    add(value) { this.values.add(value); },
    remove(value) { this.values.delete(value); },
    toggle(value, enabled) { enabled ? this.add(value) : this.remove(value); },
    contains(value) { return this.values.has(value); }
  });
  const makeTextNode = () => ({ textContent: '', setAttribute: () => {}, style: {}, dataset: {}, classList: createClassList() });
  const previewTitle = makeTextNode();
  const previewNote = makeTextNode();
  const previewScore = makeTextNode();
  const previewTabs = ['arac', 'ev', 'tatil'].map((category) => ({
    dataset: { previewCategory: category },
    attributes: {},
    classList: createClassList(),
    setAttribute(name, value) { this.attributes[name] = value; }
  }));
  const previewMetrics = [0, 1, 2].map(() => ({
    label: makeTextNode(),
    value: makeTextNode(),
    querySelector(selector) { return selector === 'span' ? this.label : this.value; }
  }));
  const previewBars = [0, 1, 2].map(() => ({
    label: makeTextNode(),
    bar: { style: {}, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } },
    querySelector(selector) { return selector === 'span' ? this.label : this.bar; }
  }));
  const sourceStrip = { children: [], replaceChildren(...items) { this.children = items; } };
  const previewElement = {
    dataset: {},
    offsetWidth: 0,
    classList: createClassList(),
    querySelector(selector) {
      return {
        '[data-preview-title]': previewTitle,
        '[data-preview-note]': previewNote,
        '[data-preview-score]': previewScore,
        '[data-preview-sources]': sourceStrip
      }[selector] || null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-preview-category]') return previewTabs;
      if (selector === '[data-preview-metric]') return previewMetrics;
      if (selector === '[data-preview-bar-row]') return previewBars;
      return [];
    }
  };
  global.document.querySelector = (selector) => selector === '.decision-preview' ? previewElement : null;
  global.document.createElement = (tagName) => ({
    tagName,
    dataset: {},
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    textContent: '',
    href: '',
    target: '',
    rel: ''
  });
  app.renderHeroDecisionPreview('ev');
  assert.strictEqual(
    previewTitle.textContent,
    'Lokasyon ve Kredi Dengeli 2+1 Daire',
    'Hero preview did not switch to home data.'
  );
  assert.strictEqual(previewMetrics[0].value.textContent, '69.400 ₺', 'Hero preview metric did not update.');
  assert.strictEqual(previewBars[0].bar.style.width, '46%', 'Hero preview bar did not update.');
  assert.strictEqual(sourceStrip.children.length, 3, 'Hero preview sources were not rendered.');
  assert.strictEqual(previewTabs[1].attributes['aria-selected'], 'true', 'Hero preview active tab was not updated.');
  global.document.createElement = originalCreateElement;
  global.document.querySelector = originalQuerySelector;

  const carResult = app.buildDecisionResult(app.getResolvedDecisionAssistantConfig().arac, app.assistantAnswers);
  app.lastDecisionResult = carResult;
  const carListingOptions = app.getListingOptionsFromDecisionResult(carResult);
  assert.strictEqual(carListingOptions.category, 'arac', 'Decision category should transfer to listing filters.');
  assert.strictEqual(carListingOptions.province, 'İstanbul', 'Decision province should transfer to listing filters.');
  assert.strictEqual(carListingOptions.district, 'Kadıköy', 'Decision district should transfer to listing filters.');
  assert.strictEqual(carListingOptions.vehicleBrand, 'Toyota', 'Decision vehicle brand should transfer to listing filters.');
  assert.strictEqual(carListingOptions.maxPrice, 1850000, 'Decision budget should become listing max price.');

  assert(carResult.recommendations[0].name.includes('Toyota Corolla'), 'Catalog vehicle recommendation failed.');
  assert(carResult.recommendations[0].name.includes('İstanbul/Kadıköy'), 'Location-scoped vehicle result failed.');
  assert(carResult.recommendations[0].details.some((detail) => detail.label === 'Marka' && detail.value === 'Toyota'), 'Vehicle recommendation details are missing brand.');
  assert(carResult.recommendations[0].calculationTable.title.includes('Araç'), 'Vehicle calculation table is missing.');
  assert(carResult.recommendations[0].costChart.length >= 4, 'Vehicle cost chart was not generated.');
  assert(carResult.recommendations[0].realisticComment.includes('ekspertiz'), 'Vehicle realistic comment is missing.');
  assert(
    carResult.dataHealth.confidenceScore >= 65,
    'Decision data confidence was not generated (simulation mode caps ~68).'
  );
  assert(carResult.dataHealth.readySourceCount >= 2, 'Decision source readiness is missing.');
  assert(carResult.recommendations[0].sourceTrace.sources.length >= 2, 'Recommendation source trace is missing.');
  assert.strictEqual(carResult.recommendations[0].financeComparisons.length, 3);
  assert.strictEqual(app.getFinanceProducts('arac').length, 3, 'Finance products were not loaded.');
  assert(app.marketData.sourceRegistry.length >= 8, 'Market data source registry is incomplete.');
  assert(app.marketData.integrations.providerMode === 'manual-ready', 'Market data integration mode is wrong.');
  assert(app.marketData.costProfiles.arac.hybridFuelCost === 52000, 'Vehicle cost profile was not loaded.');
  app.marketData.costProfiles.arac.hybridFuelCost = 12345;
  const tunedVehicleOptions = app.getVehicleDecisionOptions(app.assistantAnswers);
  assert(tunedVehicleOptions[0].costs.some((cost) => cost.label === 'Yıllık yakıt/enerji' && cost.value === 12345), 'Vehicle cost profile is not used by decision engine.');
  app.marketData.financeProducts.arac[0].rate = 1.23;
  assert.strictEqual(app.getFinanceProducts('arac')[0].rate, 1.23, 'Editable finance products are not used.');
  const NativeFormData = global.FormData;
  global.FormData = class MockFormData {
    constructor() {
      this.items = [
        ['finance:arac:0:rate', '2.11'],
        ['finance:arac:0:term', '48'],
        ['finance:arac:0:ratio', '0.66'],
        ['cost:arac:hybridFuelCost', '22222'],
        ['source:0:status', 'pending']
      ];
    }

    forEach(callback) {
      this.items.forEach(([key, value]) => callback(value, key));
    }
  };
  app.ui = { showSuccess: () => {}, renderDecisionHistory: () => {} };
  app.renderAdminDashboard = () => {};
  app.renderDecisionAssistant = () => {};
  app.handleAdminMarketSubmit({});
  const savedMarketData = app.marketData;
  assert.ok(savedMarketData?.financeProducts?.arac?.length, 'Admin finance products missing after save.');
  assert.strictEqual(savedMarketData.financeProducts.arac[0].rate, 2.11, 'Admin finance form did not save.');
  assert.strictEqual(savedMarketData.costProfiles.arac.hybridFuelCost, 22222, 'Admin cost form did not save.');
  const pendingSource = savedMarketData.sourceRegistry.find((s) => s.status === 'pending');
  assert.ok(pendingSource, 'Admin source form did not save pending status.');
  global.FormData = NativeFormData;
  assert(app.catalog.provinces.length === 81, 'Turkey province catalog is incomplete.');
  assert(app.catalog.carModels.length > 100, 'Vehicle brand/model catalog is too small.');
  assert(app.decisionAssistant.arac.questions.find((question) => question.id === 'budget').type === 'number', 'Vehicle budget should accept a custom amount.');
  assert(app.decisionAssistant.ev.questions.find((question) => question.id === 'budget').type === 'number', 'Home budget should accept a custom amount.');
  assert(app.decisionAssistant.tatil.questions.find((question) => question.id === 'budget').type === 'number', 'Vacation budget should accept a custom amount.');
  assert(carResult.insight.reasons.length >= 3, 'Decision insight was not generated.');
  assert(carResult.answers.some((answer) => answer.id === 'budget' && answer.value.includes('1.850.000')), 'Custom budget amount was not formatted.');
  const optionalAnswers = {
    province: 'İstanbul',
    district: '',
    carModel: '',
    usage: 'city',
    budget: '1800000',
    fuel: 'hybrid',
    body: 'sedan',
    priority: 'lowCost'
  };
  app.assistantAnswers = optionalAnswers;
  const optionalCarResult = app.buildDecisionResult(app.getResolvedDecisionAssistantConfig().arac, optionalAnswers);
  assert(optionalCarResult.recommendations[0].name.includes('İstanbul geneli'), 'Optional district should scope to the whole province.');
  assert(optionalCarResult.answers.some((answer) => answer.id === 'district' && answer.value === 'Tüm ilçeler'), 'Optional district summary is wrong.');
  assert(optionalCarResult.answers.some((answer) => answer.id === 'carModel' && answer.value.includes('marka/modeli')), 'Optional car model summary is wrong.');

  app.assistantCategory = 'ev';
  app.assistantAnswers = {
    province: 'İzmir',
    district: '',
    propertyType: 'daire',
    purpose: 'investment',
    budget: '5000000',
    location: 'central',
    priority: 'valueGrowth'
  };
  const homeResult = app.buildDecisionResult(app.getResolvedDecisionAssistantConfig().ev, app.assistantAnswers);
  assert(homeResult.recommendations[0].calculationTable.title.includes('Konut'), 'Home calculation table is missing.');
  assert(homeResult.recommendations[0].details.some((detail) => detail.label === 'Emlak tipi'), 'Home details are missing property type.');

  app.assistantCategory = 'tatil';
  app.assistantAnswers = {
    province: 'Antalya',
    district: '',
    vacationPlace: 'any',
    vacationType: 'familyResort',
    destination: 'mediterranean',
    travelers: 'family',
    budget: '120000',
    priority: 'allInclusive'
  };
  const vacationResult = app.buildDecisionResult(app.getResolvedDecisionAssistantConfig().tatil, app.assistantAnswers);
  assert(vacationResult.recommendations[0].calculationTable.title.includes('Tatil'), 'Vacation calculation table is missing.');
  assert(vacationResult.recommendations[0].costChart.length >= 4, 'Vacation cost chart was not generated.');

  const { UIManager } = await import(path.join(root, 'js/ui/ui.js'));
  const { installAssistantUI } = await import(path.join(root, 'js/ui/assistant-ui.js'));
  installAssistantUI(UIManager);
  const uiManager = new UIManager();
  const resultContainer = { innerHTML: '', scrollIntoView: () => {} };
  global.document.getElementById = (id) => id === 'assistant-results' ? resultContainer : null;
  [carResult, homeResult, vacationResult].forEach((result) => {
    resultContainer.innerHTML = '';
    uiManager.renderDecisionResults(result);
    assert(resultContainer.innerHTML.includes('assistant-choice-summary'), 'Decision result UI should render choice summary.');
    assert(resultContainer.innerHTML.includes('assistant-recommendation-verdict'), 'Decision result UI should render recommendation verdicts.');
    assert(!resultContainer.innerHTML.includes('undefined'), 'Decision result UI should not leak undefined text.');
  });

  app.comparisonItems = [];
  app.categories = [
    { id: 'arac', name: 'Araç' },
    { id: 'ev', name: 'Ev' },
    { id: 'tatil', name: 'Tatil' }
  ];
  app.ui = { renderComparison: () => {}, showSuccess: () => {}, showError: () => {} };
  const recommendationComparison = app.createComparisonItemFromRecommendation(carResult.recommendations[0], carResult);
  assert(recommendationComparison.title.includes('Toyota Corolla'), 'Recommendation comparison item is wrong.');
  app.addComparisonItem(recommendationComparison);
  assert.strictEqual(app.comparisonItems.length, 1, 'Recommendation was not added to comparison.');
  const listingComparison = app.createComparisonItemFromListing(app.getDemoListings({ category: 'arac' })[0]);
  assert(listingComparison.calculationRows.length >= 4, 'Listing comparison calculation rows are missing.');
  assert(listingComparison.comment.includes('ekspertiz'), 'Listing comparison realistic comment is missing.');
  assert(listingComparison.monthlyPayment > 0, 'Listing detail profile should include monthly payment.');

  let historyGateRendered = false;
  app.currentUser = null;
  app.ui = {
    renderHistoryAuthGate: () => { historyGateRendered = true; },
    renderDecisionHistory: () => { throw new Error('Anonymous users should not see decision history records.'); }
  };
  global.localStorage.setItem('istebul_decision_history', JSON.stringify([{ id: 'legacy-anonymous' }]));
  app.loadDecisionHistory();
  assert(historyGateRendered, 'Anonymous history auth gate was not rendered.');
  assert.deepStrictEqual(app.decisionHistory, [], 'Anonymous decision history should not be loaded.');
  assert.strictEqual(app.saveDecisionHistory(carResult), false, 'Anonymous decision history should not be saved.');

  app.currentUser = { id: 'user-1', name: 'Test User' };
  app.ui = { renderDecisionHistory: () => {} };
  const decisionHistoryKey = app.getUserHistoryStorageKey('istebul_decision_history');
  global.localStorage.setItem(decisionHistoryKey, '{broken-json');
  const originalConsoleWarn = console.warn;
  console.warn = () => {};
  app.loadDecisionHistory();
  assert.deepStrictEqual(app.decisionHistory, [], 'Corrupt decision history should be ignored safely.');
  const searchHistoryKey = app.getUserHistoryStorageKey('istebul_search_history');
  global.localStorage.setItem(searchHistoryKey, '{broken-json');
  global.document.getElementById = () => null;
  app.loadComparisonHistory();
  assert.deepStrictEqual(app.readStoredArray(searchHistoryKey), [], 'Corrupt search history should be ignored safely.');
  console.warn = originalConsoleWarn;
  app.saveSearchHistory = () => {};
  const historySaved = app.saveDecisionHistory(carResult);
  assert.strictEqual(historySaved, true, 'Authenticated decision history should be saved.');
  assert.strictEqual(app.decisionHistory.length, 1, 'Decision history was not saved.');
  assert(app.decisionHistory[0].topPick.name.includes('Toyota Corolla'));
  assert(app.decisionHistory[0].dataHealth.confidenceScore >= 65, 'Decision history did not save data health.');
  const persisted = app.readStoredArray(decisionHistoryKey);
  assert.strictEqual(persisted.length, 1, 'Decision history should persist to storage.');
  assert(app.getDemoListings({ category: 'ev' }).length >= 2, 'Demo home listings are missing.');
  assert(app.getDemoListings({ category: 'tatil', search: 'Karadeniz' }).length === 1, 'Demo vacation search fallback failed.');
  assert(app.getDemoListings({ category: 'arac', maxPrice: 1400000 }).length === 1, 'Demo max price filter failed.');
  assert(app.getDemoListings({ category: 'arac', province: 'İstanbul', district: 'Kadıköy', vehicleBrand: 'Toyota' }).length === 1, 'Demo province/district/brand filter failed.');
  assert(app.getDemoListings({ category: 'ev', province: 'Muğla', propertyType: 'villa' }).length === 1, 'Demo property type filter failed.');
  assert(app.getDemoListings({ category: 'tatil', province: 'Antalya', vacationType: 'familyResort' }).length === 1, 'Demo vacation type filter failed.');
  const sortedLowToHigh = app.sortListings(app.getDemoListings(), 'priceAsc');
  assert(sortedLowToHigh[0].price <= sortedLowToHigh[sortedLowToHigh.length - 1].price, 'Price ascending listing sort failed.');
  const sortedHighToLow = app.sortListings(app.getDemoListings(), 'priceDesc');
  assert(sortedHighToLow[0].price >= sortedHighToLow[sortedHighToLow.length - 1].price, 'Price descending listing sort failed.');

  console.log('Smoke tests passed.');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
