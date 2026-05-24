import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ANALYTICS_RETENTION_DAYS = Number(Deno.env.get("ANALYTICS_HOT_RETENTION_DAYS") || "90");
const OPS_RETENTION_DAYS = Number(Deno.env.get("OPS_EVENTS_RETENTION_DAYS") || "90");

function forbidden() {
  return new Response("forbidden", { status: 403 });
}

async function runPurge(
  sb: ReturnType<typeof createClient>,
  fn: string,
  days: number,
  jobName: string
) {
  const { data, error } = await sb.rpc(fn, { days });

  if (error) {
    throw new Error(`${jobName}: ${error.message}`);
  }

  const deleted = Number(data || 0);

  await sb.from("data_retention_runs").insert({
    job_name: jobName,
    deleted_count: deleted,
    retention_days: days,
    metadata: { function: fn },
  });

  return deleted;
}

Deno.serve(async (req) => {
  const incoming = req.headers.get("x-data-retention-secret");
  const expected = Deno.env.get("DATA_RETENTION_CRON_SECRET");

  if (!expected || incoming !== expected) {
    return forbidden();
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const analyticsDeleted = await runPurge(
    sb,
    "purge_analytics_events_older_than",
    ANALYTICS_RETENTION_DAYS,
    "analytics_events_hot"
  );

  const opsDeleted = await runPurge(
    sb,
    "purge_operational_events_older_than",
    OPS_RETENTION_DAYS,
    "operational_events"
  );

  return new Response(
    JSON.stringify({
      ok: true,
      at: new Date().toISOString(),
      analytics_deleted: analyticsDeleted,
      operational_deleted: opsDeleted,
      retention_days: {
        analytics: ANALYTICS_RETENTION_DAYS,
        operational: OPS_RETENTION_DAYS,
      },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
