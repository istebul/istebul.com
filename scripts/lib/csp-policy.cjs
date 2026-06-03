/**
 * Shared Content-Security-Policy strings for _headers and netlify.toml.
 * Keep script-src without 'unsafe-inline' on public pages (inline scripts → external files).
 */

const ORIGIN_HOSTS = 'https://www.istebul.com https://istebul.com';

const SCRIPT_HOSTS =
  "'self' " +
  ORIGIN_HOSTS +
  ' https://plausible.io https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.clarity.ms https://scripts.clarity.ms https://challenges.cloudflare.com https://cdn.jsdelivr.net';

const CONNECT_HOSTS =
  "'self' " +
  ORIGIN_HOSTS +
  ' https://*.supabase.co wss://*.supabase.co https://plausible.io https://cloudflareinsights.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://*.clarity.ms https://www.clarity.ms https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io https://api.stripe.com';

const STYLE_HOSTS =
  "'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com";

const FONT_HOSTS = "'self' data: https://fonts.gstatic.com https://cdn.fontshare.com";

const WORKER_SRC = "'self' blob: " + ORIGIN_HOSTS;

function buildCsp({ allowInlineScripts = false } = {}) {
  const scriptSrc = allowInlineScripts
    ? `script-src ${SCRIPT_HOSTS} 'unsafe-inline'`
    : `script-src ${SCRIPT_HOSTS}`;
  return [
    "default-src 'self'",
    scriptSrc,
    `style-src ${STYLE_HOSTS}`,
    "img-src 'self' data: blob: https:",
    `connect-src ${CONNECT_HOSTS}`,
    `font-src ${FONT_HOSTS}`,
    `worker-src ${WORKER_SRC}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'frame-src https://challenges.cloudflare.com',
    "frame-ancestors 'none'",
    'upgrade-insecure-requests'
  ].join('; ');
}

const CSP_PUBLIC = buildCsp({ allowInlineScripts: false });
const CSP_ADMIN = buildCsp({ allowInlineScripts: true });

module.exports = { buildCsp, CSP_PUBLIC, CSP_ADMIN, ORIGIN_HOSTS, WORKER_SRC };
