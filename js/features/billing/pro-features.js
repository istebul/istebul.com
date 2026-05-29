/**
 * Pro özellik matrisi — V1 (client guard; yetki subscriptions tablosundan).
 */
import { FREE_LIMITS } from '../monetization/plans.js';

export const PRO_FEATURE = Object.freeze({
  BASIC_DECISION_SCORE: 'basic_decision_score',
  BASIC_AI_SUMMARY: 'basic_ai_summary',
  LIMITED_PDF: 'limited_pdf',
  LIMITED_COMPARISON: 'limited_comparison',
  UNLIMITED_ANALYSIS: 'unlimited_analysis',
  PREMIUM_PDF_REPORT: 'premium_pdf_report',
  PDF_HISTORY: 'pdf_history',
  ADVANCED_AI_SUMMARY: 'advanced_ai_summary',
  SCENARIO_ANALYSIS: 'scenario_analysis',
  COMPARISON_ADVANCED: 'comparison_advanced',
  FAVORITES_HISTORY: 'favorites_history'
});

const FREE_ALLOWED = new Set([
  PRO_FEATURE.BASIC_DECISION_SCORE,
  PRO_FEATURE.BASIC_AI_SUMMARY,
  PRO_FEATURE.LIMITED_PDF,
  PRO_FEATURE.LIMITED_COMPARISON
]);

const PRO_ONLY = new Set([
  PRO_FEATURE.UNLIMITED_ANALYSIS,
  PRO_FEATURE.PREMIUM_PDF_REPORT,
  PRO_FEATURE.PDF_HISTORY,
  PRO_FEATURE.ADVANCED_AI_SUMMARY,
  PRO_FEATURE.SCENARIO_ANALYSIS,
  PRO_FEATURE.COMPARISON_ADVANCED,
  PRO_FEATURE.FAVORITES_HISTORY
]);

export const PRO_FEATURE_COPY = Object.freeze({
  [PRO_FEATURE.UNLIMITED_ANALYSIS]: 'Sınırsız analiz',
  [PRO_FEATURE.PREMIUM_PDF_REPORT]: 'Gelişmiş PDF rapor',
  [PRO_FEATURE.PDF_HISTORY]: 'PDF geçmişi',
  [PRO_FEATURE.ADVANCED_AI_SUMMARY]: 'Gelişmiş AI Executive Summary',
  [PRO_FEATURE.SCENARIO_ANALYSIS]: 'Senaryo analizi',
  [PRO_FEATURE.COMPARISON_ADVANCED]: 'Çoklu karşılaştırma',
  [PRO_FEATURE.FAVORITES_HISTORY]: 'Favoriler ve geçmiş'
});

/**
 * @param {string} [status]
 */
export function isProSubscriptionStatus(status) {
  return ['active', 'trialing', 'past_due'].includes(String(status || ''));
}

const PRO_PLAN_IDS = new Set(['pro', 'enterprise']);

function hasActiveProPlan(plan, status) {
  return PRO_PLAN_IDS.has(String(plan || '').toLowerCase()) && isProSubscriptionStatus(status);
}

/**
 * Resolve subscription tier for AI insight, PDF and paywall surfaces.
 * @param {object|null} [user]
 * @param {object} [ctx]
 * @param {boolean} [ctx.isPro]
 * @param {boolean} [ctx.isAuthenticated]
 * @param {object} [ctx.profile]
 * @param {object} [ctx.subscription]
 * @returns {{ isPro: boolean, planTier: 'guest'|'free'|'pro' }}
 */
export function resolveProPlan(user = null, ctx = {}) {
  if (ctx.isPro === true) return { isPro: true, planTier: 'pro' };

  const profile = ctx.profile || user?.profile || null;
  const subscription = ctx.subscription || ctx.subscription || null;
  const isAuthenticated = Boolean(ctx.isAuthenticated ?? user?.id);

  if (profile && hasActiveProPlan(profile.plan, profile.subscription_status)) {
    return { isPro: true, planTier: 'pro' };
  }
  if (subscription && isProSubscriptionStatus(subscription.status)) {
    return { isPro: true, planTier: 'pro' };
  }
  if (isAuthenticated) return { isPro: false, planTier: 'free' };
  return { isPro: false, planTier: 'guest' };
}

/** Sprint alias — resolveIsPro(user) object form. */
export const resolveIsProPlan = resolveProPlan;

/**
 * @param {object} [ctx]
 * @param {boolean} [ctx.isPro]
 * @param {object} [ctx.profile]
 * @param {object} [ctx.subscription]
 */
export function resolveIsPro(ctx = {}) {
  return resolveProPlan(ctx.user || null, ctx).isPro;
}

/**
 * @param {string} feature
 * @param {object} [ctx]
 */
export function canAccessProFeature(feature, ctx = {}) {
  const isPro = resolveIsPro(ctx);
  if (isPro) return true;
  if (FREE_ALLOWED.has(feature)) return true;
  if (PRO_ONLY.has(feature)) return false;
  return true;
}

export function getComparisonLimit(isPro) {
  return isPro ? 8 : FREE_LIMITS.maxComparisons;
}

export function getPdfMonthlyLimit(isPro) {
  return isPro ? 999 : 2;
}
