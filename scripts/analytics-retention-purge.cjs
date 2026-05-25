#!/usr/bin/env node
/**
 * Purge analytics_events older than retention window (Supabase cost control).
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 *
 * Usage:
 *   RETENTION_DAYS=90 node scripts/analytics-retention-purge.cjs
 *   node scripts/analytics-retention-purge.cjs --dry-run
 */
const dryRun = process.argv.includes('--dry-run');
const retentionDays = Number(process.env.RETENTION_DAYS || 90);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const batchSize = Number(process.env.PURGE_BATCH_SIZE || 500);

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  console.error('RETENTION_DAYS must be a positive number');
  process.exit(1);
}

const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
const base = `${url.replace(/\/$/, '')}/rest/v1/analytics_events`;
/** PostgREST: operator prefix must not be URL-encoded */
const ageFilter = `created_at=lt.${cutoff}`;

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`
};

async function countStaleRows() {
  const countRes = await fetch(`${base}?select=id&${ageFilter}&limit=1`, {
    headers: { ...headers, Prefer: 'count=exact' }
  });

  if (!countRes.ok) {
    throw new Error(`count failed ${countRes.status}: ${await countRes.text()}`);
  }

  const range = countRes.headers.get('content-range') || '';
  const total = Number(range.split('/')[1] || 0);
  return Number.isFinite(total) ? total : 0;
}

async function deleteBatch() {
  const delRes = await fetch(`${base}?${ageFilter}&limit=${batchSize}`, {
    method: 'DELETE',
    headers: { ...headers, Prefer: 'return=minimal' }
  });

  if (!delRes.ok) {
    throw new Error(`delete failed ${delRes.status}: ${await delRes.text()}`);
  }
}

async function main() {
  let total = await countStaleRows();
  console.log(`analytics_events older than ${retentionDays}d (before ${cutoff}): ~${total}`);

  if (total === 0) {
    console.log('nothing to purge');
    return;
  }

  if (dryRun) {
    console.log('dry-run — no rows deleted');
    return;
  }

  const initial = total;
  let rounds = 0;
  const maxRounds = Math.ceil(initial / batchSize) + 10;

  while (total > 0 && rounds < maxRounds) {
    rounds += 1;
    await deleteBatch();
    total = await countStaleRows();
  }

  const removed = Math.max(0, initial - total);
  console.log(`purge complete (~${removed} rows removed, ${rounds} batch(es), ${total} remaining)`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
