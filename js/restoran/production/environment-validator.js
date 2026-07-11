/**
 * GarsonAI production environment validation.
 */

const SUPABASE_URL_KEYS = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_ANON_KEYS = [
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const WHATSAPP_TOKEN_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_TOKEN'
];
const WHATSAPP_VERIFY_KEYS = ['WHATSAPP_VERIFY_TOKEN', 'META_WHATSAPP_VERIFY_TOKEN'];
const WHATSAPP_PHONE_KEYS = ['WHATSAPP_PHONE_NUMBER_ID', 'META_WHATSAPP_PHONE_NUMBER_ID'];

const OPENAI_KEYS = ['OPENAI_API_KEY'];
const GROQ_KEYS = ['GROQ_API_KEY'];

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Record<string, string>}
 */
export function resolveProductionEnv(options = {}) {
  const browserEnv =
    typeof window !== 'undefined'
      ? /** @type {Record<string, string>} */ (window.__env || window.env || {})
      : {};
  const nodeEnv =
    typeof process !== 'undefined' && process.env
      ? /** @type {Record<string, string>} */ (process.env)
      : {};
  const override =
    options.env && typeof options.env === 'object'
      ? /** @type {Record<string, string>} */ (options.env)
      : {};

  return { ...nodeEnv, ...browserEnv, ...override };
}

/**
 * @param {Record<string, string>} env
 * @param {string[]} keys
 * @returns {string}
 */
function readEnvValue(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateSupabaseEnvironment(options = {}) {
  const env = resolveProductionEnv(options);
  /** @type {string[]} */
  const missing = [];

  if (!readEnvValue(env, SUPABASE_URL_KEYS)) {
    missing.push('SUPABASE_URL');
  }
  if (!readEnvValue(env, SUPABASE_ANON_KEYS)) {
    missing.push('SUPABASE_ANON_KEY');
  }

  return { ok: missing.length === 0, missing };
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateWhatsAppEnvironment(options = {}) {
  const env = resolveProductionEnv(options);
  /** @type {string[]} */
  const missing = [];

  if (!readEnvValue(env, WHATSAPP_TOKEN_KEYS)) {
    missing.push('WHATSAPP_ACCESS_TOKEN');
  }
  if (!readEnvValue(env, WHATSAPP_VERIFY_KEYS)) {
    missing.push('WHATSAPP_VERIFY_TOKEN');
  }
  if (!readEnvValue(env, WHATSAPP_PHONE_KEYS)) {
    missing.push('WHATSAPP_PHONE_NUMBER_ID');
  }

  return { ok: missing.length === 0, missing };
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateOpenAIEnvironment(options = {}) {
  const env = resolveProductionEnv(options);
  const provider = String(env.AI_PROVIDER || 'groq')
    .trim()
    .toLowerCase();
  /** @type {string[]} */
  const missing = [];

  if (provider === 'openai') {
    if (!readEnvValue(env, OPENAI_KEYS)) {
      missing.push('OPENAI_API_KEY');
    }
  } else if (!readEnvValue(env, GROQ_KEYS) && !readEnvValue(env, OPENAI_KEYS)) {
    missing.push('GROQ_API_KEY');
  }

  return { ok: missing.length === 0, missing };
}
