/**
 * Pure helpers for Supabase Management API schema apply scripts.
 * Bash runtime: scripts/lib/supabase-management-api.sh
 */

export const RETRIABLE_HTTP_CODES = new Set([
  0, // curl network / HTTP 000
  408,
  409,
  425,
  429,
  500,
  502,
  503,
  504
]);

export const NON_RETRIABLE_HTTP_CODES = new Set([400, 401, 403, 404]);

export const BACKOFF_DELAYS_SEC = [10, 20, 40, 60, 60];

export const MAX_ATTEMPTS = 5;

export const ANALYTICS_VERIFY_QUERY = `
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'analytics_exclusion_rules'
) AS ok;
`.trim();

export const POSTS_VERIFY_QUERY = `
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'posts'
  AND column_name IN ('content_type', 'cover_image_url');
`.trim();

export const DB_URL_ENV_VARS = [
  'SUPABASE_DATABASE_URL',
  'SUPABASE_DB_URL',
  'DATABASE_URL',
  'POSTGRES_URL'
];

/**
 * @param {number|string|null|undefined} code
 */
export function parseHttpCode(code) {
  if (code === null || code === undefined || code === '') return 0;
  const n = Number(code);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {number|string|null|undefined} code
 */
export function isRetriableHttpCode(code) {
  const n = parseHttpCode(code);
  if (RETRIABLE_HTTP_CODES.has(n)) return true;
  if (NON_RETRIABLE_HTTP_CODES.has(n)) return false;
  if (n >= 400 && n < 500) return false;
  if (n >= 500) return true;
  return false;
}

export function getBackoffDelays() {
  return [...BACKOFF_DELAYS_SEC];
}

/**
 * @param {string} body
 * @param {number} [maxLen]
 */
export function sanitizeErrorBody(body, maxLen = 240) {
  if (!body || typeof body !== 'string') return '';
  let out = body
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/(password|secret|token)(=|:)\s*[^\s&"']+/gi, '$1$2[REDACTED]')
    .replace(/\s+/g, ' ')
    .trim();
  if (out.length > maxLen) out = `${out.slice(0, maxLen)}…`;
  return out;
}

/**
 * @param {unknown} rows
 */
export function analyticsSchemaReady(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const row = list[0];
  return row?.ok === true || row?.exists === true;
}

/**
 * @param {unknown} rows
 */
export function postsRequiredColumnsReady(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const found = new Set(list.map((r) => r?.column_name).filter(Boolean));
  return found.has('content_type') && found.has('cover_image_url');
}

/**
 * @param {Record<string, string|undefined>} env
 */
export function resolveDbUrl(env) {
  for (const key of DB_URL_ENV_VARS) {
    const value = env[key];
    if (value && String(value).trim()) return { key, url: String(value).trim() };
  }
  return null;
}

/**
 * @param {string} scriptSource
 */
export function scriptOmitsSecretsInLogs(scriptSource) {
  const risky = [
    /echo\s+["']?\$\{SUPABASE_ACCESS_TOKEN/,
    /echo\s+["']?\$\{SUPABASE_DB_PASSWORD/,
    /echo\s+["']?\$\{SUPABASE_DATABASE_URL/,
    /cat\s+.*Authorization/
  ];
  return risky.every((re) => !re.test(scriptSource));
}
