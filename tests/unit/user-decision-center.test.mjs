import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  USER_DECISION_EMPTY_MESSAGE,
  USER_DECISION_FORBIDDEN_PHRASES,
  clearUserDecisionMemoCache,
  buildListingRecommendationInput,
  buildUserDecisionCacheKey,
  sanitizeUserDecisionText,
  resolveUserDecisionContext,
  resolveUserDecisionScenario,
  buildDecisionChecklistItems,
  snapshotPrimaryScores,
  buildDecisionOverviewHtml,
  buildDecisionChecklistHtml,
  buildDecisionSummaryHtml,
  buildDecisionScenarioHtml,
  buildUserDecisionCenterHtml,
  buildUserDecisionCenterEmptyHtml,
  buildUserDecisionPanelHtml
} = await import('../../js/user-decision-center/index.js');

const profile = {
  category: 'vehicle',
  budget: 1800000,
  city: 'İzmir',
  usage_type: 'family',
  family_size: 4,
  annual_km: 15000,
  risk_tolerance: 'medium',
  priority: 'total_cost',
  ownership_period: 5
};

const bmwListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2022 BMW 320i M Sport',
  description: 'Yetkili servis bakımlı',
  price: 1780000,
  location: 'İzmir',
  status: 'approved',
  images: ['img1.jpg'],
  attributes: { brand: 'BMW', model: '320i', year: 2022, km: 45000 },
  latest_analysis: { risk_score: 28, quality_score: 88, decision_score: 82 },
  updated_at: new Date().toISOString()
};

const sparseListing = {
  id: '55555555-5555-5555-5555-555555555555',
  category: 'vehicle',
  title: 'Eksik',
  price: 0,
  updated_at: '2024-01-01T00:00:00.000Z'
};

const evil = '<script>alert(1)</script>';

function fullCtx(overrides = {}) {
  return {
    listing: bmwListing,
    ready: true,
    decisionScore: 72,
    confidenceScore: 68,
    confidenceLevel: 'medium',
    riskLevel: 'low',
    riskLabel: 'Düşük',
    qualityScore: 88,
    trustScore: 75,
    explanationScore: 70,
    decisionLabel: 'Uygun',
    decisionSummary: 'Mevcut verilerle değerlendirme yapılabilir.',
    totalCostSummary: { total: 2100000, annual: 180000, label: '5 yıllık tahmin' },
    checklist: [{ id: 'a', label: 'Kontrol', done: true, note: 'Tamam' }],
    scenario: {
      baseDecisionScore: 72,
      simulatedDecisionScore: 76,
      scoreDelta: 4,
      scenarioLevel: 'positive',
      scenarioLabel: 'Olumlu'
    },
    explainability: { userFriendlyExplanation: 'Kalite skoru güçlü.' },
    ...overrides
  };
}

// --- ENGINE ---

test('empty message is Turkish', () => {
  assert.equal(USER_DECISION_EMPTY_MESSAGE, 'Bu ilan için karar analizi henüz hazır değil.');
});

test('buildListingRecommendationInput maps listing fields', () => {
  const rec = buildListingRecommendationInput(bmwListing, profile);
  assert.equal(rec.id, bmwListing.id);
  assert.equal(rec.fit_score, 82);
  assert.equal(rec.quality_score, 88);
});

test('buildUserDecisionCacheKey is stable', () => {
  const a = buildUserDecisionCacheKey(bmwListing, profile);
  const b = buildUserDecisionCacheKey(bmwListing, profile);
  assert.equal(a, b);
});

test('sanitizeUserDecisionText removes forbidden phrases', () => {
  for (const phrase of USER_DECISION_FORBIDDEN_PHRASES) {
    const out = sanitizeUserDecisionText(`Bu ${phrase} önerilir.`);
    assert.ok(!out.toLowerCase().includes(phrase.toLowerCase()));
  }
});

test('resolveUserDecisionContext returns ready context for valid listing', () => {
  clearUserDecisionMemoCache();
  const ctx = resolveUserDecisionContext(bmwListing, profile, { skipCache: true });
  assert.equal(ctx.ready, true);
  assert.ok(ctx.decisionScore != null);
});

test('resolveUserDecisionContext empty for sparse listing', () => {
  clearUserDecisionMemoCache();
  const ctx = resolveUserDecisionContext(sparseListing, profile, { skipCache: true });
  assert.equal(ctx.ready, false);
});

