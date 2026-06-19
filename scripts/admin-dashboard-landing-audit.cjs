#!/usr/bin/env node
/**
 * Faz 4A-1b — Admin operasyon landing terminoloji ve yönlendirme sözleşmesi.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let failed = false;

const fail = (msg) => {
  console.error(msg);
  failed = true;
};

const adminHtml = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js/admin/admin-shell.js'), 'utf8');

const OPERATION_LABELS = {
  dashboard: 'Operasyon Özeti',
  'ops-command-center': 'Operasyon Komuta Merkezi',
  'dashboard-ceo': 'CEO Özeti',
  'dashboard-growth': 'Büyüme Özeti',
  'dashboard-revenue': 'Gelir Özeti',
  'dashboard-support': 'Destek Özeti',
  'dashboard-partner-ops': 'Partner Operasyon Özeti',
  'unified-funnel': 'Birleşik Funnel'
};

for (const [pageId, label] of Object.entries(OPERATION_LABELS)) {
  const quotedKey = `'${pageId}'`;
  if (!shell.includes(`${quotedKey}: '${label}'`) && !shell.includes(`${pageId}: '${label}'`)) {
    fail(`NAV_LABELS must map ${pageId} → ${label}`);
  }
  if (!adminHtml.includes(`>${label}<`)) {
    fail(`admin-panel.html must surface label ${label} for ${pageId}`);
  }
}

if (shell.includes("dashboard: 'Dashboard'")) {
  fail('NAV_LABELS must not use legacy Dashboard label for landing');
}
if (adminHtml.includes('>Dashboard<')) {
  fail('admin nav must not show legacy Dashboard label');
}
if (adminHtml.includes('Operasyon merkezi')) {
  fail('landing must use Operasyon Özeti, not Operasyon merkezi');
}
if (!adminHtml.includes('id="page-dashboard"')) {
  fail('page-dashboard must exist');
}
const dashBlock = adminHtml.match(/id="page-dashboard"[\s\S]*?id="page-dashboard-ceo"/);
if (!dashBlock) {
  fail('page-dashboard block missing');
} else {
  const block = dashBlock[0];
  for (const target of [
    'ops-command-center',
    'unified-funnel',
    'dashboard-partner-ops'
  ]) {
    if (!block.includes(`data-page-target="${target}"`)) {
      fail(`landing must link to ${target}`);
    }
  }
  if (!block.includes('href="/admin/ai-listings/"')) {
    fail('landing must link to AI İlan Yönetimi (/admin/ai-listings/)');
  }
  if (!block.includes('örnek görsel') && !block.includes('Örnek')) {
    fail('landing charts must disclose sample/placeholder visuals');
  }
  if (!block.includes('Operasyon panelleri')) {
    fail('landing must include Operasyon panelleri CTA section');
  }
  if (block.includes('canlı özet') && !block.includes('CRM KPI özeti')) {
    fail('landing must not claim generic live summary without CRM/panel guidance');
  }
}

if (!adminHtml.includes('id="page-investor-metrics"')) {
  fail('investor-metrics page must remain for deep links');
}

/** Faz 4A-1b-3A — statik operasyon/analitik page h2 ↔ NAV_LABELS */
const STATIC_PAGE_HEADERS = {
  'ops-ai-assistant': 'Ops asistan',
  observability: 'Gözlemlenebilirlik',
  'platform-analytics': 'Platform analitik',
  'auto-analytics': 'Auto analitik'
};

for (const [pageId, label] of Object.entries(STATIC_PAGE_HEADERS)) {
  const quotedKey = `'${pageId}'`;
  if (!shell.includes(`${quotedKey}: '${label}'`) && !shell.includes(`${pageId}: '${label}'`)) {
    fail(`NAV_LABELS must map ${pageId} → ${label}`);
  }
  if (!adminHtml.includes(`id="page-${pageId}"`)) {
    fail(`admin-panel.html missing page-${pageId}`);
  }
  const pageBlock = adminHtml.match(
    new RegExp(`id="page-${pageId.replace(/-/g, '\\-')}"[\\s\\S]*?id="page-`)
  );
  if (!pageBlock) {
    fail(`page-${pageId} block missing`);
  } else if (!pageBlock[0].includes(`<h2>${label}</h2>`)) {
    fail(`page-${pageId} h2 must be ${label} (aligned with nav/NAV_LABELS)`);
  }
}

for (const legacy of [
  '<h2>AI Ops Decision Assistant</h2>',
  '<h2>Production Observability</h2>',
  '<h2>Platform Analytics</h2>',
  '<h2>Auto Analytics</h2>'
]) {
  if (adminHtml.includes(legacy)) {
    fail(`admin-panel.html must not use legacy h2 ${legacy}`);
  }
}

if (failed) process.exit(1);
console.log('admin-dashboard-landing-audit OK');
