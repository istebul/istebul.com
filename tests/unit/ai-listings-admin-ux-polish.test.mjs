import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  formatCategoryLabel,
  formatUsageTypeLabel,
  formatRiskToleranceLabel,
  formatPriorityLabel,
  formatStatusLabel,
  formatAdminMetricLabel,
  formatSourceTypeLabel,
  formatRiskLevelLabel,
  formatDuplicateLabel,
  formatUiStatusLabel,
  formatLoadingLabel,
  formatErrorFallbackLabel,
  translateAdminUiError,
  humanizeSnakeCaseTr
} = await import('../../js/admin/ai-listings-admin-labels.js');

const {
  buildDecisionWorkspaceHtml,
  buildDecisionWorkspaceEmptyHtml,
  buildActionCenterActions,
  buildWorkspaceLoadingHtml,
  buildWorkspaceDetailSkeletonHtml,
  buildWorkspaceErrorHtml,
  buildDecisionPipeline,
  buildHeatMapSignals
} = await import('../../js/admin/ai-listings-decision-workspace.js');

const { buildListingCardHtml } = await import('../../js/admin/ai-listings-admin-core.js');
const { buildScenarioPanelHtml } = await import('../../js/ai-scenario-simulator/scenario-card-builder.js');
const { buildComparePanelHtml } = await import('../../js/ai-compare-intelligence/compare-card-builder.js');
const { buildExplainabilityPanelHtml } = await import('../../js/ai-decision-explainability/explainability-card-builder.js');
const { buildExecutiveDecisionPanelHtml } = await import('../../js/ai-purchase-decision/executive-decision-card-builder.js');
const { buildExecutiveReportPanelHtml } = await import('../../js/ai-executive-decision-report/executive-report-card-builder.js');
const { getDrawerTitleTr } = await import('../../js/admin/ai-listings-admin-drawer-state.js');

const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');
const cssPath = path.join(process.cwd(), 'css/admin-ai-listings.css');

const listing = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Test Araç',
  category: 'vehicle',
  status: 'approved',
  price: 1000000,
  location: 'İzmir',
  latest_analysis: { quality_score: 80, risk_score: 30, ai_score: 75 }
};

const rec = {
  ...listing,
  fit_score: 82,
  quality_score: 80,
  risk_score: 30
};

const ctx = {
  listing,
  recommendation: rec,
  qualityScore: 80,
  trustScore: 75,
  decisionScore: 72,
  hasOwnershipCost: true,
  hasNegotiation: true,
  hasCompare: true
};

// --- LABELS AUDIT ---

const knownValues = [
  ['vehicle', formatCategoryLabel, 'Araç'],
  ['housing', formatCategoryLabel, 'Konut'],
  ['travel', formatCategoryLabel, 'Tatil'],
  ['finance', formatCategoryLabel, 'Finansman'],
  ['insurance', formatCategoryLabel, 'Sigorta'],
  ['family', formatUsageTypeLabel, 'Aile kullanımı'],
  ['city', formatUsageTypeLabel, 'Şehir içi'],
  ['business', formatUsageTypeLabel, 'İş kullanımı'],
  ['mixed', formatUsageTypeLabel, 'Karma kullanım'],
  ['low', formatRiskToleranceLabel, 'Düşük'],
  ['medium', formatRiskToleranceLabel, 'Orta'],
  ['high', formatRiskToleranceLabel, 'Yüksek'],
  ['total_cost', formatPriorityLabel, 'Toplam maliyet'],
  ['low_risk', formatPriorityLabel, 'Düşük risk'],
  ['comfort', formatPriorityLabel, 'Konfor'],
  ['performance', formatPriorityLabel, 'Performans'],
  ['resale', formatPriorityLabel, 'İkinci el değeri'],
  ['economy', formatPriorityLabel, 'Ekonomi'],
  ['draft', formatStatusLabel, 'Taslak'],
  ['review', formatStatusLabel, 'İncelemede'],
  ['approved', formatStatusLabel, 'Onaylandı'],
  ['rejected', formatStatusLabel, 'Reddedildi'],
  ['archived', formatStatusLabel, 'Arşivlendi']
];

for (const [value, fn, expected] of knownValues) {
  test(`label ${value} → ${expected}`, () => {
    assert.equal(fn(value), expected);
    assert.notEqual(fn(value), value);
  });
}

test('metric decision_score Turkish', () => {
  assert.equal(formatAdminMetricLabel('decision_score'), 'Karar skoru');
});

test('metric risk_score Turkish', () => {
  assert.equal(formatAdminMetricLabel('risk_score'), 'Risk skoru');
});

test('metric quality_score Turkish', () => {
  assert.equal(formatAdminMetricLabel('quality_score'), 'Kalite skoru');
});

test('metric trust_score Turkish', () => {
  assert.equal(formatAdminMetricLabel('trust_score'), 'Güven skoru');
});

test('source type manual Turkish', () => {
  assert.equal(formatSourceTypeLabel('manual'), 'Manuel');
});

test('duplicate label Turkish', () => {
  assert.equal(formatDuplicateLabel('duplicate'), 'Mükerrer');
});

