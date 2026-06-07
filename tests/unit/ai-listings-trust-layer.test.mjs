import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  INSUFFICIENT_DATA_LABEL,
  DUPLICATE_DISPLAY_THRESHOLDS,
  ADMIN_FORBIDDEN_EXECUTIVE_PHRASES,
  EXPLAINABILITY_LABELS_TR,
  EDGE_SECRET_HEADER,
  isMeaningfulScore,
  formatMetricScoreDisplay,
  getDuplicateDisplayLabel,
  getDuplicateTooltipText,
  shouldShowMarketBadge,
  formatExecutiveAverageDisplay,
  containsAdminForbiddenPhrase,
  computeMarketDeltaLabel,
  computeExecutiveDashboardStats,
  buildExecutiveDashboardHtml,
  buildListingCardHtml,
  buildDuplicateCheckCardHtml,
  buildExecutiveSummaryHtml,
  buildExecutiveManagerOneLiner,
  buildExplainabilityPreviewHtml,
  resolveExplainabilityItems,
  buildMarketIntelligenceCardHtml,
  buildExecutiveDecisionCardHtml,
  buildEdgeRequestHeaders,
  getListingAnalyzePath
} = await import('../../js/admin/ai-listings-admin-core.js');

const adminHtmlPath = path.join(process.cwd(), 'admin/ai-listings.html');
const adminJsPath = path.join(process.cwd(), 'js/admin/ai-listings-admin.js');
const handlerPath = path.join(process.cwd(), 'supabase/functions/_shared/ai-listings/handler.js');

const baseListing = {
  id: '11111111-1111-1111-1111-111111111111',
  category: 'vehicle',
  title: '2021 BMW 320i M Sport',
  description: 'Bakımlı servis kayıtlı tek elden araç.',
  price: 1250000,
  currency: 'TRY',
  location: 'İstanbul',
  attributes: { brand: 'BMW', model: '320i', year: 2021, km: 42000 }
};

const nearDuplicate = {
  id: '22222222-2222-2222-2222-222222222222',
  category: 'vehicle',
  title: '2021 BMW 320i',
  description: 'Bakımlı servis kayıtlı tek elden araç.',
  price: 1240000,
  currency: 'TRY',
  location: 'İstanbul',
  attributes: { brand: 'BMW', model: '320i', year: 2021, km: 43000 }
};

test('formatMetricScoreDisplay hides zero market score', () => {
  assert.equal(formatMetricScoreDisplay(0), INSUFFICIENT_DATA_LABEL);
  assert.equal(formatMetricScoreDisplay(null), INSUFFICIENT_DATA_LABEL);
  assert.equal(formatMetricScoreDisplay(undefined), INSUFFICIENT_DATA_LABEL);
  assert.equal(formatMetricScoreDisplay(72), '72');
});

test('isMeaningfulScore treats null and zero as insufficient', () => {
  assert.equal(isMeaningfulScore(0), false);
  assert.equal(isMeaningfulScore(null), false);
  assert.equal(isMeaningfulScore(1), true);
});

test('getDuplicateDisplayLabel maps similarity bands to Turkish labels', () => {
  assert.equal(getDuplicateDisplayLabel(100), 'Aynı ilan bulundu');
  assert.equal(getDuplicateDisplayLabel(95), 'Aynı ilan bulundu');
  assert.equal(getDuplicateDisplayLabel(88), 'Çok benzer ilan');
  assert.equal(getDuplicateDisplayLabel(80), 'Çok benzer ilan');
  assert.equal(getDuplicateDisplayLabel(70), 'Benzer ilan');
  assert.equal(getDuplicateDisplayLabel(60), 'Benzer ilan');
  assert.equal(getDuplicateDisplayLabel(59), null);
  assert.equal(getDuplicateDisplayLabel(null), null);
});

test('duplicate percentage appears only in tooltip text', () => {
  const tooltip = getDuplicateTooltipText(97);
  assert.match(tooltip, /%97/);
  const label = getDuplicateDisplayLabel(97);
  assert.doesNotMatch(label ?? '', /%/);
});

test('buildListingCardHtml does not show Piyasa 0 badge', () => {
  const html = buildListingCardHtml(
    { ...baseListing, market_score: 0 },
    false,
    { candidates: [] }
  );
  assert.doesNotMatch(html, /Piyasa 0/);
  assert.doesNotMatch(html, /Duplicate %/);
});

test('buildListingCardHtml shows price position badge when available', () => {
  const html = buildListingCardHtml(baseListing, false, {
    candidates: [],
    events: []
  });
  assert.match(html, /listing-metric--price-position|Makul aralık|Biraz yüksek|Yüksek fiyat|Fırsat olabilir/);
});

