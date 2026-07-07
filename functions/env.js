/**
 * Runtime public env for Cloudflare Pages.
 * Serves /env.js from Pages environment variables (overrides empty build-time env.js).
 */
const DEFAULT_SUPABASE_URL = 'https://hjfrcdstbyonmgatgwcc.supabase.co';
const DEFAULT_GARSONAI_API_URL = 'https://api.istebul.com';

const PUBLIC_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'GARSONAI_API_URL',
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
  ],
  GARSONAI_API_URL: ['GARSONAI_API_URL', 'VITE_GARSONAI_API_URL']
};

const headers = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

function pickFromBindings(bindings, key) {
  const sources = ENV_SOURCE_KEYS[key] || [key];
  for (const sourceKey of sources) {
    const value = bindings?.[sourceKey];
    if (value != null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  if (key === 'SUPABASE_URL') {
    return DEFAULT_SUPABASE_URL;
  }
  if (key === 'GARSONAI_API_URL') {
    return DEFAULT_GARSONAI_API_URL;
  }
  return '';
}

export async function onRequest(context) {
  const payload = {};
  for (const key of PUBLIC_ENV_KEYS) {
    payload[key] = pickFromBindings(context.env, key);
  }

  const body = `window.__env = Object.assign({}, window.__env || {}, ${JSON.stringify(payload)});\n`;
  return new Response(body, { status: 200, headers });
}
