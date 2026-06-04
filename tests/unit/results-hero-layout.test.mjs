import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const {
  renderResultsHeroLayout,
  renderDecisionScoreRing,
  scoreToneFromLabel
} = await import('../../js/features/results/results-hero-layout.js');

const root = path.resolve(import.meta.dirname, '../..');

test('renderResultsHeroLayout emits 2-column shell with economic mount in aside', () => {
  const html = renderResultsHeroLayout({
    vertical: 'finance',
    title: 'Finansman Planı Öneriniz',
    subtitle: 'Test',
    recommendation: { title: 'Sabit Oranlı Kredi', badge: 'En Uygun' },
    specs: [{ label: 'Vade', value: '120 ay' }],
    score: 87,
    scoreLabel: 'Çok İyi'
  });
  assert.match(html, /ib-results-hero-shell--finance/);
  assert.match(html, /ib-results-hero-grid/);
  assert.match(html, /data-results-economic-mount/);
  assert.match(html, /ib-results-hero-aside/);
  assert.match(html, /Sabit Oranlı Kredi/);
});

test('renderDecisionScoreRing uses score percentage', () => {
  const html = renderDecisionScoreRing(88, 'Çok İyi');
  assert.match(html, /--score-pct: 88/);
  assert.match(html, /88/);
});

test('scoreToneFromLabel maps Turkish labels', () => {
  assert.equal(scoreToneFromLabel('Çok İyi'), 'ok');
  assert.equal(scoreToneFromLabel('Orta risk'), 'warn');
  assert.equal(scoreToneFromLabel('Yüksek risk'), 'danger');
});

test('V2 result modules import shared hero layout', () => {
  for (const file of [
    'js/features/finansman/finansman-results-v2.js',
    'js/features/konut/konut-results-v2.js',
    'js/auto/auto-results-v2.js'
  ]) {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(src, /renderResultsHeroLayout/);
  }
});

test('results hero CSS is imported by V2 stylesheets', () => {
  for (const file of [
    'css/finansman-results-v2.css',
    'css/konut-results-v2.css',
    'css/auto-results-v2.css'
  ]) {
    const css = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(css, /results-hero-layout\.css/);
  }
});
