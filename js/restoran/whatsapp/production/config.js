/**
 * GarsonAI WhatsApp Cloud API production yapılandırması.
 */
import { resolveProductionEnv, validateWhatsAppEnvironment } from '../../production/environment-validator.js';

export const DEFAULT_WHATSAPP_API_VERSION = 'v21.0';
export const DEFAULT_GRAPH_API_BASE = 'https://graph.facebook.com';

const ACCESS_TOKEN_KEYS = [
  'WHATSAPP_ACCESS_TOKEN',
  'META_WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_TOKEN'
];
const VERIFY_TOKEN_KEYS = ['WHATSAPP_VERIFY_TOKEN', 'META_WHATSAPP_VERIFY_TOKEN'];
const PHONE_NUMBER_KEYS = ['WHATSAPP_PHONE_NUMBER_ID', 'META_WHATSAPP_PHONE_NUMBER_ID'];
const APP_SECRET_KEYS = ['WHATSAPP_APP_SECRET', 'META_WHATSAPP_APP_SECRET'];
const API_VERSION_KEYS = ['WHATSAPP_API_VERSION', 'META_WHATSAPP_API_VERSION'];
const RESTAURANT_MAP_KEYS = ['GARSON_WHATSAPP_RESTAURANT_MAP'];

/**
 * @param {Record<string, string>} env
 * @param {string[]} keys
 * @returns {string}
 */
function readEnv(env, keys) {
  for (const key of keys) {
    const value = String(env[key] || '').trim();
    if (value) return value;
  }
  return '';
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Record<string, string>}
 */
export function resolveWhatsAppEnv(options = {}) {
  return resolveProductionEnv(options);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function validateWhatsAppProductionEnvironment(options = {}) {
  const base = validateWhatsAppEnvironment(options);
  const env = resolveWhatsAppEnv(options);
  /** @type {string[]} */
  const missing = [...base.missing];

  if (!readEnv(env, APP_SECRET_KEYS)) {
    missing.push('WHATSAPP_APP_SECRET');
  }

  return { ok: missing.length === 0, missing };
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function readAccessToken(options = {}) {
  return readEnv(resolveWhatsAppEnv(options), ACCESS_TOKEN_KEYS);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function readVerifyToken(options = {}) {
  return readEnv(resolveWhatsAppEnv(options), VERIFY_TOKEN_KEYS);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function readPhoneNumberId(options = {}) {
  return readEnv(resolveWhatsAppEnv(options), PHONE_NUMBER_KEYS);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function readAppSecret(options = {}) {
  return readEnv(resolveWhatsAppEnv(options), APP_SECRET_KEYS);
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {string}
 */
export function readApiVersion(options = {}) {
  const version = readEnv(resolveWhatsAppEnv(options), API_VERSION_KEYS);
  return version || DEFAULT_WHATSAPP_API_VERSION;
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Record<string, string>}
 */
export function parseRestaurantMap(options = {}) {
  const raw = readEnv(resolveWhatsAppEnv(options), RESTAURANT_MAP_KEYS);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(/** @type {Record<string, unknown>} */ (parsed))
        .map(([phoneNumberId, restaurantId]) => [
          String(phoneNumberId).trim(),
          String(restaurantId || '').trim()
        ])
        .filter(([phoneNumberId, restaurantId]) => phoneNumberId && restaurantId)
    );
  } catch {
    return {};
  }
}

/**
 * @typedef {Object} WhatsAppProductionConfig
 * @property {string} accessToken
 * @property {string} verifyToken
 * @property {string} phoneNumberId
 * @property {string} appSecret
 * @property {string} apiVersion
 * @property {string} graphApiBase
 * @property {Record<string, string>} restaurantMap
 */

/**
 * @param {Record<string, unknown>} [options]
 * @returns {WhatsAppProductionConfig}
 */
export function loadWhatsAppProductionConfig(options = {}) {
  return {
    accessToken: readAccessToken(options),
    verifyToken: readVerifyToken(options),
    phoneNumberId: readPhoneNumberId(options),
    appSecret: readAppSecret(options),
    apiVersion: readApiVersion(options),
    graphApiBase: DEFAULT_GRAPH_API_BASE,
    restaurantMap: parseRestaurantMap(options)
  };
}

/**
 * @param {string} path
 * @param {WhatsAppProductionConfig} [config]
 * @param {string} [phoneNumberId]
 * @returns {string}
 */
export function buildGraphEndpoint(path, config, phoneNumberId) {
  const cfg = config || loadWhatsAppProductionConfig();
  const version = cfg.apiVersion || DEFAULT_WHATSAPP_API_VERSION;
  const base = String(cfg.graphApiBase || DEFAULT_GRAPH_API_BASE).replace(/\/$/, '');
  const targetPhoneNumberId = String(phoneNumberId || cfg.phoneNumberId || '').trim();

  if (!targetPhoneNumberId) {
    throw new Error('WhatsApp phone_number_id yapılandırması eksik.');
  }

  const suffix = String(path || 'messages').replace(/^\//, '') || 'messages';
  return `${base}/${version}/${targetPhoneNumberId}/${suffix}`;
}
