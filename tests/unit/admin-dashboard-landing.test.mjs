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
  assert.match(block, /AI İlan Yönetimi/);
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

test('operation and analytics page headings stay aligned with nav labels', () => {
  const html = read('admin-panel.html');
  assert.match(html, /<h2>Ops asistan<\/h2>/);
  assert.match(html, /<h2>Gözlemlenebilirlik<\/h2>/);
  assert.match(html, /<h2>Ödemeler<\/h2>/);
  assert.match(html, /<h2>Platform analitik<\/h2>/);
  assert.match(html, /<h2>Auto analitik<\/h2>/);
  assert.doesNotMatch(html, /<h2>AI Ops Decision Assistant<\/h2>/);
  assert.doesNotMatch(html, /<h2>Production Observability<\/h2>/);
  assert.doesNotMatch(html, /<h2>Platform Analytics<\/h2>/);
  assert.doesNotMatch(html, /<h2>Auto Analytics<\/h2>/);
  assert.doesNotMatch(html, /<h2>Observability<\/h2>/);
  assert.doesNotMatch(html, /<h2>Payments<\/h2>/);
});

test('operasyon yüzeyi TR-1 labels in shell and dashboard landing', () => {
  const shell = read('js/admin/admin-shell.js');
  assert.match(shell, /payments:\s*'Ödemeler'/);
  assert.match(shell, /observability:\s*'Gözlemlenebilirlik'/);
  assert.doesNotMatch(shell, /payments:\s*'Payments'/);
  assert.doesNotMatch(shell, /observability:\s*'Observability'/);

  const html = read('admin-panel.html');
  const block = landingBlock(html);
  assert.match(block, /Dönüşüm oranı/);
  assert.doesNotMatch(block, /Conversion rate/);
  assert.match(html, /title="Gözlemlenebilirlik"/);
  assert.match(html, /<span class="nav-label">Ödemeler<\/span>/);
  assert.match(html, /<span class="nav-label">Gözlemlenebilirlik<\/span>/);
});

test('loadOperationalHealth observability copy uses TR-1 stat labels', () => {
  const panel = read('js/admin-panel.js');
  const block = panel.match(/async function loadOperationalHealth\(\)[\s\S]*?^async function/m)?.[0] ?? '';
  assert.ok(block.length > 0, 'loadOperationalHealth block exists');
  assert.match(block, /Kritik \(24s\)/);
  assert.match(block, /Hatalar \(24s\)/);
  assert.match(block, /Uyarılar \(24s\)/);
  assert.match(block, /Öne çıkan sinyaller \(24s özet\)/);
  assert.match(block, /Son kritik \/ hata olayları/);
  assert.match(block, /Lead teslimat hataları/);
  assert.match(block, /Partner webhook hataları \(log\)/);
  assert.doesNotMatch(block, /Critical \(24h\)/);
  assert.doesNotMatch(block, /Top signals \(24h rollup\)/);
});

test('dashboard system alerts KPI is wired to operational_events rollup', () => {
  const panel = read('js/admin-panel.js');
  assert.doesNotMatch(panel, /setStat\(\s*['"]stat-system-alerts['"]\s*,\s*['"]0['"]\s*\)/);
  assert.match(panel, /refreshDashboardSystemAlerts/);
  assert.match(panel, /applyDashboardSystemAlerts/);
  assert.match(panel, /sumCriticalErrorAlertCount/);
  assert.match(panel, /rollupSeverity24h/);
  assert.match(panel, /table:\s*['"]operational_events['"]/);
  assert.match(panel, /await refreshDashboardSystemAlerts\(\)/);
});

test('dashboard KPI and notify badge share applyDashboardSystemAlerts helper', () => {
  const panel = read('js/admin-panel.js');
  const helperBlock = panel.match(/function applyDashboardSystemAlerts[\s\S]*?\n\}/)?.[0] ?? '';
  assert.ok(helperBlock.length > 0, 'applyDashboardSystemAlerts helper exists');
  assert.match(helperBlock, /stat-system-alerts/);
  assert.match(helperBlock, /admin-notify-badge/);
  assert.match(helperBlock, /badgeEl\.hidden = false/);
  assert.match(helperBlock, /badgeEl\.hidden = true/);
});

test('admin notify badge defaults to hidden in shell HTML', () => {
  const html = read('admin-panel.html');
  assert.match(html, /id="admin-notify-badge"[^>]*hidden/);
});

test('TR-2a CRM and partner page headings align with nav labels', () => {
  const html = read('admin-panel.html');
  const shell = read('js/admin/admin-shell.js');
  const pairs = [
    ['settings', 'Ayarlar'],
    ['vertical-leads', 'Dikey leadler'],
    ['vacation-destinations', 'Destinasyon Yönetimi'],
    ['vacation-partners', 'Partner Yönetimi'],
    ['vacation-scoring', 'AI Prompt / Scoring'],
    ['housing-leads', 'Konut Leadleri'],
    ['housing-locations', 'Lokasyon Yönetimi'],
    ['content', 'Sayfa içerikleri'],
    ['partner-endpoints', 'Partner kanalları'],
    ['partner-applications', 'Başvurular'],
    ['partner-dispatch-logs', 'Teslimat logları']
  ];
  for (const [pageId, label] of pairs) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const navPattern = pageId.includes('-')
      ? new RegExp(`'${pageId}':\\s*'${escapedLabel}'`)
      : new RegExp(`${pageId}:\\s*'${escapedLabel}'`);
    assert.match(shell, navPattern, `NAV_LABELS maps ${pageId} → ${label}`);
    const pageBlock = html.match(
      new RegExp(`id="page-${pageId.replace(/-/g, '\\-')}"[\\s\\S]*?id="page-`)
    );
    assert.ok(pageBlock, `page-${pageId} block exists`);
    assert.match(pageBlock[0], new RegExp(`<h2>${escapedLabel}<\\/h2>`));
  }
  assert.doesNotMatch(html, /<h2>Partner Endpoints<\/h2>/);
  assert.doesNotMatch(html, /<h2>Site Bilgileri<\/h2>/);
});

test('loadOperationalHealth observability table headers use TR-2a labels', () => {
  const panel = read('js/admin-panel.js');
  const block = panel.match(/async function loadOperationalHealth\(\)[\s\S]*?^async function/m)?.[0] ?? '';
  assert.match(block, /<th>Kaynak<\/th><th>Detay<\/th>/);
  assert.match(block, /<th>Aktör<\/th><th>İşlem<\/th><th>Varlık<\/th><th>Özet<\/th>/);
  assert.match(block, /<th>Rota<\/th><th>Uç nokta<\/th><th>HTTP<\/th>/);
  assert.doesNotMatch(block, /<th>Source<\/th>/);
  assert.doesNotMatch(block, /<th>Actor<\/th>/);
});

test('payments admin page does not expose raw TODO text', () => {
  const payments = read('js/admin/payments-admin.js');
  assert.doesNotMatch(payments, /TODO:/);
  assert.match(payments, /Partner self-servis kontör satın alma paneli/);
});
