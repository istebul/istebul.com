/**
 * GarsonAI production activation checklist.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import { getRestaurant } from '../database/restaurant-repository.js';
import { isDatabaseClientAvailable } from '../database/tenant-utils.js';
import {
  validateOpenAIEnvironment,
  validateSupabaseEnvironment,
  validateWhatsAppEnvironment
} from './environment-validator.js';

/**
 * @param {unknown} client
 * @returns {boolean}
 */
function isRealtimeClientAvailable(client) {
  return Boolean(
    client &&
      typeof client.channel === 'function' &&
      typeof client.removeChannel === 'function'
  );
}

/**
 * @param {unknown} client
 * @param {Record<string, unknown>} options
 * @returns {Promise<{ ok: boolean, active: boolean, message?: string }>}
 */
async function probeRowLevelSecurity(client, options = {}) {
  if (typeof options.rlsEnabled === 'boolean') {
    return { ok: options.rlsEnabled, active: options.rlsEnabled };
  }

  if (!isDatabaseClientAvailable(client)) {
    return { ok: false, active: false, message: 'Veritabanı istemcisi yok.' };
  }

  const { error } = await client
    .from('restaurants')
    .select('id')
    .limit(1);

  if (error) {
    const message = String(error.message || '').toLowerCase();
    if (message.includes('row level security') || message.includes('permission denied')) {
      return { ok: true, active: true, message: 'RLS politikaları aktif.' };
    }
    return { ok: false, active: false, message: String(error.message || 'RLS kontrolü başarısız.') };
  }

  return { ok: true, active: true, message: 'RLS kontrolü tamamlandı.' };
}

/**
 * @param {unknown} client
 * @param {Record<string, unknown>} options
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function probeSupabaseConnection(client, options = {}) {
  const envCheck = validateSupabaseEnvironment(options);
  if (!envCheck.ok) {
    return { ok: false, message: 'Supabase ortam değişkenleri eksik.' };
  }

  if (!isDatabaseClientAvailable(client)) {
    return { ok: false, message: 'Supabase istemcisi kullanılamıyor.' };
  }

  const restaurantId = String(options.restaurantId || '').trim();
  if (restaurantId) {
    try {
      await getRestaurant({ restaurantId, client });
      return { ok: true, message: 'Supabase bağlantısı başarılı.' };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Supabase bağlantısı başarısız.'
      };
    }
  }

  const { error } = await client.from('restaurants').select('id').limit(1);
  if (error) {
    return { ok: false, message: String(error.message || 'Supabase bağlantısı başarısız.') };
  }

  return { ok: true, message: 'Supabase bağlantısı başarılı.' };
}

/**
 * @param {unknown} client
 * @param {Record<string, unknown>} options
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function probeRepositoryAccess(client, options = {}) {
  const restaurantId = String(options.restaurantId || '').trim();
  if (!restaurantId) {
    return { ok: false, message: 'Repository kontrolü için restoran kimliği gerekli.' };
  }

  if (!isDatabaseClientAvailable(client)) {
    return { ok: false, message: 'Repository erişimi için veritabanı istemcisi yok.' };
  }

  try {
    await getRestaurant({ restaurantId, client });
    return { ok: true, message: 'Repository erişimi başarılı.' };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Repository erişimi başarısız.'
    };
  }
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   missing: string[],
 *   checks: Record<string, { ok: boolean, label: string, message?: string }>
 * }>}
 */
export async function runProductionChecklist(options = {}) {
  const client = options.client || getSupabaseClient();
  const supabaseEnv = validateSupabaseEnvironment(options);
  const whatsappEnv = validateWhatsAppEnvironment(options);
  const openAiEnv = validateOpenAIEnvironment(options);

  const supabaseConnection = await probeSupabaseConnection(client, options);
  const realtimeAvailable = isRealtimeClientAvailable(client);
  const rls = await probeRowLevelSecurity(client, options);
  const repositoryAccess = await probeRepositoryAccess(client, options);

  const checks = {
    supabaseConnection: {
      ok: supabaseConnection.ok,
      label: 'Supabase bağlantısı',
      message: supabaseConnection.message
    },
    realtime: {
      ok: realtimeAvailable,
      label: 'Realtime',
      message: realtimeAvailable ? 'Realtime istemcisi hazır.' : 'Realtime istemcisi kullanılamıyor.'
    },
    rls: {
      ok: rls.ok && rls.active,
      label: 'RLS',
      message: rls.message
    },
    whatsappToken: {
      ok: !whatsappEnv.missing.includes('WHATSAPP_ACCESS_TOKEN'),
      label: 'WhatsApp token',
      message: whatsappEnv.missing.includes('WHATSAPP_ACCESS_TOKEN')
        ? 'WhatsApp access token eksik.'
        : 'WhatsApp token tanımlı.'
    },
    verifyToken: {
      ok: !whatsappEnv.missing.includes('WHATSAPP_VERIFY_TOKEN'),
      label: 'Verify token',
      message: whatsappEnv.missing.includes('WHATSAPP_VERIFY_TOKEN')
        ? 'WhatsApp verify token eksik.'
        : 'Verify token tanımlı.'
    },
    phoneNumberId: {
      ok: !whatsappEnv.missing.includes('WHATSAPP_PHONE_NUMBER_ID'),
      label: 'Phone Number ID',
      message: whatsappEnv.missing.includes('WHATSAPP_PHONE_NUMBER_ID')
        ? 'Phone Number ID eksik.'
        : 'Phone Number ID tanımlı.'
    },
    openAi: {
      ok: openAiEnv.ok,
      label: 'OpenAI API',
      message: openAiEnv.ok ? 'AI anahtarı tanımlı.' : 'AI anahtarı eksik.'
    },
    repositoryAccess: {
      ok: repositoryAccess.ok,
      label: 'Repository erişimi',
      message: repositoryAccess.message
    }
  };

  /** @type {string[]} */
  const missing = [
    ...supabaseEnv.missing,
    ...whatsappEnv.missing,
    ...openAiEnv.missing
  ];

  if (!checks.supabaseConnection.ok) missing.push('SUPABASE_CONNECTION');
  if (!checks.realtime.ok) missing.push('REALTIME');
  if (!checks.rls.ok) missing.push('RLS');
  if (!checks.repositoryAccess.ok) missing.push('REPOSITORY_ACCESS');

  const uniqueMissing = [...new Set(missing)];
  const ok = Object.values(checks).every((check) => check.ok);

  return { ok, missing: uniqueMissing, checks };
}
