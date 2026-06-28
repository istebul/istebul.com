import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  getBackoffDelays,
  isAuthCliFailure,
  isTransientCliOutput,
  scriptOmitsSecretsInLogs,
  verticalKonutFinansSchemaReady
} from '../../scripts/lib/supabase-management-api.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const libSh = path.join(root, 'scripts/lib/supabase-management-api.sh');
const retrySh = path.join(root, 'scripts/lib/retry-command.sh');
const verticalScript = path.join(root, 'scripts/apply-vertical-migration-api.sh');
const workflow = path.join(root, '.github/workflows/production-deploy.yml');

function bashEval(scriptPath, snippet, env = {}) {
  return execFileSync('bash', ['-c', `set -euo pipefail; source "${scriptPath}"; ${snippet}`], {
    env: { ...process.env, ...env },
    encoding: 'utf8'
  }).trim();
}

function bashEvalStatus(scriptPath, snippet, env = {}) {
  try {
    bashEval(scriptPath, snippet, env);
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

describe('vertical konut/finans verify-first helpers', () => {
  it('detects vertical_events and vertical_leads ready', () => {
    assert.equal(
      verticalKonutFinansSchemaReady([
        { table_name: 'vertical_events' },
        { table_name: 'vertical_leads' }
      ]),
      true
    );
    assert.equal(verticalKonutFinansSchemaReady([{ table_name: 'vertical_events' }]), false);
  });
});

describe('supabase CLI retry classification', () => {
  it('treats gateway and timeout output as transient', () => {
    assert.equal(isTransientCliOutput('Unexpected error retrieving remote project status: error code: 504'), true);
    assert.equal(isTransientCliOutput('502 Bad gateway'), true);
    assert.equal(isTransientCliOutput('network timeout ETIMEDOUT'), true);
  });

  it('treats esm.sh 522 import failures as transient', () => {
    assert.equal(
      isTransientCliOutput("Import 'https://esm.sh/@supabase/supabase-js@2' failed: 522 <unknown status code>"),
      true
    );
    assert.equal(isTransientCliOutput('error code: 522'), true);
  });

  it('fails fast on unauthorized/forbidden output', () => {
    assert.equal(isAuthCliFailure('Error: unauthorized (401)'), true);
    assert.equal(isAuthCliFailure('permission denied: invalid token'), true);
    assert.equal(isTransientCliOutput('Error: unauthorized (401)'), false);
  });
});

describe('retry-command bash runtime', () => {
  it('retries 504 gateway output then succeeds', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retry-cmd-'));
    const stateFile = path.join(tmp, 'state');
    fs.writeFileSync(stateFile, '0');
    const mockBin = path.join(tmp, 'bin');
    fs.mkdirSync(mockBin);
    fs.writeFileSync(
      path.join(mockBin, 'sleep'),
      '#!/usr/bin/env bash\nexit 0\n',
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(mockBin, 'supabase'),
      `#!/usr/bin/env bash
set -euo pipefail
n=$(cat "${stateFile}")
if [ "$n" = "0" ]; then
  echo 1 > "${stateFile}"
  echo "Unexpected error retrieving remote project status: error code: 504" >&2
  exit 1
fi
echo "Linked project"
`,
      { mode: 0o755 }
    );

    const out = execFileSync(
      'bash',
      [retrySh, 'supabase', 'link', '--project-ref', 'test-ref', '--yes'],
      {
        env: { ...process.env, PATH: `${mockBin}:${process.env.PATH}` },
        encoding: 'utf8'
      }
    ).trim();

    assert.equal(out, 'Linked project');
    assert.equal(fs.readFileSync(stateFile, 'utf8').trim(), '1');
  });

  it('does not retry unauthorized failures', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retry-auth-'));
    const mockBin = path.join(tmp, 'bin');
    fs.mkdirSync(mockBin);
    fs.writeFileSync(
      path.join(mockBin, 'supabase'),
      `#!/usr/bin/env bash
echo "Error: unauthorized — invalid token" >&2
exit 1
`,
      { mode: 0o755 }
    );

    const status = bashEvalStatus(
      retrySh,
      `export PATH="${mockBin}:$PATH"; retry_cmd_run supabase link --project-ref test --yes || exit $?`
    );
    assert.notEqual(status, 0);
  });

  it('retries esm.sh 522 bundling output then succeeds', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retry-esm-'));
    const stateFile = path.join(tmp, 'state');
    fs.writeFileSync(stateFile, '0');
    const mockBin = path.join(tmp, 'bin');
    fs.mkdirSync(mockBin);
    fs.writeFileSync(
      path.join(mockBin, 'sleep'),
      '#!/usr/bin/env bash\nexit 0\n',
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(mockBin, 'supabase'),
      `#!/usr/bin/env bash
set -euo pipefail
n=$(cat "${stateFile}")
if [ "$n" = "0" ]; then
  echo 1 > "${stateFile}"
  echo "Import 'https://esm.sh/@supabase/supabase-js@2' failed: 522 <unknown status code>" >&2
  exit 1
fi
echo "Deployed Functions on project test-ref: housing-intake"
`,
      { mode: 0o755 }
    );

    const out = execFileSync(
      'bash',
      [retrySh, 'supabase', 'functions', 'deploy', 'housing-intake', '--project-ref', 'test-ref'],
      {
        env: { ...process.env, PATH: `${mockBin}:${process.env.PATH}` },
        encoding: 'utf8'
      }
    ).trim();

    assert.match(out, /Deployed Functions on project test-ref: housing-intake/);
    assert.equal(fs.readFileSync(stateFile, 'utf8').trim(), '1');
  });
});

