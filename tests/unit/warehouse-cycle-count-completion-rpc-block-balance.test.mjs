import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(
  'supabase/migrations/20260814012000_warehouse_cycle_count_completion_rpc.sql',
  'utf8'
);

const lines = sql.split(/\r?\n/);

test('Cycle Count completion RPC procedural IF blokları dengelidir', () => {
  const starts = lines.filter((line) =>
    /^\s*if\b/i.test(line)
  ).length;

  const ends = lines.filter((line) =>
    /^\s*end\s+if\s*;/i.test(line)
  ).length;

  assert.equal(
    starts,
    ends,
    `IF=${starts}, END IF=${ends}`
  );
});

test('complete_count ana action zinciri ortak idempotent response öncesinde kapanır', () => {
  assert.match(
    sql,
    /elsif\s+v_action\s*=\s*'complete_count'\s+then/i
  );

  assert.match(
    sql,
    /end\s+if\s*;\s*\n\s*-- =+\s*\n\s*-- IDEMPOTENT RESPONSE/i
  );
});

test('Cycle Count completion RPC outer function block korunur', () => {
  assert.match(
    sql,
    /as \$warehouse_cycle_count_completion_write\$[\s\S]*\bbegin\b/i
  );

  assert.match(
    sql,
    /\bend\s*;\s*\n\$warehouse_cycle_count_completion_write\$;/i
  );
});
