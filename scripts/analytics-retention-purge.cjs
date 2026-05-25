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

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

async function main() {
  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/analytics_events`;
  const params = new URLSearchParams({
    select: 'id',
    created_at: `lt.${cutoff}`,
    limit: '1'
  });

  const countRes = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact'
    }
  });

  const total = Number(countRes.headers.get('content-range')?.split('/')?.[1] || 0);
  console.log(`analytics_events older than ${retentionDays}d (before ${cutoff}): ~${total}`);

  if (dryRun || total === 0) {
    console.log(dryRun ? 'dry-run — no rows deleted' : 'nothing to purge');
    return;
  }

  const delRes = await fetch(`${endpoint}?created_at=lt.${encodeURIComponent(cutoff)}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal'
    }
  });

  if (!delRes.ok) {
    console.error('delete failed', delRes.status, await delRes.text());
    process.exit(1);
  }

  console.log('purge complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
