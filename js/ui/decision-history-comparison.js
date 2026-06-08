/**
 * Build comparison items from Decision History entries.
 * Uses existing createComparisonItemFromRecommendation factory — no new score calculations.
 */

import { normalizeHistoryEntryCategory } from './decision-history-category.js';
import { normalizeDecisionHistoryEntry } from './decision-history-compat.js';

/**
 * @param {unknown} insight
 * @returns {string | null}
 */
function resolveInsightHeadline(insight) {
    if (!insight) return null;
    if (typeof insight === 'string') {
        const trimmed = insight.trim();
        return trimmed || null;
    }
    if (typeof insight === 'object' && insight.headline) {
        const trimmed = String(insight.headline).trim();
        return trimmed || null;
    }
    return null;
}

/**
 * @param {object | null | undefined} entry
 * @returns {{ recommendation: object, result: object } | null}
 */
export function resolveHistoryPick(entry) {
    const normalizedEntry = normalizeDecisionHistoryEntry(entry);
    if (!normalizedEntry) return null;

    const topPick = normalizedEntry.topPick && typeof normalizedEntry.topPick === 'object'
        ? normalizedEntry.topPick
        : null;
    const recommendation = Array.isArray(normalizedEntry.recommendations)
        ? normalizedEntry.recommendations[0]
        : null;
    const name = topPick?.name || recommendation?.name;
    const category = normalizeHistoryEntryCategory(normalizedEntry);
    if (!name || category.categoryId === 'unknown') return null;

    const monthlyPayment = topPick?.monthlyPayment;
    const financeComparisons = recommendation?.financeComparisons
        || (monthlyPayment !== undefined && monthlyPayment !== null
            ? [{ monthlyPayment }]
            : []);

    return {
        recommendation: {
            name,
            score: normalizedEntry.score ?? topPick?.score ?? recommendation?.score,
            price: topPick?.price ?? recommendation?.price,
            yearlyCost: normalizedEntry.yearlyCost ?? topPick?.yearlyCost ?? recommendation?.yearlyCost,
            riskLevel: normalizedEntry.riskLevel ?? topPick?.riskLevel ?? recommendation?.riskLevel,
            financeComparisons,
            decisionTags: Array.isArray(normalizedEntry.profileTags)
                ? normalizedEntry.profileTags
                : (recommendation?.decisionTags || []),
            scoreNote: typeof normalizedEntry.summary === 'string'
                ? normalizedEntry.summary
                : (recommendation?.scoreNote || ''),
            realisticComment: resolveInsightHeadline(normalizedEntry.insight)
                || (typeof normalizedEntry.summary === 'string' ? normalizedEntry.summary : '')
                || recommendation?.realisticComment
                || recommendation?.scoreNote
                || '',
            details: recommendation?.details || [],
            calculationTable: recommendation?.calculationTable
        },
        result: {
            categoryId: category.categoryId,
            categoryName: category.categoryName
        }
    };
}

/**
 * @param {object | null | undefined} entry
 * @returns {boolean}
 */
export function canAddHistoryEntryToComparison(entry) {
    return Boolean(resolveHistoryPick(entry));
}

/**
 * @param {object | null | undefined} entry
 * @param {(recommendation: object, result: object) => object} createComparisonItemFromRecommendation
 * @returns {object | null}
 */
export function buildComparisonItemFromHistoryEntry(entry, createComparisonItemFromRecommendation) {
    const pick = resolveHistoryPick(entry);
    if (!pick || typeof createComparisonItemFromRecommendation !== 'function') return null;
    return createComparisonItemFromRecommendation(pick.recommendation, pick.result);
}
