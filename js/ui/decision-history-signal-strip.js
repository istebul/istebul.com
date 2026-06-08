/**
 * Render-only Decision History signal strip for /gecmis cards.
 * Reads canonical entry fields with legacy fallbacks — no engine calls or new calculations.
 */

import { formatMoney } from '../core/format.js';

export const DECISION_HISTORY_SIGNAL_PLACEHOLDER = '—';

export const DECISION_HISTORY_SIGNAL_FIELDS = Object.freeze([
    { key: 'fit', label: 'Uygunluk', dataField: 'history-fit' },
    { key: 'risk', label: 'Risk', dataField: 'history-risk' },
    { key: 'tco', label: 'TCO', dataField: 'history-tco' },
    { key: 'profile', label: 'Profil', dataField: 'history-profile' }
]);

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
 * @param {unknown} score
 * @returns {string}
 */
function formatFitValue(score) {
    const num = toNullableNumber(score);
    return num === null ? DECISION_HISTORY_SIGNAL_PLACEHOLDER : `${Math.round(num)}/100`;
}

/**
 * @param {unknown} yearlyCost
 * @returns {string}
 */
function formatTcoValue(yearlyCost) {
    const num = toNullableNumber(yearlyCost);
    if (num === null || num <= 0) return DECISION_HISTORY_SIGNAL_PLACEHOLDER;
    return formatMoney(num);
}

/**
 * @param {unknown} value
 * @param {number} [max]
 * @returns {string}
 */
function formatProfileValue(value, max = 56) {
    if (value === null || value === undefined) return DECISION_HISTORY_SIGNAL_PLACEHOLDER;
    const text = String(value).trim();
    if (!text) return DECISION_HISTORY_SIGNAL_PLACEHOLDER;
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
}

/**
 * @param {object | null | undefined} entry
 * @returns {Record<string, { label: string, value: string }> | null}
 */
export function buildDecisionHistorySignalStrip(entry) {
    if (!entry || typeof entry !== 'object') return null;

    const score = entry.score ?? entry.topPick?.score;
    const riskLevel = entry.riskLevel ?? entry.topPick?.riskLevel ?? null;
    const yearlyCost = entry.yearlyCost ?? entry.topPick?.yearlyCost ?? null;
    const decisionProfile = entry.decisionProfile
        ?? resolveInsightHeadline(entry.insight)
        ?? (typeof entry.summary === 'string' ? entry.summary.trim() : null)
        ?? entry.categoryName
        ?? null;

    return {
        fit: {
            label: 'Uygunluk',
            value: formatFitValue(score)
        },
        risk: {
            label: 'Risk',
            value: riskLevel ? String(riskLevel) : DECISION_HISTORY_SIGNAL_PLACEHOLDER
        },
        tco: {
            label: 'TCO',
            value: formatTcoValue(yearlyCost)
        },
        profile: {
            label: 'Profil',
            value: formatProfileValue(decisionProfile)
        }
    };
}

/**
 * @param {Record<string, { label: string, value: string }> | null} signals
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function renderDecisionHistorySignalStripHtml(signals, escapeHtml) {
    if (!signals) return '';

    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');

    const items = DECISION_HISTORY_SIGNAL_FIELDS.map((field) => {
        const item = signals[field.key] || {};
        return '<div class="decision-history-signal-strip-item" data-history-signal="' + safe(field.dataField) + '">' +
            '<span class="decision-history-signal-strip-label">' + safe(item.label || field.label) + '</span>' +
            '<strong class="decision-history-signal-strip-value">' + safe(item.value || DECISION_HISTORY_SIGNAL_PLACEHOLDER) + '</strong>' +
        '</div>';
    }).join('');

    return '<div class="decision-history-signal-strip" data-decision-history-signal-strip aria-label="Karar sinyalleri">' +
        items +
    '</div>';
}