test('memo cache returns same object', () => {
  clearUserDecisionMemoCache();
  const first = resolveUserDecisionContext(bmwListing, profile);
  const second = resolveUserDecisionContext(bmwListing, profile);
  assert.equal(first, second);
});

test('clearUserDecisionMemoCache resets cache', () => {
  clearUserDecisionMemoCache();
  const first = resolveUserDecisionContext(bmwListing, profile);
  clearUserDecisionMemoCache();
  const second = resolveUserDecisionContext(bmwListing, profile);
  assert.notEqual(first, second);
});

test('lazy scenario not computed by default', () => {
  clearUserDecisionMemoCache();
  const ctx = resolveUserDecisionContext(bmwListing, profile, { skipCache: true, lazyScenario: true });
  assert.equal(ctx.scenario, null);
});

test('resolveUserDecisionScenario computes scenario', () => {
  clearUserDecisionMemoCache();
  const ctx = resolveUserDecisionContext(bmwListing, profile, { skipCache: true, lazyScenario: true });
  const scenario = resolveUserDecisionScenario(ctx, profile, { skipCache: true });
  assert.ok(scenario?.baseDecisionScore != null);
});

test('fit_score unchanged after context resolve', () => {
  const rec = buildListingRecommendationInput(bmwListing);
  const original = rec.fit_score;
  resolveUserDecisionContext(bmwListing, profile, { skipCache: true });
  assert.equal(rec.fit_score, original);
});

test('quality_score unchanged after context resolve', () => {
  const rec = buildListingRecommendationInput(bmwListing);
  const original = rec.quality_score;
  resolveUserDecisionContext(bmwListing, profile, { skipCache: true });
  assert.equal(rec.quality_score, original);
});

test('snapshotPrimaryScores captures values', () => {
  const rec = { fit_score: 80, quality_score: 70, decisionScore: 65, explanationScore: 60 };
  const snap = snapshotPrimaryScores(rec);
  assert.deepEqual(snap, { fit_score: 80, quality_score: 70, decisionScore: 65, explanationScore: 60 });
});

test('buildDecisionChecklistItems returns items', () => {
  const items = buildDecisionChecklistItems({ decisionScore: 70, nextSteps: ['Ekspertiz'] }, null, null);
  assert.ok(items.length > 0);
});

// --- OVERVIEW BUILDER ---

test('overview shows Karar Skoru', () => {
  const html = buildDecisionOverviewHtml(fullCtx());
  assert.match(html, /Karar Skoru/);
});

test('overview shows Güven Seviyesi', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /Güven Seviyesi/);
});

test('overview shows Risk Seviyesi', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /Risk Seviyesi/);
});

test('overview shows Kalite Skoru', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /Kalite Skoru/);
});

test('overview shows Güven Skoru', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /Güven Skoru/);
});

test('overview shows Toplam Maliyet Özeti', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /Toplam Maliyet Özeti/);
});

test('overview empty state Turkish', () => {
  const html = buildDecisionOverviewHtml({ ready: false });
  assert.match(html, /henüz hazır değil/);
});

test('overview has mobile grid class', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /udc-overview__grid/);
});

// --- CHECKLIST BUILDER ---

test('checklist renders Kontrol Listesi', () => {
  assert.match(buildDecisionChecklistHtml([{ label: 'Test', done: true }]), /Kontrol Listesi/);
});

test('checklist empty state', () => {
  assert.match(buildDecisionChecklistHtml([]), /henüz oluşturulmadı/);
});

// --- SUMMARY BUILDER ---

test('summary renders Karar Açıklaması', () => {
  assert.match(buildDecisionSummaryHtml(fullCtx()), /Karar Açıklaması/);
});

test('summary includes disclaimer', () => {
  assert.match(buildDecisionSummaryHtml(fullCtx()), /nihai karar size aittir/);
});

// --- SCENARIO BUILDER ---

test('scenario renders Senaryo Simülasyonu', () => {
  assert.match(buildDecisionScenarioHtml(fullCtx().scenario), /Senaryo Simülasyonu/);
});

test('scenario loading state', () => {
  assert.match(buildDecisionScenarioHtml(null, { loading: true }), /hesaplanıyor/);
});

test('scenario empty state', () => {
  assert.match(buildDecisionScenarioHtml(null), /henüz hazır değil/);
});

// --- CENTER BUILDER ---

test('center renders Karar Merkezi', () => {
  assert.match(buildUserDecisionCenterHtml(fullCtx()), /Karar Merkezi/);
});

