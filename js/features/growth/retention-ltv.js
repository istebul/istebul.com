/**
 * P5.4 — Retention LTV engine orchestrator.
 */
import { analytics } from '../../core/analytics.js';
import { initRetentionEngine, recordEngagement } from './retention-engine.js';
import { saveDecisionSnapshot, markDecisionRevisited } from './retention-saved-decisions.js';
import { recordHabitAction, tickWeeklyVisit } from './retention-habits.js';
import {
  parseReactivationContext,
  handleReactivationLanding
} from './retention-reactivation.js';
import {
  evaluateRevisitTrigger,
  fireRevisitLifecycle,
  trackRevisitPromptShown
} from './retention-revisit.js';
import { renderRetentionPrompt } from './retention-prompt-ui.js';

let frameworkCache = null;

async function loadFramework() {
  if (frameworkCache) return frameworkCache;
  try {
    const res = await fetch('/data/growth/retention-framework.json');
    frameworkCache = res.ok ? await res.json() : {};
  } catch {
    frameworkCache = {};
  }
  return frameworkCache;
}

export async function initRetentionLtvEngine() {
  if (typeof window === 'undefined') return;

  const framework = await loadFramework();
  const milestones = framework.habitLoop?.streakMilestones || [2, 4, 8];

  const reactivation = parseReactivationContext();
  if (reactivation) {
    handleReactivationLanding(reactivation);
    recordEngagement('reactivation_land', 2);
  }

  const trigger = evaluateRevisitTrigger(framework);
  if (trigger.level !== 'none' && trigger.level !== 'cooldown') {
    renderRetentionPrompt(trigger);
    trackRevisitPromptShown(trigger);
    if (analytics.hasConsent()) {
      fireRevisitLifecycle(trigger).catch(() => {});
    }
  }

  initRetentionEngine();
  tickWeeklyVisit(milestones);

  document.addEventListener('retention:decision-saved', (event) => {
    handleRetentionDecisionSaved(event.detail || {}, framework.habitLoop?.engagementWeights);
  });

  window.addEventListener('pageshow', () => {
    tickWeeklyVisit(milestones);
  });

  document.addEventListener('cookieConsentAccepted', () => {
    if (trigger.level !== 'none' && trigger.level !== 'cooldown' && analytics.hasConsent()) {
      fireRevisitLifecycle(trigger).catch(() => {});
    }
  });
}

/**
 * @param {object} [detail]
 * @param {Record<string, number>} [habitWeights]
 */
export function handleRetentionDecisionSaved(detail = {}, habitWeights) {
  saveDecisionSnapshot(detail);
  if (detail.passive !== true) {
    recordHabitAction('saved_decision', undefined, habitWeights);
  }
}

/** Bridge for modules without direct analytics import */
export function notifyDecisionSaved(snapshot) {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent('retention:decision-saved', { detail: snapshot }));
}

export function notifyDecisionRevisited(decisionId, userId) {
  markDecisionRevisited(decisionId, userId);
  recordHabitAction('results_view');
}

export { saveDecisionSnapshot, listSavedDecisions } from './retention-saved-decisions.js';
export { getHabitState, getEngagementScore, recordHabitAction } from './retention-habits.js';
export { evaluateRevisitTrigger } from './retention-revisit.js';