describe('vertical migration script hardening', () => {
  it('504 then 200 succeeds on retry with mock curl', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vertical-api-'));
    const stateFile = path.join(tmp, 'state');
    fs.writeFileSync(stateFile, '0');
    const mockBin = path.join(tmp, 'bin');
    fs.mkdirSync(mockBin);
    fs.writeFileSync(
      path.join(mockBin, 'sleep'),
      '#!/usr/bin/env bash\nexit 0\n',
      { mode: 0o755 }
    );
    fs.writeFileSync(
      path.join(mockBin, 'curl'),
      `#!/usr/bin/env bash
set -euo pipefail
outfile=""
write=0
for arg in "$@"; do
  if [ "$write" = "1" ]; then outfile="$arg"; write=0; fi
  case "$arg" in
    -o) write=1 ;;
  esac
done
n=$(cat "${stateFile}")
if [ "$n" = "0" ]; then
  echo '[]' > "$outfile"
  echo 1 > "${stateFile}"
  printf '200'
  exit 0
fi
if [ "$n" = "1" ]; then
  echo '<html>504 Gateway time-out</html>' > "$outfile"
  echo 2 > "${stateFile}"
  printf '504'
  exit 0
fi
echo '[]' > "$outfile"
printf '200'
`,
      { mode: 0o755 }
    );

    const snippet = `
      export PATH="${mockBin}:$PATH"
      export SUPABASE_ACCESS_TOKEN=test-token
      export SUPABASE_PROJECT_REF=test-ref
      outfile="$(mktemp)"
      payload='{"query":"select 1"}'
      http="$(mgmt_api_post_with_retry "$payload" "$outfile")"
      test "$http" = "200"
      echo "$http"
    `;

    const http = bashEval(libSh, snippet);
    assert.equal(http, '200');
  });

  it('wires verify-first, shared helper apply, and post-apply verify', () => {
    const source = fs.readFileSync(verticalScript, 'utf8');
    assert.match(source, /mgmt_api_vertical_konut_finans_schema_ready/);
    assert.match(source, /vertical_events and vertical_leads already present/);
    assert.match(source, /mgmt_api_apply_sql_file/);
    assert.match(source, /mgmt_api_fail_unavailable/);
    assert.doesNotMatch(source, /curl -sS -o \/tmp\/supabase-query/);
  });

  it('shared helper exposes vertical verify function', () => {
    const source = fs.readFileSync(libSh, 'utf8');
    assert.match(source, /mgmt_api_vertical_konut_finans_schema_ready/);
    assert.match(source, /vertical_events/);
    assert.match(source, /vertical_leads/);
  });
});

describe('production deploy workflow wiring', () => {
  it('uses retry wrapper for Supabase link steps', () => {
    const source = fs.readFileSync(workflow, 'utf8');
    const matches = source.match(/retry-command\.sh supabase link/g) || [];
    assert.equal(matches.length, 2);
    assert.match(
      source,
      /- name: Link Supabase project[\s\S]*?run: bash scripts\/lib\/retry-command\.sh supabase link/
    );
  });

  it('uses retry wrapper for edge intake function deploy steps', () => {
    const source = fs.readFileSync(workflow, 'utf8');
    const edgeIntakeBlock = source.match(
      /deploy-edge-intake:[\s\S]*?deploy-cloudflare:/
    )?.[0];
    assert.ok(edgeIntakeBlock, 'deploy-edge-intake job block missing');
    assert.doesNotMatch(
      edgeIntakeBlock,
      /run: supabase functions deploy (housing-intake|vacation-intake|ai-listings-intake|partner-endpoint-test)/
    );
    assert.equal(
      (edgeIntakeBlock.match(/retry-command\.sh supabase functions deploy/g) || []).length,
      4
    );
  });

  it('uses retry wrapper for bulk edge function deploy loop', () => {
    const source = fs.readFileSync(workflow, 'utf8');
    assert.match(
      source,
      /for fn in "\$\{FUNCTIONS\[@\]\}"; do[\s\S]*?bash scripts\/lib\/retry-command\.sh supabase functions deploy "\$fn"/
    );
    assert.doesNotMatch(
      source,
      /for fn in "\$\{FUNCTIONS\[@\]\}"; do[\s\S]*?run: supabase functions deploy "\$fn"/
    );
  });

  it('ops scripts do not echo secrets', () => {
    for (const file of [retrySh, verticalScript, libSh]) {
      const source = fs.readFileSync(file, 'utf8');
      assert.equal(scriptOmitsSecretsInLogs(source), true, path.basename(file));
    }
  });

  it('uses the same backoff schedule as management API helper', () => {
    const retrySource = fs.readFileSync(retrySh, 'utf8');
    assert.deepEqual(getBackoffDelays(), [10, 20, 40, 60, 60]);
    assert.match(retrySource, /RETRY_CMD_MAX_ATTEMPTS=5/);
    assert.match(retrySource, /10 20 40 60 60/);
  });

  it('requires AI_LISTINGS_EDGE_SECRET without deterministic fallback', () => {
    const source = fs.readFileSync(workflow, 'utf8');
    assert.doesNotMatch(source, /isteai-edge-/);
    assert.doesNotMatch(source, /DETERMINISTIC_AI_LISTINGS_EDGE_SECRET/);
    assert.match(source, /::error::AI_LISTINGS_EDGE_SECRET is required for production deploy/);
    assert.match(source, /exit 1/);
    assert.match(
      source,
      /supabase secrets set AI_LISTINGS_EDGE_SECRET="\$AI_LISTINGS_EDGE_SECRET"/
    );
  });
});
