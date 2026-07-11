/**
 * GarsonAI Turkish production deployment report generator.
 */

/**
 * @param {boolean} ok
 * @returns {string}
 */
function formatLine(ok, successText, warningText) {
  return ok ? `✓ ${successText}` : `⚠ ${warningText}`;
}

/**
 * @param {{
 *   checklist?: {
 *     ok?: boolean,
 *     missing?: string[],
 *     checks?: Record<string, { ok?: boolean, label?: string, message?: string }>
 *   },
 *   health?: {
 *     overallStatus?: string,
 *     database?: { status?: string },
 *     realtime?: { status?: string },
 *     whatsapp?: { status?: string },
 *     ai?: { status?: string }
 *   },
 *   bootstrap?: {
 *     ok?: boolean,
 *     steps?: Array<{ name?: string, ok?: boolean, message?: string }>
 *   }
 * }} input
 * @returns {string}
 */
export function generateDeploymentReport(input = {}) {
  const checklist = input.checklist || {};
  const checks = checklist.checks || {};
  const health = input.health || {};
  const bootstrap = input.bootstrap || {};

  const lines = [
    'GarsonAI Production Activation Raporu',
    '=====================================',
    '',
    formatLine(
      checks.supabaseConnection?.ok === true,
      'Supabase bağlantısı başarılı',
      'Supabase bağlantısı kurulamadı'
    ),
    formatLine(
      checks.whatsappToken?.ok === true &&
        checks.verifyToken?.ok === true &&
        checks.phoneNumberId?.ok === true,
      'WhatsApp hazır',
      'WhatsApp yapılandırması eksik'
    ),
    formatLine(checks.realtime?.ok === true, 'Realtime aktif', 'Realtime aktif değil'),
    formatLine(checks.rls?.ok === true, 'RLS aktif', 'RLS kontrolü başarısız'),
    formatLine(checks.repositoryAccess?.ok === true, 'Repository erişimi başarılı', 'Repository erişimi başarısız'),
    formatLine(checks.openAi?.ok === true, 'OpenAI/AI anahtarı hazır', 'OpenAI anahtarı eksik'),
    '',
    `Genel sağlık: ${health.overallStatus || 'bilinmiyor'}`,
    `Checklist: ${checklist.ok ? 'tamam' : 'eksik'}`,
    `Bootstrap: ${bootstrap.ok ? 'tamam' : 'eksik'}`
  ];

  if (Array.isArray(checklist.missing) && checklist.missing.length) {
    lines.push('', 'Eksik öğeler:', ...checklist.missing.map((item) => `- ${item}`));
  }

  if (Array.isArray(bootstrap.steps) && bootstrap.steps.length) {
    lines.push('', 'Bootstrap adımları:');
    for (const step of bootstrap.steps) {
      lines.push(
        formatLine(
          step.ok === true,
          `${step.name}: ${step.message || 'tamam'}`,
          `${step.name}: ${step.message || 'eksik'}`
        )
      );
    }
  }

  return lines.join('\n');
}
