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
  ['index.html', 'Tam analize başla']
];

const mustNotContain = [
  ['js/core/brand-voice.js', "primaryAutoLegacy: 'Ücretsiz karar analizi başlat'"],
  ['js/core/brand-voice.js', "primaryAutoLong: 'Ücretsiz karar analizi başlat'"],
  ['js/runtime/brand-consistency.js', 'premium_hero'],
  ['index.html', 'Ücretsiz analiz başlat']
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

if (failed) process.exit(1);
console.log('P4.6 brand consistency audit passed.');
