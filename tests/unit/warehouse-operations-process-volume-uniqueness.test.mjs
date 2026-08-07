import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../supabase/migrations/20260807181500_warehouse_operations_persistence.sql',
  import.meta.url
);

const sql = await readFile(migrationUrl, 'utf8');

test('firma geneli süreç hacmi kayıtlarında NULL depo kimliği mükerrer kaydı engeller', () => {
  assert.match(
    sql,
    /constraint\s+warehouse_operations_process_volumes_unique\s+unique\s+nulls\s+not\s+distinct\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*period_start\s*,\s*period_end\s*,\s*process\s*\)/i
  );

  assert.doesNotMatch(
    sql,
    /constraint\s+warehouse_operations_process_volumes_unique\s+unique\s*\(\s*account_id\s*,\s*warehouse_id\s*,\s*period_start\s*,\s*period_end\s*,\s*process\s*\)/i
  );
});
