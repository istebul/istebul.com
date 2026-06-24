import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PremiumPages } from '../../js/ui/premium-pages.js';
import { spaPagesCopy } from '../../js/features/i18n/spa-pages-copy.js';

const FORBIDDEN_HUB_COPY = [
  'Hybrid SUV',
  'Yanlış araç',
  'Model A',
  'Model B',
  '4 modele',
  '4 model'
];

const REQUIRED_HUB_COPY = [
  'Büyük karar · aile bütçesi · örnek uygunluk senaryosu',
  'Seçenek A',
  'Seçenek B',
  '12 ay toplam maliyet',
  'Aylık ödeme yükü',
  'Yanlış karar maliyetini azaltın',
  'Önce ücretsiz ön değerlendirme'
];

test('renderKararAnaliziPage uses category-neutral hub copy', () => {
  const html = new PremiumPages().renderKararAnaliziPage();

  for (const phrase of FORBIDDEN_HUB_COPY) {
    assert.equal(
      html.includes(phrase),
      false,
      `hub template must not include auto-heavy phrase: ${phrase}`
    );
  }

  for (const phrase of REQUIRED_HUB_COPY) {
    assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('spa-pages-copy premiumKarar compareLead is category-neutral', () => {
  assert.match(spaPagesCopy.tr.premiumKarar.compareLead, /4 seçeneğe/);
  assert.doesNotMatch(spaPagesCopy.tr.premiumKarar.compareLead, /4 model/i);
  assert.match(spaPagesCopy.en.premiumKarar.compareLead, /4 options/i);
  assert.doesNotMatch(spaPagesCopy.en.premiumKarar.compareLead, /4 models/i);
});

test('premium-pages source guard blocks auto-heavy hub phrases', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const source = fs.readFileSync(path.join(root, 'js/ui/premium-pages.js'), 'utf8');
  const renderBlock = source.slice(
    source.indexOf('renderKararAnaliziPage()'),
    source.indexOf('renderMetodolojiPage()')
  );

  for (const phrase of FORBIDDEN_HUB_COPY) {
    assert.equal(
      renderBlock.includes(phrase),
      false,
      `renderKararAnaliziPage source must not include: ${phrase}`
    );
  }
});
