import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function landingBlock(html) {
  const match = html.match(/id="page-dashboard"[\s\S]*?id="page-dashboard-ceo"/);
  assert.ok(match, 'page-dashboard block exists');
  return match[0];
}

test('NAV_LABELS uses Operasyon Özeti for dashboard landing', () => {
  const shell = read('js/admin/admin-shell.js');
  assert.match(shell, /dashboard:\s*'Operasyon Özeti'/);
  assert.doesNotMatch(shell, /dashboard:\s*'Dashboard'/);
  assert.match(shell, /'ops-command-center':\s*'Operasyon Komuta Merkezi'/);
  assert.match(shell, /'unified-funnel':\s*'Birleşik Funnel'/);
});

test('landing page exposes operasyon panel CTAs', () => {
  const html = read('admin-panel.html');
  const block = landingBlock(html);
  assert.match(block, /Operasyon panelleri/);
  assert.match(block, /data-page-target="ops-command-center"/);
  assert.match(block, /data-page-target="unified-funnel"/);
  assert.match(block, /data-page-target="dashboard-partner-ops"/);
  assert.match(block, /href="\/admin\/ai-listings\/"/);
  assert.match(block, /AI Karar Merkezi/);
});

test('landing charts disclose placeholder/sample visuals', () => {
  const html = read('admin-panel.html');
  const block = landingBlock(html);
  assert.match(block, /örnek görsel/i);
  assert.match(block, /admin-chart-card--sample/);
  assert.doesNotMatch(block, /canlı özet/i);
});

test('executive dashboard headers use Turkish operasyon labels', () => {
  const html = read('admin-panel.html');
  assert.match(html, /<h2>CEO Özeti<\/h2>/);
  assert.match(html, /<h2>Büyüme Özeti<\/h2>/);
  assert.match(html, /<h2>Gelir Özeti<\/h2>/);
  assert.match(html, /<h2>Destek Özeti<\/h2>/);
  assert.match(html, /<h2>Operasyon Komuta Merkezi<\/h2>/);
  assert.match(html, /<h2>Birleşik Funnel<\/h2>/);
});

test('investor-metrics page remains for deep links', () => {
  const html = read('admin-panel.html');
  assert.match(html, /id="page-investor-metrics"/);
  assert.match(html, /data-page-target="investor-metrics"/);
});

test('ADMIN_NAV_CONTRACT documents operasyon landing labels', () => {
  const doc = read('docs/ADMIN_NAV_CONTRACT.md');
  assert.match(doc, /Operasyon Özeti/);
  assert.match(doc, /Operasyon Komuta Merkezi/);
  assert.match(doc, /admin-dashboard-landing-audit/);
});
