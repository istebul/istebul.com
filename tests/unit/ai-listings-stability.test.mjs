import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const migrationPath = path.join(root, 'supabase/migrations/20260701_ai_listings_engine_v1.sql');
const edgeIndexPath = path.join(root, 'supabase/functions/ai-listings/index.ts');
const adminHtmlPath = path.join(root, 'admin/ai-listings.html');
const adminCorePath = path.join(root, 'js/admin/ai-listings-admin-core.js');

const { authorizeRequest, isAiListingsModuleEnabled } = await import(
  '../../supabase/functions/_shared/ai-listings/auth.js'
);
const { SECRET_HEADER } = await import('../../supabase/functions/_shared/ai-listings/auth.js');
const {
  ADMIN_ENABLE_KEY,
  buildEdgeRequestHeaders,
  getAdminPanelState,
  isAdminPanelEnabled
} = await import('../../js/admin/ai-listings-admin-core.js');

test('migration filename order places ai_listings after prior migrations', () => {
  const migrationsDir = path.join(root, 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
  const aiListingsIdx = files.indexOf('20260701_ai_listings_engine_v1.sql');
  const listingAnalysisIdx = files.indexOf('20260605_listing_analysis_v1.sql');

  assert.ok(aiListingsIdx >= 0, 'ai listings migration must exist');
  assert.ok(listingAnalysisIdx >= 0, 'listing analysis migration must exist');
  assert.ok(aiListingsIdx > listingAnalysisIdx, 'ai listings migration must run after listing analysis');
});

test('migration uses idempotent-safe DDL patterns', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS/i);
  assert.match(sql, /DROP POLICY IF EXISTS/i);
  assert.match(sql, /DROP TRIGGER IF EXISTS/i);
});

test('migration creates only ai_listings tables and does not alter existing tables', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.doesNotMatch(sql, /ALTER TABLE public\.(?!ai_listing)/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listings/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listing_analyses/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.ai_listing_events/i);
});

test('migration RLS denies anon/authenticated and grants service_role', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /TO anon, authenticated[\s\S]*USING \(false\)/i);
  assert.match(sql, /TO service_role[\s\S]*USING \(true\)/i);
  assert.match(sql, /REVOKE ALL ON public\.ai_listings FROM anon, authenticated/i);
});

test('edge function uses only SUPABASE_SERVICE_ROLE_KEY', () => {
  const source = fs.readFileSync(edgeIndexPath, 'utf8');
  assert.match(source, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(source, /SUPABASE_ANON_KEY/i);
  assert.doesNotMatch(source, /Deno\.env\.get\(["']SUPABASE_ANON/i);
});

test('edge auth requires module enabled and x-ai-listings-secret', async () => {
  const disabled = authorizeRequest(
    new Request('https://example.com', { headers: { [SECRET_HEADER]: 'secret' } }),
    { AI_LISTINGS_SUPABASE_ENABLED: 'false', AI_LISTINGS_EDGE_SECRET: 'secret' }
  );
  assert.equal(disabled.ok, false);
  if (!disabled.ok) assert.equal(disabled.status, 503);

  const missingSecret = authorizeRequest(
    new Request('https://example.com'),
    { AI_LISTINGS_SUPABASE_ENABLED: 'true', AI_LISTINGS_EDGE_SECRET: 'expected' }
  );
  assert.equal(missingSecret.ok, false);
  if (!missingSecret.ok) assert.equal(missingSecret.status, 401);

  const ok = authorizeRequest(
    new Request('https://example.com', { headers: { [SECRET_HEADER]: 'expected' } }),
    { AI_LISTINGS_SUPABASE_ENABLED: 'true', AI_LISTINGS_EDGE_SECRET: 'expected' }
  );
  assert.equal(ok.ok, true);
  assert.equal(isAiListingsModuleEnabled({ AI_LISTINGS_SUPABASE_ENABLED: 'true' }), true);
});

test('admin panel requires localStorage gate and never hardcodes secret', () => {
  const core = fs.readFileSync(adminCorePath, 'utf8');
  assert.match(core, /ADMIN_ENABLE_KEY/);
  assert.doesNotMatch(core, /AI_LISTINGS_EDGE_SECRET\s*=\s*['"][^'"]+['"]/);
  assert.equal(isAdminPanelEnabled({ getItem: () => null }), false);
  assert.equal(getAdminPanelState({ getItem: (key) => (key === ADMIN_ENABLE_KEY ? 'on' : null) }), 'no-secret');

  const headers = buildEdgeRequestHeaders('');
  assert.equal(headers[SECRET_HEADER], undefined);
});

test('bundle budget excludes isolated AI Listings admin runtime from main SPA', () => {
  const analyzeSource = fs.readFileSync(path.join(root, 'scripts/analyze-bundle.cjs'), 'utf8');
  assert.match(analyzeSource, /assets\\\/ai-listings-admin-runtime\\\//);
  assert.match(analyzeSource, /css\\\/admin-ai-listings/);
});

test('admin page has robots noindex and no public HTML links reference it', () => {
  const adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
  assert.match(adminHtml, /noindex/i);

  const htmlFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.html') && full !== adminHtmlPath) {
        htmlFiles.push(full);
      }
    }
  }
  walk(root);

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      content,
      /admin\/ai-listings\.html/i,
      `${path.relative(root, file)} must not link to admin/ai-listings.html`
    );
  }
});
