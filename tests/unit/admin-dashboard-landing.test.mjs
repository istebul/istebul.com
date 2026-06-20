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

test('loadExecutiveKpis investor metrics copy uses TR-2b labels', () => {
  const panel = read('js/admin-panel.js');
  const block = panel.match(/async function loadExecutiveKpis\(\)[\s\S]*?^async function/m)?.[0] ?? '';
  assert.ok(block.length > 0, 'loadExecutiveKpis block exists');
  assert.match(block, />Trafik &amp; gelir</);
  assert.match(block, />Sayfa görüntüleme</);
  assert.match(block, />Auto başlangıçları</);
  assert.match(block, />İlişkilendirilen gelir</);
  assert.match(block, />Kayıp sinyali</);
  assert.match(block, /dönem sonunda iptal/);
  assert.match(block, />Dönüşüm oranları</);
  assert.match(block, />Wizard tamamlama</);
  assert.match(block, />Ücretli dönüşüm</);
  assert.match(block, />Elde tutma</);
  assert.match(block, />Geri dönüş ziyaretleri</);
  assert.match(block, />Lifecycle kayıtları</);
  assert.match(block, />Partner lead kalitesi</);
  assert.match(block, /yüksek niyet \(≥70\)/);
  assert.match(block, /<th>Adım<\/th><th>Olaylar<\/th><th>Adım CR<\/th>/);
  assert.match(block, />En iyi edinim kanalları</);
  assert.match(block, /<th>Kanal<\/th><th>Leadler<\/th><th>Ücretli<\/th><th>Gelir ₺<\/th>/);
  assert.match(block, />Anlık görüntü JSON \(board export\)/);
  assert.doesNotMatch(block, />Traffic &amp; revenue</);
  assert.doesNotMatch(block, />Conversion rates</);
  assert.doesNotMatch(block, />Churn signal</);
  assert.doesNotMatch(block, />Top acquisition channels</);
  assert.doesNotMatch(block, />Snapshot JSON \(board export\)/);
});

