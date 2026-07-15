#!/usr/bin/env node
/**
 * P4.6 brand consistency audit.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const mustExist = [
  'js/core/brand-voice.js',
  'js/runtime/brand-consistency.js',
  'css/p4-6-brand-consistency.css',
  'docs/P4_6_BRAND_CONSISTENCY.md'
];

const mustContain = [
  ['css/style.css', 'final-enterprise-release.css'],
  ['js/runtime/enterprise-ux.js', 'initBrandConsistency'],
  ['js/core/brand-voice.js', 'Ön değerlendirmeye başla'],
  ['js/core/conversion-copy.js', 'brand-voice.js'],
  ['index.html', 'Ön değerlendirmeye başla'],
  ['js/features/i18n/marketing-copy.js', 'Tam analize başla'],
  ['!index.html', 'section-kicker">Piyasa'],
  ['js/ui/premium-pages.js', 'BRAND_VOICE'],
  ['js/features/monetization/plans.js', 'karar altyapısı'],
  ['js/auto/auto-app.js', 'initBrandConsistency'],
  ['js/runtime/corporate-ux.js', 'initBrandConsistency'],
  ['js/core/brand-voice.js', 'Tam analize başla'],
  ['ai/index.html', 'Ön değerlendirmeye başla'],
  ['auto/index.html', 'Aracımı Analiz Et'],
  ['auto/index.html', 'Analizi başlat']
];

const LEGACY_AUTO_EXPERIMENT_COPY = [
  'Ücretsiz maliyet analizi',
  'Hemen maliyet analizi başlat'
];

const mustNotContain = [
  ['js/core/brand-voice.js', "primaryAutoLegacy: 'Ücretsiz karar analizi başlat'"],
  ['js/core/brand-voice.js', "primaryAutoLong: 'Ücretsiz karar analizi başlat'"],
  ['js/runtime/brand-consistency.js', 'premium_hero'],
  ['index.html', 'Ücretsiz analiz başlat'],
  ['auto/index.html', 'Ücretsiz analiz başlat'],
  ...LEGACY_AUTO_EXPERIMENT_COPY.flatMap((needle) => [
    ['data/growth/experiments.json', needle],
    ['index.html', needle],
    ['auto/index.html', needle]
  ]),
  ['index.html', 'Ücretsiz karar analizi başlat'],
  ['auto/index.html', 'Ücretsiz karar analizi başlat']
];

let failed = false;

for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error('MISSING:', rel);
    failed = true;
  }
}

for (const [rel, needle] of mustContain) {
  const neg = rel.startsWith('!');
  const file = neg ? rel.slice(1) : rel;
  const content = read(file);
  const hit = content.includes(needle);
  if (neg ? hit : !hit) {
    console.error('ASSERT FAILED:', file, neg ? 'must NOT contain' : 'must contain', needle);
    failed = true;
  }
}

for (const [rel, needle] of mustNotContain) {
  const content = read(rel);
  if (content.includes(needle)) {
    console.error('ASSERT FAILED:', rel, 'must NOT contain', needle);
    failed = true;
  }
}

function assertHeroCtaCopyExperiment() {
  const rel = 'data/growth/experiments.json';
  const data = JSON.parse(read(rel));
  const exp = (data.experiments || []).find((e) => e.id === 'hero_cta_copy_q2');
  if (!exp) {
    console.error('ASSERT FAILED:', rel, 'missing experiment hero_cta_copy_q2');
    failed = true;
    return;
  }
  const control = (exp.variants || []).find((v) => v.id === 'control');
  const urgency = (exp.variants || []).find((v) => v.id === 'urgency');
  const autoSelector = '[data-auto-hero-cta]';
  const expected = {
    control: 'Aracımı Analiz Et',
    urgency: 'Araç analizine başla'
  };
  if (!control?.copy?.[autoSelector] || control.copy[autoSelector] !== expected.control) {
    console.error(
      'ASSERT FAILED:',
      rel,
      `${autoSelector} control copy must be`,
      expected.control
    );
    failed = true;
  }
  if (!urgency?.copy?.[autoSelector] || urgency.copy[autoSelector] !== expected.urgency) {
    console.error(
      'ASSERT FAILED:',
      rel,
      `${autoSelector} urgency copy must be`,
      expected.urgency
    );
    failed = true;
  }
}

assertHeroCtaCopyExperiment();

if (failed) process.exit(1);
console.log('P4.6 brand consistency audit passed.');
