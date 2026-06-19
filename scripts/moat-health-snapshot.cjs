#!/usr/bin/env node
/**
 * Export moat flywheel + defensibility snapshot (requires service role).
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/moat-health-snapshot.cjs
 */

const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${url}/functions/v1/moat-health`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('moat-health failed', res.status, body);
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
