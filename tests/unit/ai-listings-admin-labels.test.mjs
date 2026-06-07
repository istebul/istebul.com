import test from 'node:test';
import assert from 'node:assert/strict';

const {
  CATEGORY_LABELS,
  USAGE_TYPE_LABELS,
  RISK_TOLERANCE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  METRIC_LABELS,
  formatCategoryLabel,
  formatUsageTypeLabel,
  formatRiskToleranceLabel,
  formatPriorityLabel,
  formatStatusLabel,
  formatAdminMetricLabel,
  toSelectOption,
  toSelectOptions
} = await import('../../js/admin/ai-listings-admin-labels.js');

// --- CATEGORY LABELS ---

test('formatCategoryLabel vehicle → Araç', () => {
  assert.equal(formatCategoryLabel('vehicle'), 'Araç');
});

test('formatCategoryLabel real_estate → Konut', () => {
  assert.equal(formatCategoryLabel('real_estate'), 'Konut');
});

test('formatCategoryLabel housing → Konut', () => {
  assert.equal(formatCategoryLabel('housing'), 'Konut');
});

test('formatCategoryLabel travel → Tatil', () => {
  assert.equal(formatCategoryLabel('travel'), 'Tatil');
});

test('formatCategoryLabel finance → Finansman', () => {
  assert.equal(formatCategoryLabel('finance'), 'Finansman');
});

test('formatCategoryLabel insurance → Sigorta', () => {
  assert.equal(formatCategoryLabel('insurance'), 'Sigorta');
});

test('formatCategoryLabel preserves internal value in toSelectOption', () => {
  const opt = toSelectOption('vehicle', CATEGORY_LABELS);
  assert.equal(opt.value, 'vehicle');
  assert.equal(opt.label, 'Araç');
});

test('formatCategoryLabel unknown value graceful fallback', () => {
  assert.equal(formatCategoryLabel('unknown_cat'), 'unknown cat');
});

test('formatCategoryLabel empty returns dash', () => {
  assert.equal(formatCategoryLabel(''), '—');
  assert.equal(formatCategoryLabel(null), '—');
});

// --- USAGE TYPE LABELS ---

test('formatUsageTypeLabel family → Aile kullanımı', () => {
  assert.equal(formatUsageTypeLabel('family'), 'Aile kullanımı');
});

test('formatUsageTypeLabel city → Şehir içi', () => {
  assert.equal(formatUsageTypeLabel('city'), 'Şehir içi');
});

test('formatUsageTypeLabel long_road → Uzun yol', () => {
  assert.equal(formatUsageTypeLabel('long_road'), 'Uzun yol');
});

test('formatUsageTypeLabel business → İş kullanımı', () => {
  assert.equal(formatUsageTypeLabel('business'), 'İş kullanımı');
});

test('formatUsageTypeLabel mixed → Karma kullanım', () => {
  assert.equal(formatUsageTypeLabel('mixed'), 'Karma kullanım');
});

test('toSelectOptions usage types keep internal values', () => {
  const opts = toSelectOptions(['family', 'city'], USAGE_TYPE_LABELS);
  assert.deepEqual(opts.map((o) => o.value), ['family', 'city']);
  assert.equal(opts[0].label, 'Aile kullanımı');
});

// --- RISK TOLERANCE LABELS ---

test('formatRiskToleranceLabel low → Düşük', () => {
  assert.equal(formatRiskToleranceLabel('low'), 'Düşük');
});

test('formatRiskToleranceLabel medium → Orta', () => {
  assert.equal(formatRiskToleranceLabel('medium'), 'Orta');
});

test('formatRiskToleranceLabel high → Yüksek', () => {
  assert.equal(formatRiskToleranceLabel('high'), 'Yüksek');
});

// --- PRIORITY LABELS ---

test('formatPriorityLabel total_cost → Toplam maliyet', () => {
  assert.equal(formatPriorityLabel('total_cost'), 'Toplam maliyet');
});

test('formatPriorityLabel low_risk → Düşük risk', () => {
  assert.equal(formatPriorityLabel('low_risk'), 'Düşük risk');
});

test('formatPriorityLabel comfort → Konfor', () => {
  assert.equal(formatPriorityLabel('comfort'), 'Konfor');
});

test('formatPriorityLabel performance → Performans', () => {
  assert.equal(formatPriorityLabel('performance'), 'Performans');
});

test('formatPriorityLabel resale → İkinci el değeri', () => {
  assert.equal(formatPriorityLabel('resale'), 'İkinci el değeri');
});

test('formatPriorityLabel family → Aile uygunluğu', () => {
  assert.equal(formatPriorityLabel('family'), 'Aile uygunluğu');
});

test('formatPriorityLabel economy → Ekonomi', () => {
  assert.equal(formatPriorityLabel('economy'), 'Ekonomi');
});

// --- STATUS LABELS ---

test('formatStatusLabel draft → Taslak', () => {
  assert.equal(formatStatusLabel('draft'), 'Taslak');
});

test('formatStatusLabel review → İncelemede', () => {
  assert.equal(formatStatusLabel('review'), 'İncelemede');
});

test('formatStatusLabel approved → Onaylandı', () => {
  assert.equal(formatStatusLabel('approved'), 'Onaylandı');
});

test('formatStatusLabel rejected → Reddedildi', () => {
  assert.equal(formatStatusLabel('rejected'), 'Reddedildi');
});

test('formatStatusLabel archived → Arşivlendi', () => {
  assert.equal(formatStatusLabel('archived'), 'Arşivlendi');
});

test('formatStatusLabel pending_review → İncelemede', () => {
  assert.equal(formatStatusLabel('pending_review'), 'İncelemede');
});

