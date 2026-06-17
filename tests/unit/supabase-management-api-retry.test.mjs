import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  analyticsSchemaReady,
  getBackoffDelays,
  isRetriableHttpCode,
  parseHttpCode,
  postsRequiredColumnsReady,
  resolveDbUrl,
  sanitizeErrorBody,
  scriptOmitsSecretsInLogs,
  BACKOFF_DELAYS_SEC,
  MAX_ATTEMPTS
} from '../../scripts/lib/supabase-management-api.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const libSh = path.join(root, 'scripts/lib/supabase-management-api.sh');
const analyticsScript = path.join(root, 'scripts/apply-analytics-ite-migration-api.sh');
const postsScript = path.join(root, 'scripts/apply-posts-schema-migration-api.sh');

function bashEval(snippet, env = {}) {
  return execFileSync('bash', ['-c', `set -euo pipefail; source "${libSh}"; ${snippet}`], {
    env: { ...process.env, ...env },
    encoding: 'utf8'
  }).trim();
}

function bashEvalStatus(snippet, env = {}) {
  try {
    bashEval(snippet, env);
    return 0;
  } catch (err) {
    return err.status ?? 1;
  }
}

describe('supabase-management-api retry policy', () => {
  it('retries transient gateway and rate-limit codes', () => {
    for (const code of [0, 408, 409, 425, 429, 500, 502, 503, 504]) {
      assert.equal(isRetriableHttpCode(code), true, `expected retriable: ${code}`);
    }
  });

  it('fails fast on auth and client errors', () => {
    for (const code of [400, 401, 403, 404, 418]) {
      assert.equal(isRetriableHttpCode(code), false, `expected non-retriable: ${code}`);
    }
  });

  it('uses five attempts with expected backoff schedule', () => {
    assert.equal(MAX_ATTEMPTS, 5);
    assert.deepEqual(getBackoffDelays(), BACKOFF_DELAYS_SEC);
    assert.deepEqual(BACKOFF_DELAYS_SEC, [10, 20, 40, 60, 60]);
  });

  it('parses curl HTTP 000 as retriable', () => {
    assert.equal(parseHttpCode('000'), 0);
    assert.equal(isRetriableHttpCode('000'), true);
  });
});

describe('supabase-management-api verify-first helpers', () => {
  it('detects analytics schema ready', () => {
    assert.equal(analyticsSchemaReady([{ ok: true }]), true);
    assert.equal(analyticsSchemaReady([{ ok: false }]), false);
  });

  it('detects posts required columns ready', () => {
    assert.equal(
      postsRequiredColumnsReady([
        { column_name: 'content_type' },
        { column_name: 'cover_image_url' }
      ]),
      true
    );
    assert.equal(postsRequiredColumnsReady([{ column_name: 'content_type' }]), false);
  });

  it('resolves direct DB URL from existing env vars only', () => {
    assert.deepEqual(resolveDbUrl({ SUPABASE_DATABASE_URL: 'postgresql://x' }), {
      key: 'SUPABASE_DATABASE_URL',
      url: 'postgresql://x'
    });
    assert.equal(resolveDbUrl({}), null);
  });
});

describe('supabase-management-api logging hygiene', () => {
  it('redacts bearer tokens and secrets from error bodies', () => {
    const raw = 'Bearer abc.def.ghi password=secret123 token: tok_xyz <!DOCTYPE html>';
    const sanitized = sanitizeErrorBody(raw);
    assert.match(sanitized, /Bearer \[REDACTED\]/);
    assert.doesNotMatch(sanitized, /abc\.def\.ghi/);
    assert.doesNotMatch(sanitized, /secret123/);
    assert.doesNotMatch(sanitized, /tok_xyz/);
  });

  it('apply scripts do not echo tokens or DB URLs', () => {
    for (const file of [libSh, analyticsScript, postsScript]) {
      const source = fs.readFileSync(file, 'utf8');
      assert.equal(scriptOmitsSecretsInLogs(source), true, path.basename(file));
    }
  });
});

describe('supabase-management-api bash runtime', () => {
  it('502 then 200 succeeds on retry with mock curl', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mgmt-api-'));
    const stateFile = path.join(tmp, 'state');
    fs.writeFileSync(stateFile, '0');
    const mockBin = path.join(tmp, 'bin');
    fs.mkdirSync(mockBin);
    fs.writeFileSync(
      path.join(mockBin, 'sleep'),
      `#!/usr/bin/env bash
exit 0
`,
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
  echo '<html>502 Bad Gateway</html>' > "$outfile"
  echo 1 > "${stateFile}"
  printf '502'
  exit 0
fi
echo '[{"ok":true}]' > "$outfile"
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

    const http = bashEval(snippet);
    assert.equal(http, '200');
    assert.equal(fs.readFileSync(stateFile, 'utf8').trim(), '1');
  });

  it('504 is treated as retriable in bash helper', () => {
    assert.equal(bashEvalStatus('mgmt_api_is_retriable 504; exit 0'), 0);
    assert.equal(bashEval('mgmt_api_is_retriable 504 && echo yes'), 'yes');
  });

  it('401 is non-retriable in bash helper', () => {
    assert.equal(bashEval('if mgmt_api_is_retriable 401; then echo yes; else echo no; fi'), 'no');
  });

  it('429 is retriable in bash helper', () => {
    assert.equal(bashEval('mgmt_api_is_retriable 429 && echo yes'), 'yes');
  });
});

describe('apply script verify-first wiring', () => {
  it('analytics script skips apply when schema already ready', () => {
    const source = fs.readFileSync(analyticsScript, 'utf8');
    assert.match(source, /mgmt_api_analytics_schema_ready/);
    assert.match(source, /already present — skipping Management API apply/);
    assert.match(source, /mgmt_api_apply_sql_file/);
    assert.match(source, /mgmt_api_fail_unavailable/);
    assert.doesNotMatch(source, /curl -sS -o \/tmp\/supabase-ite-query/);
  });

  it('posts script skips apply when required columns already exist', () => {
    const source = fs.readFileSync(postsScript, 'utf8');
    assert.match(source, /mgmt_api_posts_columns_ready/);
    assert.match(source, /content_type and cover_image_url already present/);
    assert.match(source, /mgmt_api_apply_sql_file/);
    assert.doesNotMatch(source, /curl -sS -o \/tmp\/supabase-posts-query/);
  });

  it('shared helper defines DB fallback env vars without inventing secrets', () => {
    const source = fs.readFileSync(libSh, 'utf8');
    assert.match(source, /SUPABASE_DATABASE_URL SUPABASE_DB_URL DATABASE_URL POSTGRES_URL/);
    assert.match(source, /mgmt_db_apply_sql_file/);
    assert.match(source, /--connect-timeout 10/);
    assert.match(source, /--max-time 90/);
  });
});
