import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const migrationPath = path.join(root, 'supabase/migrations/20260708_garsonai_tenant_foundation.sql');

const {
  DEMO_RESTAURANT_SLUG,
  formatRestaurantRoleLabel,
  isDemoRestaurantSlug,
  normalizeRestaurantRole,
  normalizeRestaurantSettings,
  normalizeRestaurantTenant,
  normalizeRestaurantUser
} = await import('../../js/restoran/tenant.js');

test('tenant foundation migration exists with required tables', () => {
  assert.equal(fs.existsSync(migrationPath), true);
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.restaurants/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.restaurant_users/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.restaurant_settings/i);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(sql, /restaurant_users/i);
});

test('migration seeds demo-cafe tenant slug', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  assert.match(sql, /'demo-cafe'/);
  assert.match(sql, /Demo Cafe/i);
});

test('normalizeRestaurantTenant maps restaurant fields', () => {
  const tenant = normalizeRestaurantTenant({
    id: 'a0000000-0000-4000-8000-00000000cafe',
    name: 'Demo Cafe',
    slug: 'demo-cafe',
    status: 'active',
    plan: 'pilot',
    onboarding_status: 'completed',
    created_at: '2026-07-08T12:00:00Z'
  });

  assert.equal(tenant.id, 'a0000000-0000-4000-8000-00000000cafe');
  assert.equal(tenant.name, 'Demo Cafe');
  assert.equal(tenant.slug, 'demo-cafe');
  assert.equal(tenant.status, 'active');
  assert.equal(tenant.plan, 'pilot');
  assert.equal(tenant.onboardingStatus, 'completed');
  assert.equal(tenant.createdAt, '2026-07-08T12:00:00Z');
});

test('normalizeRestaurantTenant handles nested restaurant wrapper', () => {
  const tenant = normalizeRestaurantTenant({
    data: {
      restaurant: {
        id: 'r-1',
        name: 'Kıyı Balık',
        slug: 'kiyi-balik',
        status: 'pending'
      }
    }
  });

  assert.equal(tenant.id, 'r-1');
  assert.equal(tenant.slug, 'kiyi-balik');
  assert.equal(tenant.status, 'pending');
  assert.equal(tenant.plan, 'starter');
});

test('normalizeRestaurantSettings defaults feature flags to false', () => {
  const settings = normalizeRestaurantSettings({
    id: 's-1',
    restaurant_id: 'r-1'
  });

  assert.equal(settings.id, 's-1');
  assert.equal(settings.restaurantId, 'r-1');
  assert.equal(settings.whatsappEnabled, false);
  assert.equal(settings.preorderEnabled, false);
  assert.equal(settings.kitchenEnabled, false);
  assert.equal(settings.aiEnabled, false);
});

test('normalizeRestaurantSettings maps snake_case and camelCase flags', () => {
  const settings = normalizeRestaurantSettings({
    restaurantId: 'r-2',
    whatsapp_enabled: true,
    preorderEnabled: 1,
    kitchen_enabled: 'true',
    aiEnabled: false
  });

  assert.equal(settings.restaurantId, 'r-2');
  assert.equal(settings.whatsappEnabled, true);
  assert.equal(settings.preorderEnabled, true);
  assert.equal(settings.kitchenEnabled, true);
  assert.equal(settings.aiEnabled, false);
});

test('normalizeRestaurantRole maps owner admin kitchen', () => {
  assert.equal(normalizeRestaurantRole('owner'), 'owner');
  assert.equal(normalizeRestaurantRole('ADMIN'), 'admin');
  assert.equal(normalizeRestaurantRole('kitchen'), 'kitchen');
  assert.equal(normalizeRestaurantRole('waiter'), 'admin');
});

test('formatRestaurantRoleLabel returns Turkish labels', () => {
  assert.equal(formatRestaurantRoleLabel('owner'), 'Sahip');
  assert.equal(formatRestaurantRoleLabel('admin'), 'Yönetici');
  assert.equal(formatRestaurantRoleLabel('kitchen'), 'Mutfak');
});

test('normalizeRestaurantUser maps membership row', () => {
  const member = normalizeRestaurantUser({
    id: 'ru-1',
    restaurant_id: 'r-1',
    user_id: 'u-1',
    role: 'kitchen',
    created_at: '2026-07-08T10:00:00Z'
  });

  assert.equal(member.id, 'ru-1');
  assert.equal(member.restaurantId, 'r-1');
  assert.equal(member.userId, 'u-1');
  assert.equal(member.role, 'kitchen');
  assert.equal(member.roleLabel, 'Mutfak');
});

test('demo slug helper matches GarsonAI demo businessId', () => {
  assert.equal(DEMO_RESTAURANT_SLUG, 'demo-cafe');
  assert.equal(isDemoRestaurantSlug('demo-cafe'), true);
  assert.equal(isDemoRestaurantSlug('DEMO-CAFE'), true);
  assert.equal(isDemoRestaurantSlug('other-cafe'), false);
});
