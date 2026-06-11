/**
 * Canonical client-side Decision History entry builder.
 * Normalizes existing deterministic result signals — no engine calls or new calculations.
 */

import { buildDecisionResultSummary } from './decision-result-summary.js';
import {
    normalizeDecisionCategory,
    resolveDecisionCategorySource
} from './decision-history-category.js';

export const DECISION_HISTORY_SCHEMA_VERSION = 1;

/**
 * @param {string | undefined} categoryId
 * @param {string | undefined} explicitSource
 * @returns {'assistant' | 'auto' | 'konut' | 'bridge'}
 */
export function resolveDecisionHistorySource(categoryId, explicitSource) {
    if (explicitSource) return explicitSource;
    return resolveDecisionCategorySource(categoryId);
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toNullableNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

/**
 * @param {object | null | undefined} result
 * @param {{ source?: string }} [options]
 * @returns {object | null}
 */
export function buildDecisionHistoryEntry(result, options = {}) {
    const primary = result?.recommendations?.[0];
    if (!result || !primary) return null;

    const summary = buildDecisionResultSummary(result);
    const insight = result.insight;
    const insightHeadline = typeof insight === 'string' ? insight : insight?.headline;
    const dataHealth = result.dataHealth && typeof result.dataHealth === 'object' ? result.dataHealth : null;
    const profileTags = Array.isArray(primary.decisionTags) ? primary.decisionTags.slice(0, 3) : [];

    const score = toNullableNumber(primary.score);
    const yearlyCost = toNullableNumber(primary.yearlyCost);
    const riskLevel = primary.riskLevel ? String(primary.riskLevel) : null;
    const confidenceLabel = dataHealth?.confidenceLabel ? String(dataHealth.confidenceLabel) : null;
    const tcoLabel = primary.calculationTable?.totalLabel
        || summary?.tco?.detail
        || null;
    const decisionProfile = summary?.profile?.value
        || insightHeadline
        || result.categoryName
        || null;

    const topPick = {
        name: primary.name || 'Kaydedilen karar',
        score: score,
        price: toNullableNumber(primary.price) ?? 0,
        yearlyCost: yearlyCost,
        riskLevel: riskLevel,
        monthlyPayment: toNullableNumber(primary.financeComparisons?.[0]?.monthlyPayment) ?? 0
    };

    const category = normalizeDecisionCategory({
        categoryId: result.categoryId,
        categoryName: result.categoryName
    });
    const preserveOriginalCategory = category.originalCategoryId !== category.categoryId
        || (category.originalCategoryName && category.originalCategoryName !== category.label);

    return {
        id: result.id,
        categoryId: category.categoryId,
        categoryName: category.label,
        createdAt: result.createdAt || new Date().toISOString(),
        schemaVersion: DECISION_HISTORY_SCHEMA_VERSION,

        ...(preserveOriginalCategory ? {
            originalCategoryId: category.originalCategoryId,
            originalCategoryName: category.originalCategoryName
        } : {}),

        score,
        riskLevel,
        yearlyCost,
        decisionProfile,
        profileTags,
        confidenceLabel,
        tcoLabel,
        resultSummary: summary || null,

        rawAnswers: result.rawAnswers || {},
        answers: result.answers || [],

        topPick,

        source: resolveDecisionHistorySource(category.categoryId, options.source || result.source),

        // Backward-compatible fields for existing history UI and readers
        summary: result.summary,
        insight: result.insight,
        dataHealth: result.dataHealth,
        recommendations: Array.isArray(result.recommendations)
            ? result.recommendations.map((item) => ({
                name: item.name,
                score: item.score,
                price: item.price,
                yearlyCost: item.yearlyCost
            }))
            : []
    };
}

/**
 * @param {Array<object>} history
 * @param {object | null} entry
 * @param {number} [max]
 * @returns {Array<object>}
 */
export function mergeDecisionHistoryEntry(history, entry, max = 12) {
    const list = Array.isArray(history) ? history : [];
    if (!entry?.id) return list;
    return [entry, ...list.filter((item) => item.id !== entry.id)].slice(0, max);
}
