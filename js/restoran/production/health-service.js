/**
 * GarsonAI production health service.
 */
import { runProductionChecklist } from './activation-checklist.js';

/**
 * @typedef {'healthy'|'warning'|'critical'} HealthStatus
 */

/**
 * @param {boolean} ok
 * @param {'required'|'optional'} severity
 * @returns {HealthStatus}
 */
function mapCheckToStatus(ok, severity = 'required') {
  if (ok) return 'healthy';
  return severity === 'required' ? 'critical' : 'warning';
}

/**
 * @param {HealthStatus[]} statuses
 * @returns {HealthStatus}
 */
function resolveOverallStatus(statuses) {
  if (statuses.includes('critical')) return 'critical';
  if (statuses.includes('warning')) return 'warning';
  return 'healthy';
}

/**
 * @param {Record<string, unknown>} [options]
 * @returns {Promise<{
 *   database: { status: HealthStatus, message: string },
 *   realtime: { status: HealthStatus, message: string },
 *   whatsapp: { status: HealthStatus, message: string },
 *   ai: { status: HealthStatus, message: string },
 *   overallStatus: HealthStatus
 * }>}
 */
export async function getProductionHealth(options = {}) {
  const checklist = await runProductionChecklist(options);

  const database = {
    status: mapCheckToStatus(
      checklist.checks.supabaseConnection.ok && checklist.checks.repositoryAccess.ok,
      'required'
    ),
    message:
      checklist.checks.supabaseConnection.message ||
      checklist.checks.repositoryAccess.message ||
      'Veritabanı durumu bilinmiyor.'
  };

  const realtime = {
    status: mapCheckToStatus(checklist.checks.realtime.ok, 'required'),
    message: checklist.checks.realtime.message || 'Realtime durumu bilinmiyor.'
  };

  const whatsappReady =
    checklist.checks.whatsappToken.ok &&
    checklist.checks.verifyToken.ok &&
    checklist.checks.phoneNumberId.ok;

  const whatsapp = {
    status: mapCheckToStatus(whatsappReady, 'optional'),
    message: whatsappReady ? 'WhatsApp production hazır.' : 'WhatsApp yapılandırması eksik.'
  };

  const ai = {
    status: mapCheckToStatus(checklist.checks.openAi.ok, 'optional'),
    message: checklist.checks.openAi.message || 'AI durumu bilinmiyor.'
  };

  if (!checklist.checks.rls.ok) {
    database.status = 'critical';
    database.message = checklist.checks.rls.message || 'RLS aktif değil.';
  }

  const overallStatus = resolveOverallStatus([
    database.status,
    realtime.status,
    whatsapp.status,
    ai.status
  ]);

  return {
    database,
    realtime,
    whatsapp,
    ai,
    overallStatus
  };
}
