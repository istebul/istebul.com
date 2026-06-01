/**
 * Public browser env resolution for build, audits, and local server.
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_SUPABASE_URL = 'https://hjfrcdstbyonmgatgwcc.supabase.co';

const PUBLIC_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SENTRY_DSN',
  'LOGROCKET_APP_ID',
  'GOOGLE_OAUTH_ENABLED',
  'GA4_MEASUREMENT_ID',
  'CF_WEB_ANALYTICS_TOKEN',
  'PLAUSIBLE_DOMAIN',
  'CLARITY_PROJECT_ID'
];

const ENV_SOURCE_KEYS = {
  SUPABASE_URL: ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
  SUPABASE_ANON_KEY: [
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
};

function loadPublicEnvDefaults(rootDir = process.cwd()) {
  const defaultsPath = path.join(rootDir, 'config/public-env.defaults.json');
  if (!fs.existsSync(defaultsPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(defaultsPath, 'utf8'));
  } catch {
    return {};
  }
}

function pickEnvValue(key, processEnv = process.env, defaults = {}) {
  const sources = ENV_SOURCE_KEYS[key] || [key];
  for (const sourceKey of sources) {
    const raw = processEnv[sourceKey];
    if (raw != null && String(raw).trim() !== '') {
      return String(raw).trim();
    }
  }
  if (defaults[key] != null && String(defaults[key]).trim() !== '') {
    return String(defaults[key]).trim();
  }
  if (key === 'SUPABASE_URL') {
    return DEFAULT_SUPABASE_URL;
  }
  return '';
}

function buildPublicEnv(processEnv = process.env, rootDir = process.cwd()) {
  const defaults = loadPublicEnvDefaults(rootDir);
  const env = {};
  for (const key of PUBLIC_ENV_KEYS) {
    env[key] = pickEnvValue(key, processEnv, defaults);
  }
  return env;
}

function isStrictPublicEnvBuild(processEnv = process.env) {
  return Boolean(
    processEnv.CI === 'true' ||
      processEnv.CI === '1' ||
      processEnv.GITHUB_ACTIONS === 'true' ||
      processEnv.CF_PAGES === '1' ||
      processEnv.CLOUDFLARE_PAGES === '1' ||
      processEnv.REQUIRE_SUPABASE_ENV === '1'
  );
}

/** CI test builds may use placeholders; production deploy sets REQUIRE_SUPABASE_ENV=1. */
function withCiBuildPublicEnvFallback(env, processEnv = process.env) {
  if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) return env;
  if (processEnv.REQUIRE_SUPABASE_ENV === '1' || processEnv.CF_PAGES === '1') {
    return env;
  }
  if (processEnv.GITHUB_ACTIONS !== 'true' && processEnv.CI !== 'true') {
    return env;
  }
  return {
    ...env,
    SUPABASE_URL: env.SUPABASE_URL || 'https://hjfrcdstbyonmgatgwcc.supabase.co',
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || 'ci-build-placeholder-anon-key-not-for-production'
  };
}

function assertPublicEnvForBuild(env, { strict = false } = {}) {
  const missing = [];
  if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

  if (!missing.length) return;

  const hint =
    'Set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_/NEXT_PUBLIC_ aliases) in GitHub Actions / Cloudflare Pages environment variables before deploy.';

  if (strict) {
    throw new Error(`[build] Missing required public env: ${missing.join(', ')}. ${hint}`);
  }

  console.warn(`[build] Missing public env: ${missing.join(', ')}. ${hint}`);
}

function formatEnvJs(env) {
  return `window.__env = Object.assign({}, window.__env || {}, ${JSON.stringify(env)});\n`;
}

function parseEnvJsPayload(source) {
  const match = source.match(
    /window\.__env\s*=\s*Object\.assign\(\s*\{\}\s*,\s*(?:window\.__env\s*\|\|\s*\{\})?\s*,\s*(\{[\s\S]*\})\s*\)/
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function assertEnvJsFileContents(source, label = 'dist/env.js') {
  const payload = parseEnvJsPayload(source);
  if (!payload) {
    throw new Error(`${label}: could not parse window.__env payload`);
  }
  if (!payload.SUPABASE_URL || !String(payload.SUPABASE_URL).trim()) {
    throw new Error(`${label}: SUPABASE_URL is empty`);
  }
  if (!payload.SUPABASE_ANON_KEY || !String(payload.SUPABASE_ANON_KEY).trim()) {
    throw new Error(`${label}: SUPABASE_ANON_KEY is empty`);
  }
  return payload;
}

module.exports = {
  PUBLIC_ENV_KEYS,
  DEFAULT_SUPABASE_URL,
  buildPublicEnv,
  isStrictPublicEnvBuild,
  withCiBuildPublicEnvFallback,
  assertPublicEnvForBuild,
  formatEnvJs,
  parseEnvJsPayload,
  assertEnvJsFileContents
};
