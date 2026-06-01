import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicEnv,
  formatEnvJs,
  parseEnvJsPayload,
  assertEnvJsFileContents,
  isStrictPublicEnvBuild
} from '../../scripts/lib/public-env.cjs';

test('buildPublicEnv resolves SUPABASE aliases', () => {
  const env = buildPublicEnv({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key'
  });
  assert.equal(env.SUPABASE_URL, 'https://example.supabase.co');
  assert.equal(env.SUPABASE_ANON_KEY, 'anon-test-key');
});

test('formatEnvJs and assertEnvJsFileContents validate payload', () => {
  const body = formatEnvJs({
    SUPABASE_URL: 'https://hjfrcdstbyonmgatgwcc.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
    SENTRY_DSN: '',
    LOGROCKET_APP_ID: '',
    GOOGLE_OAUTH_ENABLED: ''
  });
  assert.match(body, /window\.__env = Object\.assign/);
  const parsed = parseEnvJsPayload(body);
  assert.equal(parsed.SUPABASE_URL, 'https://hjfrcdstbyonmgatgwcc.supabase.co');
  assert.ok(parsed.SUPABASE_ANON_KEY);
  assert.doesNotThrow(() => assertEnvJsFileContents(body));
});

test('isStrictPublicEnvBuild is true in CI', () => {
  assert.equal(isStrictPublicEnvBuild({ CI: 'true' }), true);
  assert.equal(isStrictPublicEnvBuild({}), false);
});