test('same listing found Turkish', () => {
  assert.equal(formatDuplicateLabel('same_listing_found'), 'Aynı ilan bulundu');
});

test('high price Turkish', () => {
  assert.equal(formatDuplicateLabel('high_price'), 'Yüksek fiyat');
});

test('ui status loading Turkish', () => {
  assert.equal(formatUiStatusLabel('loading'), 'Yükleniyor…');
});

test('ui status error Turkish', () => {
  assert.equal(formatUiStatusLabel('error'), 'Hata');
});

test('ui status unavailable Turkish', () => {
  assert.equal(formatUiStatusLabel('unavailable'), 'Kullanılamıyor');
});

test('ui status missing_data Turkish', () => {
  assert.equal(formatUiStatusLabel('missing_data'), 'Eksik veri');
});

test('loading label workspace Turkish', () => {
  assert.match(formatLoadingLabel('workspace'), /Karar çalışma alanı/);
});

test('loading label analysis Turkish', () => {
  assert.match(formatLoadingLabel('analysis'), /Analiz hazırlanıyor/);
});

test('unknown snake_case humanized not raw', () => {
  const label = humanizeSnakeCaseTr('some_unknown_value');
  assert.match(label, /Some unknown value/);
  assert.ok(!label.includes('_'));
});

test('translateAdminUiError negotiation unavailable', () => {
  assert.match(translateAdminUiError('Negotiation unavailable'), /Pazarlık analizi/);
});

test('translateAdminUiError purchase decision unavailable', () => {
  assert.match(translateAdminUiError('Purchase decision unavailable'), /Al kararı/);
});

test('translateAdminUiError explainability unavailable', () => {
  assert.match(translateAdminUiError('Explainability unavailable'), /Karar açıklaması/);
});

test('translateAdminUiError executive report unavailable', () => {
  assert.match(translateAdminUiError('Executive report unavailable'), /Yönetici raporu/);
});

test('translateAdminUiError compare unavailable', () => {
  assert.match(translateAdminUiError('Compare unavailable'), /Karşılaştırma/);
});

test('translateAdminUiError scenario unavailable', () => {
  assert.match(translateAdminUiError('Scenario unavailable'), /Senaryo/);
});

test('formatErrorFallbackLabel insufficient data', () => {
  assert.match(formatErrorFallbackLabel('insufficient_data'), /yeterli veri/);
});

// --- WORKSPACE ---

test('empty state has CTA buttons', () => {
  const html = buildDecisionWorkspaceEmptyHtml();
  assert.match(html, /Öneri üret/);
  assert.match(html, /Yeni ilan ekle/);
  assert.match(html, /Veri havuzuna git/);
});

test('workspace loading skeleton does not wipe root pattern', () => {
  const html = buildWorkspaceLoadingHtml();
  assert.match(html, /ai-ws-loading/);
  assert.doesNotMatch(html, /ai-decision-workspace/);
});

test('detail skeleton Turkish text', () => {
  const html = buildWorkspaceDetailSkeletonHtml();
  assert.match(html, /Analiz hazırlanıyor/);
});

test('workspace error html Turkish', () => {
  const html = buildWorkspaceErrorHtml('unavailable');
  assert.match(html, /ai-ws-error/);
});

test('action center purchase key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'purchase')?.label, 'Al Kararı');
});

test('action center explain key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'explain')?.label, 'Neden Bu Karar?');
});

test('action center report key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'report')?.label, 'Yönetici Raporu');
});

test('action center compare key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'compare')?.label, 'Karşılaştır');
});

test('action center scenario key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'scenario')?.label, 'Senaryo Simülasyonu');
});

test('action center negotiation key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'negotiation')?.label, 'Pazarlık Analizi');
});

test('action center quality key', () => {
  const actions = buildActionCenterActions(ctx);
  assert.equal(actions.find((a) => a.key === 'quality')?.label, 'Kalite ve Güven');
});

test('insufficient data disables negotiation', () => {
  const actions = buildActionCenterActions({ ...ctx, hasNegotiation: false });
  assert.equal(actions.find((a) => a.key === 'negotiation')?.enabled, false);
});

test('insufficient data disables quality without score', () => {
  const actions = buildActionCenterActions({ ...ctx, qualityScore: 0 });
  assert.equal(actions.find((a) => a.key === 'quality')?.enabled, false);
});

test('insufficient data hint Turkish', () => {
  const actions = buildActionCenterActions({ ...ctx, recommendation: null });
  assert.match(actions[0].hint, /Henüz öneri/);
});

test('selected listing refreshes summary', () => {
  const html = buildDecisionWorkspaceHtml(ctx);
  assert.match(html, /Test Araç/);
});

test('selected listing refreshes pipeline', () => {
  const html = buildDecisionWorkspaceHtml(ctx);
  assert.match(html, /Karar Hattı/);
  assert.match(html, /ai-ws-pipeline/);
});

test('selected listing refreshes heat map', () => {
  const html = buildDecisionWorkspaceHtml(ctx);
  assert.match(html, /AI Isı Haritası/);
});

