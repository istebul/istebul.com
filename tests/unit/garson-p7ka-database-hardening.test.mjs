import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260717_garsonai_p7ka_production_database_hardening.sql',
);
const cxApiPath = path.join(root, 'apps/restaurant-customer-cx/src/data/cx-api.ts');
const cxSupabasePath = path.join(root, 'apps/restaurant-customer-cx/src/lib/supabase.ts');

test('P7-KA migration removes open anon reservation read and adds token architecture', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /DROP POLICY IF EXISTS "garson cx public reservations read"/i);
  assert.match(sql, /access_token/i);
  assert.match(sql, /reservation_request_token/i);
  assert.match(sql, /garson cx reservation token read/i);
  assert.match(sql, /x-garson-reservation-token/i);
  assert.match(sql, /garson_cx_get_reservation_by_access_token/i);
  assert.match(sql, /reservations_access_token_uidx/i);
  assert.match(sql, /reservations_request_token_uidx/i);
  assert.doesNotMatch(sql, /CREATE POLICY "garson cx public reservations read"/i);
});

test('P7-KA hardens anon inserts and adds cross-tenant integrity triggers', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /guest_count BETWEEN 1 AND 30/i);
  assert.match(sql, /status IN \('pending', 'confirmed'\)/i);
  assert.match(sql, /garson_enforce_reservation_tables_tenant/i);
  assert.match(sql, /garson_enforce_waitlist_tenant/i);
  assert.match(sql, /garson_enforce_orders_table_tenant/i);
  assert.match(sql, /garson_enforce_inventory_category_tenant/i);
  assert.match(sql, /garson_enforce_payment_transactions_tenant/i);
  assert.match(sql, /garson_tenant_integrity/i);
});

test('P7-KA adds updated_at triggers, indexes, payment uniques, guarantee status sync', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /garson_set_updated_at/i);
  assert.match(sql, /reservations_restaurant_date_status_idx/i);
  assert.match(sql, /payment_transactions_provider_tx_unique/i);
  assert.match(sql, /payment_policies_one_active_per_restaurant/i);
  assert.match(sql, /reservation_guarantees_status_check/i);
  assert.match(sql, /'refunded'[\s\S]*'cancelled'[\s\S]*'expired'/i);
  assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE/i);
  assert.doesNotMatch(sql, /DROP TABLE/i);
  assert.doesNotMatch(sql, /DELETE FROM/i);
  assert.doesNotMatch(sql, /TRUNCATE/i);
});

test('P7-KA CX security wiring uses reservation access token header (no UI screen changes)', () => {
  const api = fs.readFileSync(cxApiPath, 'utf8');
  const supabase = fs.readFileSync(cxSupabasePath, 'utf8');

  assert.match(supabase, /x-garson-reservation-token/);
  assert.match(supabase, /getSupabaseClientWithReservationToken/);
  assert.match(supabase, /createReservationAccessToken/);
  assert.match(api, /access_token:\s*accessToken/);
  assert.match(api, /reservation_request_token:\s*requestToken/);
  assert.match(api, /getSupabaseClientWithReservationToken/);
});
