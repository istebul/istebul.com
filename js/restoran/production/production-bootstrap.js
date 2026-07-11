/**
 * GarsonAI production bootstrap sequence.
 */
import { getSupabaseClient } from '../../core/supabase.js';
import { getRestaurant } from '../database/restaurant-repository.js';
import { isDatabaseClientAvailable } from '../database/tenant-utils.js';
import { loadProductionDashboardDataset } from '../dashboard/ai-dashboard-service.js';
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
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<{
 *   ok: boolean,
 *   missing: string[],
 *   steps: Array<{ name: string, ok: boolean, message: string }>
 * }>}
 */
export async function bootstrapProduction(options = {}) {
  const client = options.client || getSupabaseClient();
  const restaurantId = String(options.restaurantId || '').trim();
  /** @type {string[]} */
  const missing = [];
  /** @type {Array<{ name: string, ok: boolean, message: string }>} */
  const steps = [];

  const supabaseEnv = validateSupabaseEnvironment(options);
  const whatsappEnv = validateWhatsAppEnvironment(options);
  const openAiEnv = validateOpenAIEnvironment(options);
  const environmentOk = supabaseEnv.ok && whatsappEnv.ok && openAiEnv.ok;

  if (!supabaseEnv.ok) missing.push(...supabaseEnv.missing);
  if (!whatsappEnv.ok) missing.push(...whatsappEnv.missing);
  if (!openAiEnv.ok) missing.push(...openAiEnv.missing);

  steps.push({
    name: 'environment',
    ok: environmentOk,
    message: environmentOk
      ? 'Production ortam değişkenleri hazır.'
      : 'Production ortam değişkenleri eksik.'
  });

  let databaseOk = false;
  if (supabaseEnv.ok && isDatabaseClientAvailable(client)) {
    if (restaurantId) {
      try {
        await getRestaurant({ restaurantId, client });
        databaseOk = true;
      } catch {
        databaseOk = false;
      }
    } else {
      const { error } = await client.from('restaurants').select('id').limit(1);
      databaseOk = !error;
    }
  }

  if (!databaseOk) missing.push('DATABASE_BOOTSTRAP');
  steps.push({
    name: 'database',
    ok: databaseOk,
    message: databaseOk ? 'Veritabanı katmanı hazır.' : 'Veritabanı katmanı başlatılamadı.'
  });

  const realtimeOk = isRealtimeClientAvailable(client);
  if (!realtimeOk) missing.push('REALTIME_BOOTSTRAP');
  steps.push({
    name: 'realtime',
    ok: realtimeOk,
    message: realtimeOk ? 'Realtime katmanı hazır.' : 'Realtime katmanı başlatılamadı.'
  });

  const whatsappOk = whatsappEnv.ok;
  steps.push({
    name: 'whatsapp',
    ok: whatsappOk,
    message: whatsappOk ? 'WhatsApp production katmanı hazır.' : 'WhatsApp yapılandırması eksik.'
  });

  const aiOk = openAiEnv.ok;
  steps.push({
    name: 'ai',
    ok: aiOk,
    message: aiOk ? 'AI katmanı hazır.' : 'AI yapılandırması eksik.'
  });

  let dashboardOk = false;
  if (!restaurantId) {
    dashboardOk = databaseOk;
    steps.push({
      name: 'dashboard',
      ok: dashboardOk,
      message: dashboardOk
        ? 'Dashboard bootstrap restoran kimliği olmadan atlandı.'
        : 'Dashboard bootstrap için veritabanı gerekli.'
    });
  } else {
    try {
      await loadProductionDashboardDataset({
        restaurantId,
        client,
        useSupabase: true,
        ...options
      });
      dashboardOk = true;
    } catch {
      dashboardOk = false;
    }

    if (!dashboardOk) missing.push('DASHBOARD_BOOTSTRAP');
    steps.push({
      name: 'dashboard',
      ok: dashboardOk,
      message: dashboardOk ? 'Dashboard veri seti yüklendi.' : 'Dashboard bootstrap başarısız.'
    });
  }

  return {
    ok: steps.every((step) => step.ok),
    missing: [...new Set(missing)],
    steps
  };
}