test('selected listing refreshes action center', () => {
  const html = buildDecisionWorkspaceHtml(ctx);
  assert.match(html, /Aksiyon Merkezi/);
  assert.match(html, /data-ws-action="purchase"/);
});

test('risk level displayed in Turkish', () => {
  const html = buildDecisionWorkspaceHtml({ ...ctx, riskLevel: 'medium' });
  assert.match(html, /Orta/);
});

test('pipeline has 13 steps', () => {
  assert.equal(buildDecisionPipeline(ctx).length, 13);
});

test('heat map max 3 per group', () => {
  const heat = buildHeatMapSignals({
    ...ctx,
    decisionScore: 90,
    qualityScore: 90,
    trustScore: 90,
    explanationScore: 90,
    riskScore: 90,
    duplicateLabel: 'Mükerrer',
    missingCount: 5
  });
  assert.ok(heat.strong.length <= 3);
  assert.ok(heat.weak.length <= 3);
  assert.ok(heat.risky.length <= 3);
});

// --- ACCESSIBILITY ---

test('listing card tabindex', () => {
  const html = buildListingCardHtml(listing, false);
  assert.match(html, /tabindex="0"/);
});

test('listing card aria-selected', () => {
  const html = buildListingCardHtml(listing, true);
  assert.match(html, /aria-selected="true"/);
});

test('listing card role button', () => {
  const html = buildListingCardHtml(listing, false);
  assert.match(html, /role="button"/);
});

test('admin.js Enter selects listing', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /event\.key === 'Enter' \|\| event\.key === ' '/);
});

test('scenario panel aria-modal', () => {
  const html = buildScenarioPanelHtml(null);
  assert.match(html, /aria-modal="true"/);
});

test('compare panel aria-modal', () => {
  const html = buildComparePanelHtml(null);
  assert.match(html, /aria-modal="true"/);
});

test('explainability panel aria-modal', () => {
  const html = buildExplainabilityPanelHtml(null);
  assert.match(html, /aria-modal="true"/);
});

test('purchase panel aria-modal', () => {
  const html = buildExecutiveDecisionPanelHtml(null);
  assert.match(html, /aria-modal="true"/);
});

test('executive report panel Turkish aria-label', () => {
  const html = buildExecutiveReportPanelHtml(null);
  assert.match(html, /Yönetici Karar Raporu/);
  assert.doesNotMatch(html, /Executive Decision Report/);
});

test('drawer close aria-label on scenario', () => {
  const html = buildScenarioPanelHtml(null);
  assert.match(html, /aria-label="Kapat"/);
});

// --- ADMIN INTEGRATION ---

test('admin.js renderDecisionWorkspace function exists', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function renderDecisionWorkspace/);
});

test('admin.js normalizeSelectedContext exists', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /function normalizeSelectedContext/);
});

test('admin.js selectedRecommendation state exists', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /selectedRecommendation/);
});

test('admin.js clearWorkspaceModuleCaches on listing change', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /clearWorkspaceModuleCaches/);
  assert.match(src, /lastWorkspaceListingId/);
});

test('showListingDetail does not wipe workspace on error', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  const start = src.indexOf('async function showListingDetail');
  const end = src.indexOf('function bindDuplicateDetailActions', start);
  const block = src.slice(start, end);
  assert.match(block, /renderDecisionWorkspace\(listing\)/);
  assert.match(block, /buildWorkspaceErrorHtml/);
  const errorIdx = block.indexOf('if (!detailRes.ok)');
  const errorBlock = block.slice(errorIdx, errorIdx + 400);
  assert.doesNotMatch(errorBlock, /detailEl\.innerHTML = `<p class="ai-listings-admin__error"/);
});

test('workspace action uses openAiListingsDrawer', () => {
  const src = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(src, /openAiListingsDrawer\(root, 'purchase'/);
  assert.match(src, /openAiListingsDrawer\(root, 'negotiation'/);
  assert.match(src, /openAiListingsDrawer\(root, 'quality'/);
});

// --- CSS RESPONSIVE ---

test('CSS has workspace loading styles', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.ai-ws-loading/);
});

test('CSS action buttons wrap rules', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.ai-ws-action[\s\S]*flex-wrap/);
});

test('CSS drawer mobile full width', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /max-width: 640px[\s\S]*width: 100vw/);
});

test('CSS workspace grid responsive', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /max-width: 900px[\s\S]*\.ai-ws-grid/);
});

test('CSS ai drawer open body scroll', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.ai-listings-admin--ai-drawer-open/);
});

test('CSS empty state CTA styles', () => {
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.match(css, /\.ai-ws-empty__cta/);
});

// --- DRAWER TITLES MATCH SPEC ---

test('drawer titles match workspace action labels context', () => {
  assert.equal(getDrawerTitleTr('purchase'), 'Al Kararı Analizi');
  assert.equal(getDrawerTitleTr('explain'), 'Karar Açıklaması');
  assert.equal(getDrawerTitleTr('quality'), 'Kalite ve Güven');
});
