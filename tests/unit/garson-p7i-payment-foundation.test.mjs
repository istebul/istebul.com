import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260715_garsonai_p7i_payment_foundation.sql',
);
const appPath = path.join(root, 'apps/restaurant-admin-erp/src');

test('P7-I migration defines payment foundation tables with restaurant_id', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  for (const table of [
    'payment_providers',
    'reservation_guarantees',
    'payment_transactions',
    'refund_transactions',
    'payment_policies',
    'payment_audit_logs',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${table}`, 'i'));
    assert.match(sql, new RegExp(`${table}[\\s\\S]*restaurant_id`, 'i'));
  }

  assert.match(sql, /garson_current_user_restaurant_ids/i);
  assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.payment_transactions/i);
  assert.match(sql, /pending[\s\S]*authorized[\s\S]*captured[\s\S]*released[\s\S]*refunded[\s\S]*cancelled[\s\S]*expired[\s\S]*failed/i);
});

test('P7-I migration stays additive and idempotent', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS/i);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS/i);
  assert.match(sql, /DROP POLICY IF EXISTS/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /DELETE FROM/i);
  assert.doesNotMatch(sql, /TRUNCATE/i);
});

test('P7-I ERP route, sidebar order, and payment provider strategy exist', () => {
  const app = fs.readFileSync(path.join(appPath, 'App.tsx'), 'utf8');
  const nav = fs.readFileSync(path.join(appPath, 'data/nav-config.ts'), 'utf8');
  const providersIndex = fs.readFileSync(path.join(appPath, 'lib/payments/index.ts'), 'utf8');
  const realtime = fs.readFileSync(path.join(appPath, 'hooks/usePaymentsRealtime.ts'), 'utf8');

  assert.match(app, /path="\/payments"/);
  assert.match(app, /PaymentsPage/);
  assert.match(nav, /id: 'payments'/);
  assert.match(nav, /Check-in[\s\S]*Payments[\s\S]*Menu[\s\S]*Inventory/);

  for (const provider of ['StripeProvider', 'IyzicoProvider', 'PayTRProvider', 'MockProvider']) {
    assert.match(providersIndex, new RegExp(provider));
    assert.equal(
      fs.existsSync(path.join(appPath, `lib/payments/${provider}.ts`)),
      true,
      `${provider}.ts missing`,
    );
  }

  assert.match(providersIndex, /getPaymentProvider/);
  assert.match(realtime, /garson:\$\{restaurantId\}:erp-payments/);

  const viteConfig = fs.readFileSync(
    path.join(root, 'apps/restaurant-admin-erp/vite.config.ts'),
    'utf8',
  );
  assert.match(viteConfig, /'payments'/);

  const stripe = fs.readFileSync(path.join(appPath, 'lib/payments/StripeProvider.ts'), 'utf8');
  const iyzico = fs.readFileSync(path.join(appPath, 'lib/payments/IyzicoProvider.ts'), 'utf8');
  const paytr = fs.readFileSync(path.join(appPath, 'lib/payments/PayTRProvider.ts'), 'utf8');
  for (const source of [stripe, iyzico, paytr, providersIndex]) {
    assert.doesNotMatch(source, /fetch\(/);
    assert.doesNotMatch(source, /api\.stripe\.com/i);
    assert.doesNotMatch(source, /api\.iyzipay\.com/i);
    assert.doesNotMatch(source, /www\.paytr\.com/i);
  }
});

test('P7-I payments page modules and settlement prep are present', () => {
  const page = fs.readFileSync(path.join(appPath, 'pages/PaymentsPage.tsx'), 'utf8');
  const api = fs.readFileSync(path.join(appPath, 'data/payments-api.ts'), 'utf8');
  const settlement = fs.readFileSync(path.join(appPath, 'lib/payments/settlement.ts'), 'utf8');

  assert.match(page, /PaymentsKpiBar/);
  assert.match(page, /ReservationGuaranteePanel/);
  assert.match(page, /PaymentsTransactionsTable/);
  assert.match(page, /PaymentDetailDrawer/);
  assert.match(page, /SettlementPrepPanel/);
  assert.match(api, /\.eq\('restaurant_id', restaurantId\)/);
  assert.match(settlement, /calculated: false/);
  assert.match(settlement, /Toplam Hesap/);
});
