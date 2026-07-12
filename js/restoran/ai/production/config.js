/**
 * GarsonAI production AI yapılandırması.
 */
import {
  resolveProductionEnv,
  validateOpenAIEnvironment
} from '../../production/environment-validator.js';

export const DEFAULT_AI_PROVIDER = 'groq';
export const DEFAULT_AI_MODEL = 'llama-3.3-70b-versatile';
export const DEFAULT_AI_TIMEOUT_MS = 12_000;
export const DEFAULT_AI_MAX_RETRIES = 3;
export const DEFAULT_AI_MAX_TOKENS = 1024;
export const DEFAULT_AI_TEMPERATURE = 0.2;
export const PARSER_VERSION = 'garson-parser-v1';

const PROVIDER_KEYS = ['AI_PROVIDER', 'GARSON_AI_PROVIDER'];
const MODEL_KEYS = ['GARSON_AI_MODEL', 'OPENAI_MODEL', 'GROQ_MODEL'];
const TIMEOUT_KEYS = ['GARSON_AI_TIMEOUT_MS', 'AI_TIMEOUT_MS'];
const RETRY_KEYS = ['GARSON_AI_MAX_RETRIES', 'AI_MAX_RETRIES'];
const MAX_TOKEN_KEYS = ['GARSON_AI_MAX_TOKENS', 'AI_MAX_TOKENS'];
const TEMPERATURE_KEYS = ['GARSON_AI_TEMPERATURE', 'AI_TEMPERATURE'];

/**
 * @param {Record<string, string>} env
 * @param {string[]} keys
 * @param {string} [fallback]
 */
function readEnv(env, keys, fallback = '') {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return fallback;
}

/**
 * @param {Record<string, string>} env
 * @param {string[]} keys
 * @param {number} fallback
 */
function readNumberEnv(env, keys, fallback) {
  const raw = readEnv(env, keys, '');
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Record<string, string>}
 */
export function resolveAiEnv(options = {}) {
  return resolveProductionEnv(options);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateAiProductionEnvironment(options = {}) {
  return validateOpenAIEnvironment(options);
}

/**
 * @typedef {Object} AiProductionConfig
 * @property {string} provider
 * @property {string} model
 * @property {number} timeoutMs
 * @property {number} maxRetries
 * @property {number} maxTokens
 * @property {number} temperature
 * @property {string} parserVersion
 */

/**
 * @param {Record<string, unknown>} [options]
 * @returns {AiProductionConfig}
 */
export function loadAiProductionConfig(options = {}) {
  const env = resolveAiEnv(options);
  return {
    provider: readEnv(env, PROVIDER_KEYS, DEFAULT_AI_PROVIDER).toLowerCase(),
    model: readEnv(env, MODEL_KEYS, DEFAULT_AI_MODEL),
    timeoutMs: Math.max(1_000, readNumberEnv(env, TIMEOUT_KEYS, DEFAULT_AI_TIMEOUT_MS)),
    maxRetries: Math.max(1, readNumberEnv(env, RETRY_KEYS, DEFAULT_AI_MAX_RETRIES)),
    maxTokens: Math.max(64, readNumberEnv(env, MAX_TOKEN_KEYS, DEFAULT_AI_MAX_TOKENS)),
    temperature: Math.min(1, Math.max(0, readNumberEnv(env, TEMPERATURE_KEYS, DEFAULT_AI_TEMPERATURE))),
    parserVersion: PARSER_VERSION
  };
}
