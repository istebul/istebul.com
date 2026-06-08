/**
 * Read-only Decision Memory context for Karar Merkezi entry.
 * Surfaces existing deterministic history signals — no scoring, TCO, risk engines, or persistence.
 */

import {
    buildDecisionMemoryInsightsModel,
    DECISION_MEMORY_INSIGHTS_MIN
} from './decision-memory-insights.js';

export const DECISION_MEMORY_CONTEXT_TITLE = 'Karar hafızasından bağlam';
export const DECISION_MEMORY_CONTEXT_DESCRIPTION =
    'Bu bilgiler geçmiş karar kayıtlarınızdaki mevcut sinyallerden oluşturulur.';

const CONTEXT_SIGNAL_KEYS = Object.freeze([
    'top-category',
    'risk-tendency',
    'top-profile'
]);

/**
 * @param {object | null | undefined} insightsModel
 * @returns {boolean}
 */
export function shouldRenderDecisionMemoryContext(insightsModel) {
    if (!insightsModel || insightsModel.softState) return false;
    if (Number(insightsModel.entryCount || 0) < DECISION_MEMORY_INSIGHTS_MIN) return false;
    if (!Array.isArray(insightsModel.insights) || !insightsModel.insights.length) return false;
    return CONTEXT_SIGNAL_KEYS.some((key) =>
        insightsModel.insights.some((item) => item?.key === key && item?.value)
    );
}

/**
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
function stripCountSuffix(value) {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const match = text.match(/^(.+?)\s*\(/);
    return (match ? match[1] : text).trim() || null;
}

/**
 * @param {object | null | undefined} insightsModel
 * @param {string} key
 * @returns {object | null}
 */
function insightByKey(insightsModel, key) {
    return insightsModel?.insights?.find((item) => item?.key === key && item?.value) || null;
}

/**
 * @param {object | null | undefined} insightsModel
 * @returns {string | null}
 */
export function buildDecisionMemoryContextSummary(insightsModel) {
    if (!shouldRenderDecisionMemoryContext(insightsModel)) return null;

    const risk = insightByKey(insightsModel, 'risk-tendency');
    if (risk) {
        const riskLabel = stripCountSuffix(risk.value);
        if (riskLabel) {
            return `Geçmiş kararlarınızda ${riskLabel.toLowerCase()} profili daha sık görülüyor.`;
        }
    }

    const category = insightByKey(insightsModel, 'top-category');
    if (category) {
        const categoryLabel = stripCountSuffix(category.value);
        if (categoryLabel) {
            return `Geçmiş kararlarınızda ${categoryLabel} kategorisi daha sık görülüyor.`;
        }
    }

    const profile = insightByKey(insightsModel, 'top-profile');
    if (profile?.value) {
        return `Geçmiş kararlarınızda "${String(profile.value).trim()}" profili daha sık görülüyor.`;
    }

    return null;
}

/**
 * @param {Array<object>} history
 * @returns {object | null}
 */
export function buildDecisionMemoryContextModel(history = []) {
    const insightsModel = buildDecisionMemoryInsightsModel(history);
    if (!shouldRenderDecisionMemoryContext(insightsModel)) return null;

    const summary = buildDecisionMemoryContextSummary(insightsModel);
    if (!summary) return null;

    const signals = CONTEXT_SIGNAL_KEYS
        .map((key) => insightByKey(insightsModel, key))
        .filter(Boolean)
        .map((item) => ({
            key: item.key,
            label: item.label,
            value: item.value
        }));

    return {
        title: DECISION_MEMORY_CONTEXT_TITLE,
        description: DECISION_MEMORY_CONTEXT_DESCRIPTION,
        summary,
        signals
    };
}

/**
 * @param {object | null | undefined} model
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function renderDecisionMemoryContextHtml(model, escapeHtml) {
    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
    if (!model) return '';

    const signalRows = Array.isArray(model.signals)
        ? model.signals.map((item) =>
            '<li class="decision-memory-context-item" data-memory-context="' + safe(item.key) + '">' +
                '<span class="decision-memory-context-label">' + safe(item.label) + '</span>' +
                '<strong class="decision-memory-context-value">' + safe(item.value) + '</strong>' +
            '</li>'
        ).join('')
        : '';

    return '<aside class="decision-memory-context" data-decision-memory-context aria-label="' + safe(model.title) + '">' +
        '<div class="container decision-memory-context-inner">' +
            '<div class="decision-memory-context-head">' +
                '<h2>' + safe(model.title) + '</h2>' +
                '<p>' + safe(model.description) + '</p>' +
            '</div>' +
            '<p class="decision-memory-context-summary" data-memory-context-summary>' + safe(model.summary) + '</p>' +
            (signalRows
                ? '<ul class="decision-memory-context-list">' + signalRows + '</ul>'
                : '') +
        '</div>' +
    '</aside>';
}
