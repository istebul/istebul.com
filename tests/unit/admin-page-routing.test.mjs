import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const {
  ADMIN_PAGE_IDS,
  ADMIN_PATH_ALIASES,
  resolveAdminPageFromPath
} = await import('../../js/admin/admin-page-routing.js');

function parseNavTargets(html) {
  const navBlockMatch = html.match(/<nav[^>]*id="admin-nav"[\s\S]*?<\/nav>/);
  assert.ok(navBlockMatch, '#admin-nav block exists');
  return [...new Set([...navBlockMatch[0].matchAll(/data-page-target="([^"]+)"/g)].map((m) => m[1]))];
}

function parseNavLabels(shellSrc) {
  const match = shellSrc.match(/const NAV_LABELS = \{([\s\S]*?)\};/);
  assert.ok(match, 'NAV_LABELS block exists');
  const block = match[1];
  const keys = new Set();
  for (const m of block.matchAll(/'([a-z0-9-]+)'\s*:/g)) keys.add(m[1]);
  for (const m of block.matchAll(/^[\t ]*([a-z][a-z0-9-]*)\s*:/gm)) keys.add(m[1]);
  return [...keys];
}

test('ADMIN_PAGE_IDS matches admin sidebar nav targets exactly', () => {
  const html = fs.readFileSync(path.join(root, 'admin-panel.html'), 'utf8');
  const navTargets = parseNavTargets(html);
  assert.deepEqual([...ADMIN_PAGE_IDS].sort(), [...navTargets].sort());
});

test('ADMIN_PAGE_IDS includes previously drifted pages', () => {
  for (const id of ['home-news', 'vertical-leads', 'unified-funnel']) {
    assert.ok(ADMIN_PAGE_IDS.includes(id), `ADMIN_PAGE_IDS includes ${id}`);
  }
});

test('NAV_LABELS covers every ADMIN_PAGE_IDS entry', () => {
  const shell = fs.readFileSync(path.join(root, 'js/admin/admin-shell.js'), 'utf8');
  const labelKeys = parseNavLabels(shell);
  for (const id of ADMIN_PAGE_IDS) {
    assert.ok(labelKeys.includes(id), `NAV_LABELS includes ${id}`);
  }
});

test('Karar terminology: listings label is Karar Seçenekleri in shell', () => {
  const shell = fs.readFileSync(path.join(root, 'js/admin/admin-shell.js'), 'utf8');
  assert.match(shell, /listings:\s*'Karar Seçenekleri'/);
  assert.doesNotMatch(shell, /listings:\s*'İlan \/ Ürünler'/);
});

test('decision-center path alias resolves to ops-ai-assistant', () => {
  assert.equal(ADMIN_PATH_ALIASES['decision-center'], 'ops-ai-assistant');
  assert.equal(resolveAdminPageFromPath('/admin/decision-center'), 'ops-ai-assistant');
  assert.equal(resolveAdminPageFromPath('/admin/listings'), 'listings');
  assert.ok(!ADMIN_PAGE_IDS.includes('decision-center'));
});

test('ai-listings source headers no longer claim absent admin nav link', () => {
  for (const rel of ['js/admin/ai-listings-admin.js', 'js/admin/ai-listings-admin-core.js']) {
    const src = fs.readFileSync(path.join(root, rel), 'utf8');
    assert.doesNotMatch(src, /Not linked from homepage, categories, or admin nav/i);
    assert.doesNotMatch(src, /INTERNAL TEST ONLY/i);
    assert.match(src, /AI İlan Yönetimi|\/admin\/ai-listings\//);
  }
});

test('ADMIN_NAV_CONTRACT doc documents Karar terminology split', () => {
  const doc = fs.readFileSync(path.join(root, 'docs/ADMIN_NAV_CONTRACT.md'), 'utf8');
  assert.match(doc, /Karar Seçenekleri/);
  assert.match(doc, /AI İlan Yönetimi/);
  assert.match(doc, /ADMIN_PAGE_IDS/);
  assert.match(doc, /ops-ai-assistant/);
});