test('buildListingCardHtml shows duplicate label without percent in card body', () => {
  const html = buildListingCardHtml(baseListing, false, {
    candidates: [nearDuplicate]
  });
  assert.match(html, /Aynı ilan bulundu|Çok benzer ilan|Benzer ilan/);
  assert.doesNotMatch(html, /Duplicate %/);
  assert.doesNotMatch(html, />Duplicate /);
});

test('buildListingCardHtml badge order: decision before ai before risk', () => {
  const html = buildListingCardHtml(
    baseListing,
    false,
    {
      candidates: [nearDuplicate],
      events: []
    }
  );
  const metricsMatch = html.match(/ai-listings-admin__listing-card-metrics">([\s\S]*?)<\/span>\s*<span class="ai-listings-admin__listing-card-footer"/);
  assert.ok(metricsMatch, 'metrics block should exist');
  const metrics = metricsMatch[1];
  const decisionIdx = metrics.indexOf('listing-metric--decision');
  const aiIdx = metrics.indexOf('listing-metric--ai');
  const riskIdx = metrics.indexOf('listing-metric--risk');
  const duplicateIdx = metrics.indexOf('listing-metric--duplicate');
  const priceIdx = metrics.indexOf('listing-metric--price">');
  assert.ok(decisionIdx >= 0 && aiIdx >= 0 && riskIdx >= 0, 'decision, ai, risk badges present');
  assert.ok(decisionIdx < aiIdx, 'decision before ai');
  assert.ok(aiIdx < riskIdx, 'ai before risk');
  if (duplicateIdx >= 0 && priceIdx >= 0) {
    assert.ok(duplicateIdx < priceIdx, 'duplicate before price');
  }
});

test('formatExecutiveAverageDisplay shows dash for zero or empty averages', () => {
  assert.equal(formatExecutiveAverageDisplay(null), '—');
  assert.equal(formatExecutiveAverageDisplay(0), '—');
  assert.equal(formatExecutiveAverageDisplay(65), 65);
});

test('computeExecutiveDashboardStats excludes zero scores from averages', () => {
  const stats = computeExecutiveDashboardStats([
    {
      id: '1',
      title: 'A',
      created_at: '2026-06-07T10:00:00Z',
      latest_analysis: { ai_score: 0, risk_score: 0, created_at: '2026-06-07T10:00:00Z' }
    },
    {
      id: '2',
      title: 'B',
      created_at: '2026-06-07T09:00:00Z',
      latest_analysis: { ai_score: 80, risk_score: 40, created_at: '2026-06-07T09:00:00Z' }
    }
  ]);
  assert.equal(stats.avgAiScore, 80);
  assert.equal(stats.avgRisk, 40);
});

test('buildExecutiveDashboardHtml includes metric hints and decision labels', () => {
  const html = buildExecutiveDashboardHtml([
    {
      id: '1',
      title: 'Test İlan',
      source_type: 'manual',
      created_at: '2026-06-07T10:00:00Z',
      latest_analysis: { ai_score: 75, risk_score: 30, created_at: '2026-06-07T10:00:00Z' }
    }
  ]);
  assert.match(html, /son 24 saat/);
  assert.match(html, /tamamlanan analizler/);
  assert.match(html, /exec-feed-decision/);
});

test('buildExecutiveSummaryHtml avoids forbidden executive wording', () => {
  const forbidden = buildExecutiveSummaryHtml({
    summary: 'Kesinlikle alın, garanti gerçek piyasa yatırım tavsiyesi kesin değer.'
  });
  assert.doesNotMatch(forbidden, /kesinlikle alın/i);
  assert.doesNotMatch(forbidden, /garanti/i);
  assert.doesNotMatch(forbidden, /gerçek piyasa/i);
  assert.doesNotMatch(forbidden, /yatırım tavsiyesi/i);
  assert.doesNotMatch(forbidden, /kesin değer/i);
});

test('buildExecutiveManagerOneLiner uses safe pre-evaluation language', () => {
  const summary = buildExecutiveManagerOneLiner(
    { ai_score: 70, risk_score: 45, price_score: 68 },
    baseListing
  );
  assert.match(summary, /Mevcut bilgilerle/i);
  assert.match(summary, /ön değerlendirme/i);
  assert.equal(containsAdminForbiddenPhrase(summary), false);
});

test('containsAdminForbiddenPhrase detects banned phrases', () => {
  for (const phrase of ADMIN_FORBIDDEN_EXECUTIVE_PHRASES) {
    assert.equal(containsAdminForbiddenPhrase(`Test ${phrase} metni`), true, phrase);
  }
});

test('buildExplainabilityPreviewHtml renders decision rationale list', () => {
  const html = buildExplainabilityPreviewHtml(baseListing, { ai_score: 75, risk_score: 30 });
  assert.match(html, /Neden bu karar\?/);
  assert.match(html, /ai-listings-admin__explain-item/);
});

test('resolveExplainabilityItems returns fallback items when tags empty', () => {
  const items = resolveExplainabilityItems(baseListing, { ai_score: 75, risk_score: 30 });
  assert.ok(items.length >= 3);
  assert.ok(items.some((item) => EXPLAINABILITY_LABELS_TR[item.id] || item.id));
});

test('buildDuplicateCheckCardHtml shows status without percent in headline', () => {
  const html = buildDuplicateCheckCardHtml(baseListing, nearDuplicate, {
    status: 'exact',
    similarity: 97,
    summary: '%97 eşleşme ile aynı ilan bulundu'
  });
  assert.match(html, /Aynı ilan bulundu/);
  assert.doesNotMatch(html, /⚠ %97 eşleşme bulundu/);
  assert.match(html, /teknik benzerlik skoruna dayanır/);
  assert.match(html, /Mevcut ilanı aç/);
  assert.match(html, /Yeni kayıt olarak bırak/);
});

test('buildDuplicateCheckCardHtml detail variant uses detail actions', () => {
  const html = buildDuplicateCheckCardHtml(
    baseListing,
    nearDuplicate,
    { status: 'similar', similarity: 82 },
    { variant: 'detail', matchedListingId: nearDuplicate.id }
  );
  assert.match(html, /data-duplicate-detail-action="open-existing"/);
  assert.match(html, /data-duplicate-detail-action="leave-as-new"/);
  assert.doesNotMatch(html, /data-duplicate-action="update-existing"/);
});

test('shouldShowMarketBadge respects market context and price position', () => {
  assert.equal(shouldShowMarketBadge(0, null), false);
  assert.equal(shouldShowMarketBadge(null, 'unknown'), false);
  assert.equal(shouldShowMarketBadge(1, null), true);
  assert.equal(shouldShowMarketBadge(0, 'fair'), true);
});

test('computeMarketDeltaLabel returns insufficient data label for zero delta', () => {
  const html = computeMarketDeltaLabel({ price: 1000000 }, { price_score: 100 });
  assert.equal(html, INSUFFICIENT_DATA_LABEL);
});

test('buildMarketIntelligenceCardHtml shows insufficient data when context score is zero', () => {
  const html = buildMarketIntelligenceCardHtml(
    { category: 'vehicle', title: 'X', attributes: {} },
    {
      tags: [
        'market_segment:unknown',
        'demand_score:0',
        'liquidity_score:0',
        'market_context_score:0'
      ]
    }
  );
  assert.match(html, /Yeterli veri yok/);
  assert.doesNotMatch(html, /Piyasa Bağlam Skoru/);
});

test('buildExecutiveDecisionCardHtml includes explainability preview section', () => {
  const html = buildExecutiveDecisionCardHtml(baseListing, { ai_score: 75, risk_score: 30 });
  assert.match(html, /explainability-preview/);
  assert.match(html, /Neden bu karar\?/);
});

test('new listing menu uses + Yeni label and emoji menu items', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(html, />\s*Yeni\s*</);
  assert.doesNotMatch(html, /\+\s*Yeni İlan/);
  assert.match(html, /🤖 AI Builder/);
  assert.match(html, /📝 Manuel İlan/);
  assert.match(html, /📄 CSV İçe Aktar/);
  assert.match(html, /📦 JSON İçe Aktar/);
});

