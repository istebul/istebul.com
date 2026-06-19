/**
 * P5.4 — Revisit triggers: inactivity prompts + lifecycle optimization hooks.
 */
import { readStorageRaw, writeStorageRaw, STORAGE_KEYS } from '../../core/storage-keys.js';
import { analytics } from '../../core/analytics.js';
import { trackGrowth } from './growth-engine.js';
import { listSavedDecisions } from './retention-saved-decisions.js';
import { getHabitState, getEngagementScore } from './retention-habits.js';
import { enrollReactivationLifecycle } from './retention-reactivation.js';
import { enrollLifecycle } from '../lifecycle/lifecycle-client.js';
import { pickLifecycleFlowForRetention } from './retention-lifecycle-optimizer.js';

const PROMPT_KEY = 'istebul_retention_last_prompt';
const LAST_VISIT_KEY = 'istebul_last_visit_at';

function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function promptCooldownOk(cooldownHours = 48) {
  try {
    const last = readStorageRaw(PROMPT_KEY);
    if (!last) return true;
    return Date.now() - new Date(last).getTime() > cooldownHours * 3600000;
  } catch {
    return true;
  }
}

function markPromptShown() {
  writeStorageRaw(PROMPT_KEY, new Date().toISOString());
}

/**
 * @param {import('../../../data/growth/retention-framework.json')} [config]
 */
export function evaluateRevisitTrigger(config = {}) {
  const triggers = config.revisitTriggers || {};
  const lastVisit = readStorageRaw(LAST_VISIT_KEY);
  if (!lastVisit) {
    return { level: 'none', inactiveDays: 0 };
  }

  const inactive = daysSince(lastVisit);
  const saved = listSavedDecisions();
  const habit = getHabitState();
  const score = getEngagementScore();

  if (inactive < (triggers.inactiveDaysSoft || 3)) {
    return { level: 'none', inactiveDays: inactive };
  }

  if (!promptCooldownOk(triggers.promptCooldownHours)) {
    return { level: 'cooldown', inactiveDays: inactive };
  }

  if (inactive >= (triggers.inactiveDaysReactivation || 14)) {
    return {
      level: 'reactivation',
      inactiveDays: inactive,
      savedCount: saved.length,
      streakWeeks: habit.streakWeeks,
      engagementScore: score,
      ctaPath: saved[0]?.revisitPath || '/karar-asistani/',
      message:
        'Uzun süredir görüşemedik — kayıtlı kararınıza dönmek veya yeni analiz başlatmak için tek tık.'
    };
  }

  if (inactive >= (triggers.inactiveDaysHard || 7)) {
    return {
      level: 'hard',
      inactiveDays: inactive,
      savedCount: saved.length,
      ctaPath: saved[0]?.revisitPath || '/profil#gecmis',
      message:
        saved.length
          ? `${saved.length} kayıtlı kararınız var. Son analizi yeniden açın veya güncelleyin.`
          : 'Karar geçmişinizi kaydedin — ücretsiz TCO analizi ile devam edin.'
    };
  }

  return {
    level: 'soft',
    inactiveDays: inactive,
    savedCount: saved.length,
    ctaPath: '/auto/',
    message: 'Haftalık araç maliyeti kontrolü alışkanlığı — 2 dakikada güncel TCO özeti.'
  };
}

/**
 * @param {ReturnType<typeof evaluateRevisitTrigger>} trigger
 */
export async function fireRevisitLifecycle(trigger) {
  if (!trigger || trigger.level === 'none' || trigger.level === 'cooldown') return;

  if (trigger.level === 'reactivation') {
    await enrollReactivationLifecycle({
      days_inactive: trigger.inactiveDays,
      engagement_score: trigger.engagementScore,
      saved_decisions_count: trigger.savedCount
    });
    if (analytics.hasConsent()) {
      trackGrowth(
        'retention_revisit_triggered',
        { level: trigger.level, flow: 'reactivation_ltv', inactive_days: trigger.inactiveDays },
        { funnel: 'retention', funnel_step: 'revisit_trigger' }
      );
    }
    return;
  }

  const flowId = pickLifecycleFlowForRetention(trigger);
  const email = readStorageRaw(STORAGE_KEYS.AUTO_LEAD_EMAIL);

  await enrollLifecycle(flowId, {
    email,
    service_opt_in: true,
    context: {
      inactive_days: trigger.inactiveDays,
      saved_count: trigger.savedCount,
      engagement_score: trigger.engagementScore
    },
    trigger_source: 'retention_revisit_trigger',
    restart: true
  });

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_revisit_triggered',
      { level: trigger.level, flow: flowId, inactive_days: trigger.inactiveDays },
      { funnel: 'retention', funnel_step: 'revisit_trigger' }
    );
  }
}

export function trackRevisitPromptShown(trigger) {
  markPromptShown();
  if (analytics.hasConsent() && trigger?.level) {
    trackGrowth(
      'retention_revisit_prompt',
      { level: trigger.level, inactive_days: trigger.inactiveDays },
      { funnel: 'retention', funnel_step: 'prompt' }
    );
  }
}
