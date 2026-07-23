import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const migrationPath = path.join(
  root,
  'supabase/migrations/20260712_garsonai_p6a_production_database_readiness.sql'
);

test('P6-A production database migration defines missing tables and tenant RLS', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.menu_categories/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.products/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.reservations/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.preorders/i);

  assert.match(sql, /ADD COLUMN IF NOT EXISTS category_id/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS stock_status/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS is_active/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS line_items/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS total/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS phone/i);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS body/i);

  assert.match(sql, /garson menu categories member read/i);
  assert.match(sql, /garson products member read/i);
  assert.match(sql, /garson reservations member read/i);
  assert.match(sql, /garson preorders member read/i);
  assert.match(sql, /garson_current_user_restaurant_ids/i);

  assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.reservations/i);
  assert.match(sql, /ALTER PUBLICATION supabase_realtime ADD TABLE public\.preorders/i);
});

test('P6-A migration stays idempotent with IF NOT EXISTS and DROP POLICY IF EXISTS', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /CREATE TABLE IF NOT EXISTS/g);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS/g);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS/g);
  assert.match(sql, /DROP POLICY IF EXISTS/g);
  assert.doesNotMatch(sql, /DROP TABLE/i);
});
