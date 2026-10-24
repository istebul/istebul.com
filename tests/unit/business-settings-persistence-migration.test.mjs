import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const migration = readFileSync(
  new URL(
    '../../supabase/migrations/20261022190000_business_settings_persistence.sql',
    import.meta.url,
  ),
  'utf8',
);

test('settings are persisted per business with a foreign key', () => {
  assert.match(migration, /create table if not exists public\.business_settings/i);
  assert.match(migration, /business_id uuid primary key/i);
  assert.match(
    migration,
    /references public\.business_accounts\(id\) on delete cascade/i,
  );
  assert.match(migration, /settings jsonb not null default '\{\}'::jsonb/i);
  assert.match(migration, /jsonb_typeof\(settings\) = 'object'/i);
});

test('RLS is enabled and only authenticated managers receive table access', () => {
  assert.match(
    migration,
    /alter table public\.business_settings enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.business_settings\s+from anon, public, authenticated/i,
  );
  assert.match(
    migration,
    /grant select, insert, update on table public\.business_settings\s+to authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /grant\s+(?:all|[^;]*delete)\s+on table public\.business_settings/i,
  );
});

test('all business members may read settings; only owner or admin may write', () => {
  assert.match(migration, /create policy business_settings_member_read/i);

  const memberRead = migration
    .split(/create policy business_settings_member_read/i)[1]
    ?.split(/create policy /i)[0] ?? '';

  assert.match(memberRead, /for select/i);
  assert.match(memberRead, /public\.business_users/i);
  assert.match(memberRead, /bu\.business_id = business_settings\.business_id/i);
  assert.match(memberRead, /bu\.user_id = auth\.uid\(\)/i);
  assert.doesNotMatch(memberRead, /bu\.role in \('owner', 'admin'\)/i);

  for (const name of [
    'business_settings_owner_admin_insert',
    'business_settings_owner_admin_update',
  ]) {
    assert.match(migration, new RegExp(`create policy ${name}`, 'i'));
  }

  const policies = migration.split(/create policy /i).slice(1);
  const settingsWritePolicies = policies.filter((policy) =>
    /^business_settings_owner_admin_(?:insert|update)\b/i.test(policy),
  );

  assert.equal(settingsWritePolicies.length, 2);

  for (const policy of settingsWritePolicies) {
    assert.match(policy, /public\.business_users/i);
    assert.match(policy, /bu\.business_id = business_settings\.business_id/i);
    assert.match(policy, /bu\.user_id = auth\.uid\(\)/i);
    assert.match(policy, /bu\.role in \('owner', 'admin'\)/i);
  }
});

test('insert and update audit identities are tied to the current user', () => {
  assert.match(migration, /created_by = auth\.uid\(\)/i);
  assert.match(migration, /updated_by = auth\.uid\(\)/i);
  assert.match(migration, /new\.updated_by := auth\.uid\(\)/i);
  assert.match(migration, /new\.created_by := old\.created_by/i);
  assert.match(migration, /new\.created_at := old\.created_at/i);
  assert.match(
    migration,
    /revoke execute on function public\.business_settings_touch_updated_at\(\)\s+from public, anon, authenticated/i,
  );
});

test('updates refresh the audit timestamp through a trigger', () => {
  assert.match(
    migration,
    /create or replace function public\.business_settings_touch_updated_at/i,
  );
  assert.match(migration, /new\.updated_at := pg_catalog\.now\(\)/i);
  assert.match(
    migration,
    /before insert or update on public\.business_settings[\s\S]*?execute function public\.business_settings_touch_updated_at\(\)/i,
  );
});

test('migration can be reapplied without duplicating its policies or trigger', () => {
  assert.match(migration, /drop policy if exists business_settings_owner_admin_read/i);
  assert.match(migration, /drop policy if exists business_settings_owner_admin_insert/i);
  assert.match(migration, /drop policy if exists business_settings_owner_admin_update/i);
  assert.match(
    migration,
    /drop trigger if exists business_settings_touch_updated_at/i,
  );
});
