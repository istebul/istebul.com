/**
 * Runtime public env for Cloudflare Pages.
 * Serves /env.js from Pages environment variables (build-time static env.js may be empty).
 */
const DEFAULT_SUPABASE_URL = 'https://hjfrcdstbyonmgatgwcc.supabase.co';

const PUBLIC_ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SENTRY_DSN',
  'LOGROCKET_APP_ID',
  'GOOGLE_OAUTH_ENABLED'
];

const headers = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate'
};

export async function onRequest(context) {
  const payload = {};
  for (const key of PUBLIC_ENV_KEYS) {
    const value = context.env?.[key];
    if (value) {
      payload[key] = String(value);
    } else if (key === 'SUPABASE_URL') {
      payload[key] = DEFAULT_SUPABASE_URL;
    } else {
      payload[key] = '';
    }
  }

  const body = `window.__env = Object.assign({}, window.__env || {}, ${JSON.stringify(payload)});\n`;
  return new Response(body, { status: 200, headers });
}
