import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const app = path.join(root, 'apps/restaurant-customer-cx/src');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260716_garsonai_p7j_customer_experience_foundation.sql',
);

test('P7-J CX app exposes /r/{slug} customer journey modules', () => {
  const appTsx = fs.readFileSync(path.join(app, 'App.tsx'), 'utf8');
  const page = fs.readFileSync(path.join(app, 'pages/RestaurantCxPage.tsx'), 'utf8');
  const journey = fs.readFileSync(path.join(app, 'lib/journey.ts'), 'utf8');
  const api = fs.readFileSync(path.join(app, 'data/cx-api.ts'), 'utf8');
  const realtime = fs.readFileSync(path.join(app, 'hooks/useCxRealtime.ts'), 'utf8');

  assert.match(appTsx, /basename="\/r"/);
  assert.match(appTsx, /:restaurantSlug/);
  assert.match(page, /LandingStep/);
  assert.match(page, /ConciergeStep/);
  assert.match(page, /TableStep/);
  assert.match(page, /MenuStep/);
  assert.match(page, /PreorderStep/);
  assert.match(page, /GuaranteeStep/);
  assert.match(page, /SummaryStep/);
  assert.match(page, /ConfirmationStep/);
  assert.match(journey, /landing[\s\S]*concierge[\s\S]*date[\s\S]*table[\s\S]*confirmation/);
  assert.match(api, /\.eq\('restaurant_id', restaurantId\)/);
  assert.match(api, /\.eq\('slug', normalized\)/);
  assert.match(realtime, /restaurant_tables/);
  assert.match(realtime, /reservations/);
  assert.match(realtime, /garson:\$\{restaurantId\}:cx-experience/);
});

test('P7-J migration adds public CX policies without DROP TABLE', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /garson cx public restaurant read/i);
  assert.match(sql, /garson cx public tables read/i);
  assert.match(sql, /garson cx public menu items read/i);
  assert.match(sql, /garson cx public reservation insert/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS cover_image_url/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS reservation_id/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /DELETE FROM/i);
});

test('P7-J build wiring and P6 production sources remain untouched markers', () => {
  const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
  const buildScript = fs.readFileSync(
    path.join(root, 'scripts/build-restaurant-customer-cx.cjs'),
    'utf8',
  );
  const prodBuild = fs.readFileSync(path.join(root, 'scripts/production-build.cjs'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.cjs'), 'utf8');
  const panel = fs.readFileSync(path.join(root, 'garson/panel/index.html'), 'utf8');

  assert.match(pkg, /build:cx/);
  assert.match(pkg, /dev:cx/);
  assert.match(pkg, /restaurant-customer-cx/);
  assert.match(buildScript, /dist\/r/);
  // Must preserve production-hashed /r/onay — never re-copy source HTML over dist
  assert.match(buildScript, /Preserve production-build output under dist\/r\/onay/);
  assert.doesNotMatch(
    buildScript,
    /copyFileSync\(path\.join\(onaySource/,
  );
  assert.match(prodBuild, /build-restaurant-customer-cx\.cjs/);
  assert.match(prodBuild, /r\/onay\/index\.html/);
  assert.match(server, /dist.*r.*index\.html|cxIndex|Customer CX/i);
  assert.match(panel, /GarsonAI|garson/i);
});

test('P7-J AI concierge is placeholder without LLM network calls', () => {
  const concierge = fs.readFileSync(path.join(app, 'components/cx/ConciergeStep.tsx'), 'utf8');
  assert.match(concierge, /Merhaba/);
  assert.match(concierge, /Placeholder|LLM/i);
  assert.doesNotMatch(concierge, /openai|anthropic|fetch\(/i);
});