test('TR-2b-2 platform analytics and ops command shell copy uses Turkish labels', () => {
  const panel = read('js/admin-panel.js');
  const growthBlock =
    panel.match(/function renderGrowthCommandCenter\([\s\S]*?^async function/m)?.[0] ?? '';
  assert.ok(growthBlock.length > 0, 'renderGrowthCommandCenter block exists');
  assert.match(growthBlock, />Büyüme komuta merkezi</);
  assert.match(growthBlock, />Ücretli platformlar \(P5\.1\)</);
  assert.match(growthBlock, />Edinim kanalları \(lead\)</);
  assert.doesNotMatch(growthBlock, />Growth Command Center</);
  assert.doesNotMatch(growthBlock, />Acquisition channels \(leads\)</);

  const platformBlock =
    panel.match(/async function loadPlatformAnalytics\([\s\S]*?^function bindPlatformAnalyticsToolbar/m)?.[0] ??
    '';
  assert.ok(platformBlock.length > 0, 'loadPlatformAnalytics block exists');
  assert.match(platformBlock, />Yönetici büyüme hunisi \(kanal bazlı\)</);
  assert.match(platformBlock, />Dönüşüm özeti</);
  assert.match(platformBlock, />Auto huni düşüşü</);
  assert.match(platformBlock, />Partner edinimi \(P2\)</);
  assert.match(platformBlock, />Büyüme motoru \(P1\)</);
  assert.match(platformBlock, />Gelir ilişkilendirme \(UTM\)</);
  assert.match(platformBlock, />Admin CRM sonuçları</);
  assert.doesNotMatch(platformBlock, />Executive growth funnel \(kanal bazlı\)</);
  assert.doesNotMatch(platformBlock, />Auto funnel drop-off</);

  const opsBlock =
    panel.match(/async function loadOpsCommandCenter\(\)[\s\S]*?^async function loadStartupOperatingCenter/m)?.[0] ??
    '';
  assert.ok(opsBlock.length > 0, 'loadOpsCommandCenter block exists');
  assert.match(opsBlock, />Otomasyon alanları</);
  assert.match(opsBlock, />P13 CEO uyarıları \(erken müdahale\)</);
  assert.match(opsBlock, />CEO sağlığı:/);
  assert.match(opsBlock, />Tetiklenen uyarılar</);
  assert.match(opsBlock, />Runbook'lar</);
  assert.doesNotMatch(opsBlock, />Automation domains</);
  assert.doesNotMatch(opsBlock, />Triggered alerts</);
});

test('TR-2b-2 unit economics view copy uses Turkish labels', () => {
  const views = read('js/features/investor/unit-economics-views.js');
  assert.match(views, />Birim ekonomisi \(yatırımcı modeli\)</);
  assert.match(views, />Brüt marj</);
  assert.match(views, />Dönüşüm ekonomisi</);
  assert.doesNotMatch(views, />Unit economics \(yatırımcı modeli\)</);
  assert.doesNotMatch(views, />Gross margin</);
  assert.doesNotMatch(views, />Conversion economics</);
});

test('TR-2b-3 loadOpsCommandCenter display mapping helpers localize dynamic ops copy', () => {
  const panel = read('js/admin-panel.js');
  const helperBlock =
    panel.match(/const OPS_DOMAIN_LABEL_TR[\s\S]*?function formatOpsAlertMessage\(message\)[\s\S]*?\n\}/)?.[0] ??
    '';
  assert.ok(helperBlock.length > 0, 'ops display mapping helpers exist');
  assert.match(helperBlock, /'Revenue Ops': 'Gelir operasyonları'/);
  assert.match(helperBlock, /'Customer Ops': 'Müşteri operasyonları'/);
  assert.match(helperBlock, /'Partner Ops': 'Partner operasyonları'/);
  assert.match(helperBlock, /'Analytics Automation': 'Analitik otomasyonu'/);
  assert.match(helperBlock, /'Lifecycle Automation': 'Yaşam döngüsü otomasyonu'/);
  assert.match(helperBlock, /'Operational Alerts': 'Operasyonel uyarılar'/);
  assert.match(helperBlock, /Observability: 'Gözlemlenebilirlik'/);
  assert.match(helperBlock, /healthy: 'sağlıklı'/);
  assert.match(helperBlock, /critical: 'Kritik'/);
  assert.match(helperBlock, /error: 'Hata'/);
  assert.match(helperBlock, /warning: 'Uyarı'/);
  assert.match(helperBlock, /info: 'Bilgi'/);
  assert.match(helperBlock, /'Active subs', 'Aktif abonelik'/);
  assert.match(helperBlock, /'Failed messages', 'Başarısız mesaj'/);

  const opsBlock =
    panel.match(/async function loadOpsCommandCenter\(\)[\s\S]*?^async function loadStartupOperatingCenter/m)?.[0] ??
    '';
  assert.match(opsBlock, /formatOpsDomainLabel\(d\.label\)/);
  assert.match(opsBlock, /formatOpsHighlightLine\(h\)/);
  assert.match(opsBlock, /formatOpsHealthLabel\(center\.overallHealth\)/);
  assert.match(opsBlock, /formatOpsSeverityLabel\(a\.severity\)/);
  assert.match(opsBlock, /formatOpsAlertMessage\(a\.message\)/);
  assert.match(opsBlock, /formatOpsDomainValue\(a\.domain\)/);
  assert.doesNotMatch(opsBlock, /escapeHtml\(d\.label\)/);
  assert.doesNotMatch(opsBlock, /escapeHtml\(center\.overallHealth\)/);
  assert.doesNotMatch(opsBlock, /escapeHtml\(a\.severity\)/);
  assert.doesNotMatch(opsBlock, /escapeHtml\(a\.message\)/);
});

test('TR-2b-3 loadExecutiveKpis partner KPI labels use Turkish display copy', () => {
  const panel = read('js/admin-panel.js');
  const block = panel.match(/async function loadExecutiveKpis\(\)[\s\S]*?^async function/m)?.[0] ?? '';
  assert.match(block, />Ortalama lead skoru</);
  assert.match(block, />Teslimat başarısı</);
  assert.match(block, />Partner kazanma oranı</);
  assert.match(block, />Leadler \(CRM\)</);
  assert.match(block, />Gerçekleşen pipeline</);
  assert.match(block, />Wizard tamamlama</);
  assert.match(block, />ARPU</);
  assert.doesNotMatch(block, />Avg lead score</);
  assert.doesNotMatch(block, />Dispatch success</);
  assert.doesNotMatch(block, />Partner win rate</);
  assert.doesNotMatch(block, />Pipeline realized</);
});

test('TR-2b-3 unit economics views map health and source display copy', () => {
  const views = read('js/features/investor/unit-economics-views.js');
  const renderBlock = views.match(/export function renderUnitEconomicsPanel[\s\S]*/)?.[0] ?? '';
  assert.match(views, /formatUnitEconomicsHealthMessage/);
  assert.match(views, /formatUnitEconomicsSource/);
  assert.match(views, /live: 'canlı'/);
  assert.match(views, /assumption: 'varsayım'/);
  assert.match(views, /observed: 'gözlemlenen'/);
  assert.match(views, /modeled: 'model'/);
  assert.match(views, /CAC planlama hedefi kullanıyor/);
  assert.match(views, /Brüt marj \$1% hedef bandının altında/);
  assert.match(views, /Geri ödeme \$1 ay hedef \$2 ay üzerinde/);
  assert.match(renderBlock, /formatUnitEconomicsSource\(model\.arpu\.source\)/);
  assert.match(renderBlock, /formatUnitEconomicsHealthMessage\(h\)/);
  assert.doesNotMatch(renderBlock, /escapeHtml\(model\.arpu\.source\)/);
  assert.doesNotMatch(renderBlock, /escapeHtml\(model\.supportCost\.source\)/);
  assert.doesNotMatch(renderBlock, /<li>\$\{escapeHtml\(h\)\}<\/li>/);
});
