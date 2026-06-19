/**
 * Read-time Decision History compatibility layer.
 * Normalizes legacy localStorage entries without persisting changes.
 */

import { DECISION_HISTORY_SCHEMA_VERSION } from './decision-history-entry.js';
import { normalizeDecisionCategory } from './decision-history-category.js';

export const DECISION_HISTORY_LEGACY_CREATED_AT_FALLBACK = '1970-01-01T00:00:00.000Z';

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toNullableNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

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
 * @param {unknown} entry
 * @returns {entry is object}
 */
function isValidEntryObject(entry) {
    return Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry);
}

/**
 * @param {object} entry
 * @returns {string | null}
 */
function resolveLegacyEntryId(entry) {
    const id = String(entry.id || '').trim();
    if (id) return id;

    const name = entry.topPick?.name || entry.recommendations?.[0]?.name;
    if (!name) return null;

    const createdAt = entry.createdAt || DECISION_HISTORY_LEGACY_CREATED_AT_FALLBACK;
    const categoryId = String(entry.categoryId || 'unknown').trim() || 'unknown';
    return `legacy:${categoryId}:${createdAt}:${name}`;
}

/**
 * @param {object} entry
 * @returns {object | null}
 */
function buildLegacyTopPick(entry, recommendation, score, yearlyCost, riskLevel) {
    const existingTopPick = entry.topPick && typeof entry.topPick === 'object' ? entry.topPick : null;
    const name = existingTopPick?.name || recommendation?.name || null;
    if (!name) return null;

    return {
        name,
        score: score ?? existingTopPick?.score ?? recommendation?.score ?? null,
        price: toNullableNumber(existingTopPick?.price ?? recommendation?.price) ?? 0,
        yearlyCost,
        riskLevel,
        monthlyPayment: toNullableNumber(
            existingTopPick?.monthlyPayment ?? recommendation?.financeComparisons?.[0]?.monthlyPayment
        ) ?? 0
    };
}

/**
 * @param {object} entry
 * @returns {object | null}
 */
function normalizeLegacyDecisionHistoryEntry(entry) {
    const id = resolveLegacyEntryId(entry);
    if (!id) return null;

    const recommendation = Array.isArray(entry.recommendations) ? entry.recommendations[0] : null;
    const existingTopPick = entry.topPick && typeof entry.topPick === 'object' ? entry.topPick : null;

    const score = toNullableNumber(entry.score ?? existingTopPick?.score ?? recommendation?.score);
    const yearlyCost = toNullableNumber(entry.yearlyCost ?? existingTopPick?.yearlyCost ?? recommendation?.yearlyCost);
    const riskLevel = entry.riskLevel ?? existingTopPick?.riskLevel ?? recommendation?.riskLevel ?? null;
    const topPick = buildLegacyTopPick(entry, recommendation, score, yearlyCost, riskLevel);

    const category = normalizeDecisionCategory({
        categoryId: entry.categoryId,
        categoryName: entry.categoryName
    });
    const preserveOriginalCategory = category.originalCategoryId !== category.categoryId
        || (category.originalCategoryName && category.originalCategoryName !== category.label);

    const decisionProfile = entry.decisionProfile
        ?? resolveInsightHeadline(entry.insight)
        ?? (typeof entry.summary === 'string' ? entry.summary.trim() : null)
        ?? category.label;

    const profileTags = Array.isArray(entry.profileTags)
        ? entry.profileTags.slice(0, 3)
        : (Array.isArray(recommendation?.decisionTags) ? recommendation.decisionTags.slice(0, 3) : []);

    const confidenceLabel = entry.confidenceLabel
        ?? (entry.dataHealth?.confidenceLabel ? String(entry.dataHealth.confidenceLabel) : null);

    const tcoLabel = entry.tcoLabel
        ?? recommendation?.calculationTable?.totalLabel
        ?? null;

    return {
        ...entry,
        id,
        categoryId: category.categoryId,
        categoryName: category.label,
        createdAt: entry.createdAt || DECISION_HISTORY_LEGACY_CREATED_AT_FALLBACK,
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
        topPick,
        source: entry.source || category.source,
        rawAnswers: entry.rawAnswers || {},
        answers: Array.isArray(entry.answers)
            ? entry.answers
            : Object.entries(entry.answers || {}).map(([label, value]) => ({ label, value })),
        recommendations: Array.isArray(entry.recommendations)
            ? entry.recommendations
            : (topPick ? [{
                name: topPick.name,
                score: topPick.score,
                price: topPick.price,
                yearlyCost: topPick.yearlyCost,
                riskLevel: topPick.riskLevel
            }] : [])
    };
}

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
export function isDecisionHistorySchemaV1(entry) {
    return isValidEntryObject(entry) && Number(entry.schemaVersion) === DECISION_HISTORY_SCHEMA_VERSION;
}

/**
 * @param {unknown} entry
 * @returns {object | null}
 */
export function normalizeDecisionHistoryEntry(entry) {
    if (!isValidEntryObject(entry)) return null;
    if (isDecisionHistorySchemaV1(entry)) {
        return { ...entry };
    }
    return normalizeLegacyDecisionHistoryEntry(entry);
}

/**
 * @param {unknown} entries
 * @returns {Array<object>}
 */
export function normalizeDecisionHistoryList(entries) {
    const list = Array.isArray(entries) ? entries : [];
    return list
        .map((entry) => normalizeDecisionHistoryEntry(entry))
        .filter(Boolean);
}

/**
 * @param {unknown} entry
 * @param {string | undefined} decisionId
 * @returns {boolean}
 */
export function matchesDecisionHistoryActionId(entry, decisionId) {
    if (!decisionId) return false;
    if (isValidEntryObject(entry) && entry.id === decisionId) return true;
    const normalized = normalizeDecisionHistoryEntry(entry);
    return normalized?.id === decisionId;
}

/**
 * @param {unknown} history
 * @param {string | undefined} decisionId
 * @returns {object | null}
 */
export function findDecisionHistoryEntryByActionId(history, decisionId) {
    const list = Array.isArray(history) ? history : [];
    return list.find((item) => matchesDecisionHistoryActionId(item, decisionId)) || null;
}
