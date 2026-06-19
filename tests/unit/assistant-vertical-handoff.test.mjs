import test from 'node:test';
import assert from 'node:assert/strict';

const {
  LISTING_BROWSE_CATEGORY_IDS,
  VERTICAL_CONTINUE_CATEGORY_LABELS,
  resolveVerticalContinueHandoff
} = await import('../../js/ui/assistant-ui.js');

test('resolveVerticalContinueHandoff returns model for supported categories', () => {
  const handoff = resolveVerticalContinueHandoff('arac', {
    budget: '900000',
    usage: 'city',
    fuel: 'hybrid',
    body: 'sedan'
  });

  assert.ok(handoff);
  assert.equal(handoff.sectionTitle, 'Tam karar analizi için kategori akışına devam edin');
  assert.equal(handoff.sectionLead, 'Verdiğiniz bilgiler tam analizde kullanılmak üzere aktarılacak.');
  assert.equal(handoff.ctaLabel, 'Tam analize devam et');
  assert.equal(handoff.categoryLabel, VERTICAL_CONTINUE_CATEGORY_LABELS.arac);
  assert.match(handoff.href, /^\/auto\/?/);
});

test('resolveVerticalContinueHandoff maps all category labels', () => {
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.arac, 'Araba Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.ev, 'Konut Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.finansman, 'Finansman Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.sigorta, 'Sigorta Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.kasko, 'Kasko Karar Analizi');
  assert.equal(VERTICAL_CONTINUE_CATEGORY_LABELS.tatil, 'Tatil Karar Analizi');
});

test('resolveVerticalContinueHandoff hides when href is unavailable', () => {
  assert.equal(resolveVerticalContinueHandoff('unknown-category', {}), null);
});

test('resolveVerticalContinueHandoff still links arac without query params', () => {
  const handoff = resolveVerticalContinueHandoff('arac', {});
  assert.ok(handoff);
  assert.match(handoff.href, /^\/auto\/?/);
});

test('LISTING_BROWSE_CATEGORY_IDS limits marketplace browse to listing categories', () => {
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('arac'), true);
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('ev'), true);
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('tatil'), true);
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('finansman'), false);
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('sigorta'), false);
  assert.equal(LISTING_BROWSE_CATEGORY_IDS.has('kasko'), false);
});

test('resolveVerticalContinueHandoff links all canonical verticals', () => {
  assert.match(resolveVerticalContinueHandoff('tatil', { vacationType: 'familyResort' })?.href || '', /^\/tatil\/?/);
  assert.match(resolveVerticalContinueHandoff('finansman', { purpose: 'konut', budget: '500000' })?.href || '', /^\/finans\/?/);
  assert.match(resolveVerticalContinueHandoff('sigorta', { insuranceType: 'saglik' })?.href || '', /^\/sigorta\/?/);
  assert.match(resolveVerticalContinueHandoff('kasko', { vehicle_category: 'otomobil' })?.href || '', /^\/kasko\/?/);
});