// --- METRIC LABELS ---

test('formatAdminMetricLabel decision_score → Karar skoru', () => {
  assert.equal(formatAdminMetricLabel('decision_score'), 'Karar skoru');
});

test('formatAdminMetricLabel decisionScore → Karar skoru', () => {
  assert.equal(formatAdminMetricLabel('decisionScore'), 'Karar skoru');
});

test('formatAdminMetricLabel risk_score → Risk skoru', () => {
  assert.equal(formatAdminMetricLabel('risk_score'), 'Risk skoru');
});

test('formatAdminMetricLabel quality_score → Kalite skoru', () => {
  assert.equal(formatAdminMetricLabel('quality_score'), 'Kalite skoru');
});

test('formatAdminMetricLabel explanation_score → Açıklama skoru', () => {
  assert.equal(formatAdminMetricLabel('explanation_score'), 'Açıklama skoru');
});

test('formatAdminMetricLabel compare_score → Karşılaştırma skoru', () => {
  assert.equal(formatAdminMetricLabel('compare_score'), 'Karşılaştırma skoru');
});

test('formatAdminMetricLabel fit_score → Uyum skoru', () => {
  assert.equal(formatAdminMetricLabel('fit_score'), 'Uyum skoru');
});

// --- INTERNAL VALUE SAFETY ---

test('toSelectOption does not mutate input value', () => {
  const value = 'vehicle';
  const opt = toSelectOption(value, CATEGORY_LABELS);
  assert.equal(value, 'vehicle');
  assert.equal(opt.value, 'vehicle');
});

test('toSelectOptions returns new array without mutating source', () => {
  const values = ['family', 'medium'];
  const copy = [...values];
  toSelectOptions(values, USAGE_TYPE_LABELS);
  assert.deepEqual(values, copy);
});

test('label maps are frozen', () => {
  assert.equal(Object.isFrozen(CATEGORY_LABELS), true);
  assert.equal(Object.isFrozen(USAGE_TYPE_LABELS), true);
  assert.equal(Object.isFrozen(RISK_TOLERANCE_LABELS), true);
  assert.equal(Object.isFrozen(PRIORITY_LABELS), true);
  assert.equal(Object.isFrozen(STATUS_LABELS), true);
  assert.equal(Object.isFrozen(METRIC_LABELS), true);
});

// --- CASE INSENSITIVITY ---

test('formatCategoryLabel is case insensitive', () => {
  assert.equal(formatCategoryLabel('VEHICLE'), 'Araç');
  assert.equal(formatCategoryLabel('Vehicle'), 'Araç');
});

test('formatRiskToleranceLabel is case insensitive', () => {
  assert.equal(formatRiskToleranceLabel('MEDIUM'), 'Orta');
});

// --- RECOMMENDATIONS FORM OPTIONS ---

test('toSelectOptions for all category options', () => {
  const cats = ['vehicle', 'housing', 'travel', 'finance', 'insurance'];
  const opts = toSelectOptions(cats, CATEGORY_LABELS);
  assert.equal(opts.length, 5);
  assert.ok(opts.every((o) => o.value && o.label));
  assert.ok(opts.every((o) => !/vehicle|housing|travel/.test(o.label)));
});

test('toSelectOptions for all priority options', () => {
  const priorities = ['total_cost', 'low_risk', 'comfort', 'performance', 'resale', 'family', 'economy'];
  const opts = toSelectOptions(priorities, PRIORITY_LABELS);
  assert.equal(opts.length, 7);
  assert.equal(opts.find((o) => o.value === 'total_cost')?.label, 'Toplam maliyet');
  assert.equal(opts.find((o) => o.value === 'economy')?.label, 'Ekonomi');
});

test('toSelectOptions for all risk tolerance options', () => {
  const opts = toSelectOptions(['low', 'medium', 'high'], RISK_TOLERANCE_LABELS);
  assert.deepEqual(
    opts.map((o) => o.label),
    ['Düşük', 'Orta', 'Yüksek']
  );
});

test('toSelectOptions for all status options', () => {
  const opts = toSelectOptions(['draft', 'review', 'approved', 'rejected', 'archived'], STATUS_LABELS);
  assert.deepEqual(
    opts.map((o) => o.label),
    ['Taslak', 'İncelemede', 'Onaylandı', 'Reddedildi', 'Arşivlendi']
  );
});

// --- ADDITIONAL COVERAGE ---

test('formatAdminMetricLabel unknown key uses underscore replacement', () => {
  assert.equal(formatAdminMetricLabel('source_type'), 'source type');
});

test('formatAdminMetricLabel empty returns empty-ish', () => {
  assert.equal(formatAdminMetricLabel(''), '');
});

test('CATEGORY_LABELS includes konut alias', () => {
  assert.equal(formatCategoryLabel('konut'), 'Konut');
});

test('CATEGORY_LABELS includes vacation alias', () => {
  assert.equal(formatCategoryLabel('vacation'), 'Tatil');
});

test('USAGE_TYPE_LABELS includes commute', () => {
  assert.equal(formatUsageTypeLabel('commute'), 'İşe gidiş');
});

test('METRIC_LABELS has report_score', () => {
  assert.equal(formatAdminMetricLabel('report_score'), 'Rapor skoru');
});

test('METRIC_LABELS has trust_score', () => {
  assert.equal(formatAdminMetricLabel('trust_score'), 'Güven skoru');
});

test('METRIC_LABELS has confidence_score', () => {
  assert.equal(formatAdminMetricLabel('confidence_score'), 'Güven skoru');
});
