/**
 * Intent → Karar Asistanı assistantAnswers mapper (MVP: arac only).
 */

import {
  normalizeAssistantIntent,
  parseBudgetMax,
  normalizeIntentFuel,
  normalizeIntentBody,
  normalizeIntentUsage,
  deriveAssistantPriorityFromIntent,
  normalizeIntentStringList,
  normalizeIntentCategoryId
} from './assistant-intent-schema.js';

/**
 * @typedef {Object} IntentAssistantMapResult
 * @property {string} categoryId
 * @property {Record<string, string|number>} answers
 * @property {{ mustHaves: string[], dealBreakers: string[], missingQuestions: string[] }} summary
 */

/**
 * @param {Record<string, unknown>|null|undefined} intent
 * @returns {IntentAssistantMapResult|null}
 */
export function mapIntentToAssistantAnswers(intent) {
  try {
    const normalized = normalizeAssistantIntent(intent);
    if (!normalized) return null;

    /** @type {Record<string, string|number>} */
    const answers = {};

    if (normalized.budgetMax != null) {
      answers.budget = normalized.budgetMax;
    }
    if (normalized.usage) {
      answers.usage = normalized.usage;
    }
    if (normalized.fuel) {
      answers.fuel = normalized.fuel;
    }
    if (normalized.body) {
      answers.body = normalized.body;
    }
    if (normalized.priority) {
      answers.priority = normalized.priority;
    }

    return {
      categoryId: normalized.categoryId,
      answers,
      summary: {
        mustHaves: normalized.mustHaves,
        dealBreakers: normalized.dealBreakers,
        missingQuestions: normalized.missingQuestions
      }
    };
  } catch {
    return null;
  }
}

export {
  normalizeAssistantIntent,
  parseBudgetMax,
  normalizeIntentFuel,
  normalizeIntentBody,
  normalizeIntentUsage,
  deriveAssistantPriorityFromIntent,
  normalizeIntentStringList,
  normalizeIntentCategoryId
};
