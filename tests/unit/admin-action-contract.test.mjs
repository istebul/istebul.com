import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function extractListTables(source) {
  const match = source.match(/const listTables = \[([\s\S]*?)\];/);
  assert.ok(match, 'listTables block exists');
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

describe('admin-action contract', () => {
  it('includes moat and payment tables for admin panel reads', () => {
    const source = fs.readFileSync(
      path.join(root, 'supabase/functions/admin-action/index.ts'),
      'utf8'
    );
    const tables = extractListTables(source);
    for (const table of [
      'product_feedback',
      'decision_feedback',
      'outcome_signal_events',
      'payment_orders',
      'partner_lead_dispatch_logs',
      'partner_applications'
    ]) {
      assert.ok(tables.includes(table), `listTables includes ${table}`);
    }
  });

  it('returns structured 400 for invalid order column', () => {
    const source = fs.readFileSync(
      path.join(root, 'supabase/functions/admin-action/index.ts'),
      'utf8'
    );
    assert.match(source, /Invalid order column/);
    assert.match(source, /allowed:/);
  });

  it('exposes partner application CRM admin actions', () => {
    const source = fs.readFileSync(
      path.join(root, 'supabase/functions/admin-action/index.ts'),
      'utf8'
    );
    for (const action of [
      'listPartnerApplications',
      'createPartnerApplication',
      'updatePartnerApplication',
      'archivePartnerApplication',
      'togglePartnerApplicationActive'
    ]) {
      assert.match(source, new RegExp(`"${action}"`));
    }
    assert.match(source, /is_archived: true/);
    assert.match(source, /buildPartnerApplicationRow/);
  });
});

describe('admin panel route contract', () => {
  it('registers unified funnel and vertical leads pages', () => {
    const routing = fs.readFileSync(
      path.join(root, 'js/admin/admin-page-routing.js'),
      'utf8'
    );
    assert.match(routing, /'unified-funnel'/);
    assert.match(routing, /'vertical-leads'/);
    assert.match(routing, /'partner-applications'/);
  });

  it('partner applications CRM migration adds soft-archive fields', () => {
    const sql = fs.readFileSync(
      path.join(
        root,
        'supabase/migrations/20260618_partner_applications_crm_v1.sql'
      ),
      'utf8'
    );
    assert.match(sql, /is_archived boolean/);
    assert.match(sql, /is_active boolean/);
    assert.match(sql, /'inactive'/);
  });

  it('partner applications admin module is wired', () => {
    const panel = fs.readFileSync(path.join(root, 'js/admin-panel.js'), 'utf8');
    assert.match(panel, /partner-applications-admin\.js/);
    assert.match(panel, /initPartnerApplicationsShell/);
    const module = fs.readFileSync(
      path.join(root, 'js/admin/partner-applications-admin.js'),
      'utf8'
    );
    assert.match(module, /listPartnerApplications/);
    assert.match(module, /archivePartnerApplication/);
    assert.match(module, /İlk Temas/);
    assert.match(module, /partner-applications-filter-category/);
    assert.match(module, /partner-applications-search/);
  });
});