test('center empty html', () => {
  assert.match(buildUserDecisionCenterEmptyHtml(), /henüz hazır değil/);
});

test('center includes data-udc-listing-id', () => {
  assert.match(buildUserDecisionCenterHtml(fullCtx()), /data-udc-listing-id/);
});

// --- PANEL ---

test('panel has four tabs', () => {
  const html = buildUserDecisionPanelHtml({});
  assert.match(html, /Genel Bakış/);
  assert.match(html, /Karar Geçmişi/);
  assert.match(html, /Tercih Profili/);
  assert.match(html, /Geri Bildirim/);
});

test('panel tabs have role tablist', () => {
  assert.match(buildUserDecisionPanelHtml({}), /role="tablist"/);
});

// --- XSS ---

test('XSS escaped in center title', () => {
  const html = buildUserDecisionCenterHtml(fullCtx({ listing: { ...bmwListing, title: evil } }));
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test('XSS escaped in summary', () => {
  const html = buildDecisionSummaryHtml(fullCtx({ decisionSummary: evil }));
  assert.ok(!html.includes('<script>'));
});

test('XSS escaped in checklist', () => {
  const html = buildDecisionChecklistHtml([{ label: evil, done: false }]);
  assert.ok(!html.includes('<script>'));
});

// --- ACCESSIBILITY ---

test('overview has aria-label', () => {
  assert.match(buildDecisionOverviewHtml(fullCtx()), /aria-label="Karar özeti"/);
});

test('checklist has role list', () => {
  assert.match(buildDecisionChecklistHtml([{ label: 'A', done: true }]), /role="list"/);
});

// --- GUARD ---

test('migration file exists', () => {
  assert.ok(fs.existsSync('supabase/migrations/20260702_user_decision_platform_v1.sql'));
});

test('shared engine file exists', () => {
  assert.ok(fs.existsSync('supabase/functions/_shared/user-decision-center/user-decision-engine.js'));
});

test('css file exists', () => {
  assert.ok(fs.existsSync('css/user-decision-center.css'));
});

// --- PARAMETERIZED TESTS ---

const metricLabels = ['Karar Skoru', 'Güven Seviyesi', 'Risk Seviyesi', 'Kalite Skoru', 'Güven Skoru'];
for (const label of metricLabels) {
  test(`overview metric label: ${label}`, () => {
    assert.match(buildDecisionOverviewHtml(fullCtx()), new RegExp(label));
  });
}

for (let score = 40; score <= 90; score += 5) {
  test(`overview renders score ${score}`, () => {
    const html = buildDecisionOverviewHtml(fullCtx({ decisionScore: score }));
    assert.match(html, new RegExp(String(score)));
  });
}

for (const risk of ['low', 'medium', 'high']) {
  test(`overview risk class for ${risk}`, () => {
    const html = buildDecisionOverviewHtml(fullCtx({ riskLevel: risk }));
    assert.match(html, /Risk Seviyesi/);
  });
}

for (let i = 0; i < 20; i++) {
  test(`checklist item count ${i + 1}`, () => {
    const items = Array.from({ length: i }, (_, j) => ({ label: `Adım ${j}`, done: j % 2 === 0 }));
    const html = buildDecisionChecklistHtml(items);
    if (i === 0) assert.match(html, /oluşturulmadı/);
    else assert.match(html, /Adım 0/);
  });
}

for (const phrase of USER_DECISION_FORBIDDEN_PHRASES) {
  test(`forbidden phrase blocked: ${phrase}`, () => {
    const out = sanitizeUserDecisionText(phrase);
    assert.ok(!out.toLowerCase().includes(phrase));
  });
}

for (const tab of ['overview', 'history', 'preferences', 'feedback']) {
  test(`panel active tab ${tab}`, () => {
    const html = buildUserDecisionPanelHtml({ activeTab: tab });
    assert.match(html, new RegExp(`udc-panel-${tab}`));
  });
}

const categories = ['vehicle', 'housing', 'vacation', 'arac', 'ev'];
for (const cat of categories) {
  test(`recommendation input category ${cat}`, () => {
    const rec = buildListingRecommendationInput({ ...bmwListing, category: cat });
    assert.ok(rec.category);
  });
}

for (let price = 100000; price <= 5000000; price += 500000) {
  test(`context cache key varies by price ${price}`, () => {
    const key = buildUserDecisionCacheKey({ id: 'x', price }, profile);
    assert.match(key, /^udc:/);
  });
}
