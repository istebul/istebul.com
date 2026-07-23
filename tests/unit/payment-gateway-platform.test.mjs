/**
 * P8-E Payment Gateway — scaffold / additive guards.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PKG = path.join(ROOT, 'src/payment-gateway');
const MIGRATION = path.join(
  ROOT,
  'supabase/migrations/20260718_garsonai_p8e_payment_gateway.sql',
);

function walkTsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkTsFiles(full));
    else if (name.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('P8-E Payment Gateway platform scaffold', () => {
  it('creates required package files', () => {
    const required = [
      'index.ts',
      'types.ts',
      'package.json',
      'tsconfig.json',
      'README.md',
      'providers/provider-factory.ts',
      'providers/MockGatewayProvider.ts',
      'providers/StripeGatewayProvider.ts',
      'providers/IyzicoGatewayProvider.ts',
      'providers/PayTRGatewayProvider.ts',
      'guarantee/GuaranteeCalculator.ts',
      'lifecycle/PaymentLifecycle.ts',
      'config/GatewayConfigStore.ts',
      'checkin/CheckInSettlement.ts',
      'webhooks/ProviderWebhookRouter.ts',
      'webhooks/StripeWebhookHandler.ts',
      'webhooks/IyzicoWebhookHandler.ts',
      'webhooks/PayTRWebhookHandler.ts',
      'services/PaymentGatewayService.ts',
      'services/ConciergePaymentBridge.ts',
      'realtime/channels.ts',
    ];
    for (const rel of required) {
      assert.ok(statSync(path.join(PKG, rel)).isFile(), `missing ${rel}`);
    }
    assert.ok(statSync(path.join(ROOT, 'docs/P8E_PAYMENT_GATEWAY.md')).isFile());
  });

  it('migration defines gateway tables without DROP TABLE', () => {
    const sql = readFileSync(MIGRATION, 'utf8');
    for (const table of [
      'payment_gateway_configs',
      'payment_authorizations',
      'payment_webhooks',
      'payment_provider_events',
      'payment_settlements',
    ]) {
      assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'));
      assert.match(sql, new RegExp(`${table}[\\s\\S]*restaurant_id`, 'i'));
    }
    assert.match(sql, /CREATE TABLE IF NOT EXISTS/i);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS/i);
    assert.doesNotMatch(sql, /^\s*DROP TABLE/im);
    assert.doesNotMatch(sql, /^\s*DELETE FROM/im);
    assert.doesNotMatch(sql, /^\s*TRUNCATE/im);
  });

  it('ERP route payment-gateways and CX journey steps exist', () => {
    const app = readFileSync(
      path.join(ROOT, 'apps/restaurant-admin-erp/src/App.tsx'),
      'utf8',
    );
    const nav = readFileSync(
      path.join(ROOT, 'apps/restaurant-admin-erp/src/data/nav-config.ts'),
      'utf8',
    );
    const journey = readFileSync(
      path.join(ROOT, 'apps/restaurant-customer-cx/src/lib/journey.ts'),
      'utf8',
    );
    const vite = readFileSync(
      path.join(ROOT, 'apps/restaurant-admin-erp/vite.config.ts'),
      'utf8',
    );

    assert.match(app, /path="\/payment-gateways"/);
    assert.match(app, /PaymentGatewaysPage/);
    assert.match(nav, /id: 'payment-gateways'/);
    assert.match(nav, /href: '\/payment-gateways'/);
    assert.match(vite, /'payment-gateways'/);
    assert.match(journey, /'payment'/);
    assert.match(journey, /'authorization'/);
    assert.match(journey, /guarantee[\s\S]*payment[\s\S]*authorization[\s\S]*summary/);
  });

  it('realtime channel naming is payment-gateway', () => {
    const channels = readFileSync(path.join(PKG, 'realtime/channels.ts'), 'utf8');
    assert.match(channels, /garson:\$\{restaurantId\}:payment-gateway/);
  });

  it('does not import P6 production panels or live provider hosts', () => {
    for (const file of walkTsFiles(PKG)) {
      const src = readFileSync(file, 'utf8');
      assert.doesNotMatch(src, /garson\/panel/);
      assert.doesNotMatch(src, /js\/restoran/);
      assert.doesNotMatch(src, /api\.stripe\.com/i);
      assert.doesNotMatch(src, /api\.iyzipay\.com/i);
      assert.doesNotMatch(src, /www\.paytr\.com/i);
      assert.doesNotMatch(src, /fetch\(/);
    }
  });

  it('typechecks via tsc project', () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, 'node_modules/typescript/bin/tsc'),
        '-p',
        path.join(PKG, 'tsconfig.json'),
        '--noEmit',
      ],
      { encoding: 'utf8', cwd: ROOT },
    );
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
});
