import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const edge = fs.readFileSync(
  "supabase/functions/warehouse-cycle-count-cron/index.ts",
  "utf8"
);

const config = fs.readFileSync(
  "supabase/config.toml",
  "utf8"
);

const workflow = fs.readFileSync(
  ".github/workflows/warehouse-cycle-count-cron.yml",
  "utf8"
);

const deploy = fs.readFileSync(
  ".github/workflows/production-deploy.yml",
  "utf8"
);

const smoke = fs.readFileSync(
  "scripts/smoke-edge-functions.cjs",
  "utf8"
);

const secrets = fs.readFileSync(
  ".github/SECRETS.example.md",
  "utf8"
);

test(
  "scheduler yalnız POST ile periodic runtime RPC çağırır",
  () => {
    assert.match(
      edge,
      /request\.method !== "POST"/
    );

    assert.match(
      edge,
      /warehouse_cycle_count_process_due_schedules/
    );

    assert.match(
      edge,
      /p_limit:\s*25/
    );

    assert.match(
      edge,
      /p_now:\s*now/
    );
  }
);

test(
  "custom cron secret RPC öncesi doğrulanır",
  () => {
    assert.match(
      edge,
      /WAREHOUSE_CYCLE_COUNT_CRON_SECRET/
    );

    assert.match(
      edge,
      /x-warehouse-cycle-count-cron-secret/
    );

    assert.match(
      edge,
      /timingSafeEqual/
    );

    const secretGate =
      edge.indexOf("timingSafeEqual(");

    const rpcCall =
      edge.indexOf(
        "warehouse_cycle_count_process_due_schedules"
      );

    assert.ok(
      secretGate >= 0
      && rpcCall > secretGate
    );
  }
);

test(
  "service role yalnız Edge Function server runtimeında kullanılır",
  () => {
    assert.match(
      edge,
      /SUPABASE_SERVICE_ROLE_KEY/
    );

    assert.match(
      edge,
      /createClient\([\s\S]*SUPABASE_URL,[\s\S]*SERVICE_ROLE/
    );

    assert.doesNotMatch(
      workflow,
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  }
);

test(
  "runtime database hata ayrıntısı response içine sızdırılmaz",
  () => {
    assert.match(
      edge,
      /periodic_runtime_failed/
    );

    assert.doesNotMatch(
      edge,
      /error\.message/
    );

    assert.doesNotMatch(
      edge,
      /error\.details/
    );
  }
);

test(
  "OPTIONS side effect olmadan 204 döner",
  () => {
    assert.match(
      edge,
      /request\.method === "OPTIONS"[\s\S]*status:\s*204/
    );
  }
);

test(
  "Supabase function config internal secret boundary kullanır",
  () => {
    assert.match(
      config,
      /\[functions\.warehouse-cycle-count-cron\][\s\S]*enabled = true[\s\S]*verify_jwt = false[\s\S]*warehouse-cycle-count-cron\/index\.ts/
    );
  }
);

test(
  "production deploy warehouse cron functionını içerir",
  () => {
    assert.match(
      deploy,
      /FUNCTIONS=\([\s\S]*warehouse-cycle-count-cron[\s\S]*\)/
    );
  }
);

test(
  "edge smoke warehouse cron OPTIONS probe içerir",
  () => {
    assert.match(
      smoke,
      /name:\s*'warehouse-cycle-count-cron'[\s\S]*method:\s*'OPTIONS'/
    );
  }
);

test(
  "GitHub scheduler saatlik ve manuel çalıştırılabilir",
  () => {
    assert.match(
      workflow,
      /cron:\s*"10 \* \* \* \*"/
    );

    assert.match(
      workflow,
      /workflow_dispatch:/
    );
  }
);

test(
  "GitHub scheduler anon transport ve custom secret kullanır",
  () => {
    assert.match(
      workflow,
      /SUPABASE_ANON_KEY/
    );

    assert.match(
      workflow,
      /WAREHOUSE_CYCLE_COUNT_CRON_SECRET/
    );

    assert.match(
      workflow,
      /x-warehouse-cycle-count-cron-secret/
    );

    assert.doesNotMatch(
      workflow,
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  }
);

test(
  "scheduler transient network hatalarında retry yapar",
  () => {
    assert.match(
      workflow,
      /--fail/
    );

    assert.match(
      workflow,
      /--retry 3/
    );

    assert.match(
      workflow,
      /--retry-all-errors/
    );
  }
);

test(
  "scheduler concurrency overlap engeller",
  () => {
    assert.match(
      workflow,
      /concurrency:[\s\S]*warehouse-cycle-count-cron[\s\S]*cancel-in-progress:\s*false/
    );
  }
);

test(
  "cron secret repository secret sözleşmesinde dokümante edilir",
  () => {
    assert.match(
      secrets,
      /WAREHOUSE_CYCLE_COUNT_CRON_SECRET/
    );

    assert.match(
      secrets,
      /Supabase Edge Function secret/
    );
  }
);