test('admin JS still wires menu actions without endpoint changes', () => {
  const html = fs.readFileSync(adminHtmlPath, 'utf8');
  const js = fs.readFileSync(adminJsPath, 'utf8');
  assert.match(html, /data-menu-action="create"/);
  assert.match(html, /data-menu-action="ai-builder"/);
  assert.match(js, /openCreateDrawer/);
  assert.match(js, /openBuilderDrawer/);
  assert.match(js, /bindDuplicateDetailActions/);
  assert.doesNotMatch(js, /\/listings\/duplicate/);
});

test('no endpoint or schema change guard: analyze path unchanged', () => {
  assert.match(getListingAnalyzePath('abc-123'), /^\/listings\/abc-123\/analyze$/);
});

test('no endpoint or schema change guard: secret header unchanged', () => {
  const headers = buildEdgeRequestHeaders({ secret: 'abc', anonKey: 'anon' });
  assert.equal(headers[EDGE_SECRET_HEADER], 'abc');
});

test('no endpoint or schema change guard: handler routes untouched', () => {
  const handler = fs.readFileSync(handlerPath, 'utf8');
  assert.match(handler, /\/listings\/:id\/analyze/);
  assert.doesNotMatch(handler, /\/listings\/trust-layer/);
});

test('DUPLICATE_DISPLAY_THRESHOLDS align with product bands', () => {
  assert.equal(DUPLICATE_DISPLAY_THRESHOLDS.exact, 95);
  assert.equal(DUPLICATE_DISPLAY_THRESHOLDS.highlySimilar, 80);
  assert.equal(DUPLICATE_DISPLAY_THRESHOLDS.similar, 60);
});
