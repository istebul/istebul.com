import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PremiumPages } from '../../js/ui/premium-pages.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const assistantUiSource = fs.readFileSync(path.join(root, 'js/ui/assistant-ui.js'), 'utf8');
const premiumPagesSource = fs.readFileSync(path.join(root, 'js/ui/premium-pages.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');

const FORBIDDEN_ASSISTANT_COPY = [
  'Sonucu hesapla',
  'Güven skoru ',
  'AI destekli seçenekleri incele',
  'ilanlarla karşılaştırın'
];

const REQUIRED_ASSISTANT_COPY = [
  'Ön değerlendirmeyi tamamla',
  'Ön uyum skoru ',
  'Karar skoruna göre seçenekleri incele',
  'aynı segmentteki alternatiflerle karşılaştırın',
  'Bu kriterler ön değerlendirme sorularını ön doldurur; tam skor ilgili kategori akışında hesaplanır.'
];

const FORBIDDEN_PREMIUM_HAYALINI_COPY = [
  'Kriterleri çıkar'
];

const FORBIDDEN_INTENT_STATUS_COPY = [
  'Sorular ön dolduruldu. Devam etmeden önce kontrol edin.',
  'Devam etmeden önce kontrol edin'
];

const REQUIRED_INTENT_STATUS_COPY = [
  'Kriterler ön değerlendirme sorularına aktarıldı',
  'Tam skoru görmek için kategori akışında devam edin'
];

test('assistant-ui public Karar Asistanı copy uses pre-eval decision language', () => {
  for (const phrase of FORBIDDEN_ASSISTANT_COPY) {
    assert.equal(
      assistantUiSource.includes(phrase),
      false,
      `assistant-ui.js must not include risky phrase: ${phrase}`
    );
  }

  for (const phrase of REQUIRED_ASSISTANT_COPY) {
    assert.match(assistantUiSource, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('premium-pages Hayalini Anlat panel aligns pre-eval and category-flow copy', () => {
  const hayaliniBlock = premiumPagesSource.slice(
    premiumPagesSource.indexOf('Hayalini anlat'),
    premiumPagesSource.indexOf('id="assistant-intent-status"')
  );

  for (const phrase of FORBIDDEN_PREMIUM_HAYALINI_COPY) {
    assert.equal(
      hayaliniBlock.includes(phrase),
      false,
      `Hayalini Anlat block must not include: ${phrase}`
    );
  }

  assert.match(hayaliniBlock, /Şu an araç ihtiyacı için çalışır/);
  assert.match(hayaliniBlock, /Tam skor ve karar analizi ilgili kategori akışında hesaplanır/);
  assert.match(hayaliniBlock, /Kriterleri anla ve ön doldur/);
});

test('app.js Hayalini Anlat success status uses pre-eval handoff language', () => {
  for (const phrase of FORBIDDEN_INTENT_STATUS_COPY) {
    assert.equal(
      appSource.includes(phrase),
      false,
      `app.js must not include legacy intent status phrase: ${phrase}`
    );
  }

  for (const phrase of REQUIRED_INTENT_STATUS_COPY) {
    assert.match(appSource, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('renderKararAnaliziPage footer uses ön değerlendirme language', () => {
  const html = new PremiumPages().renderKararAnaliziPage();

  assert.match(html, /Önce ücretsiz ön değerlendirme/);
  assert.doesNotMatch(html, /Önce ücretsiz karar analizi/);
  assert.match(html, /Kriterleri anla ve ön doldur/);
  assert.match(html, /Tam skor ve karar analizi ilgili kategori akışında hesaplanır/);
});
