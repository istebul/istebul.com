/**
 * Read-only Decision Memory Insights for /gecmis.
 * Aggregates existing canonical and legacy-normalized history signals — no engine calls or persistence.
 */

import { normalizeDecisionHistoryList } from './decision-history-compat.js';
import { normalizeHistoryEntryCategory } from './decision-history-category.js';

export const DECISION_MEMORY_INSIGHTS_MAX = 12;
export const DECISION_MEMORY_INSIGHTS_MIN = 2;

export const DECISION_MEMORY_INSIGHTS_TITLE = 'Karar hafızası içgörüleri';
export const DECISION_MEMORY_INSIGHTS_DESCRIPTION =
    'Bu özet, geçmiş karar kayıtlarınızdaki mevcut sinyallerden oluşturulur.';
export const DECISION_MEMORY_INSIGHTS_SOFT_STATE =
    'Henüz anlamlı içgörü oluşturmak için yeterli karar geçmişi yok.';

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function toNullableNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

/**
 * @param {Array<object>} entries
 * @param {(entry: object) => string | null | undefined} getter
 * @returns {Map<string, number>}
 */
function countValues(entries, getter) {
    const counts = new Map();
    for (const entry of entries) {
        const raw = getter(entry);
        const key = String(raw ?? '').trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
}

/**
 * @param {Map<string, number>} counts
 * @returns {{ value: string, count: number } | null}
 */
function pickTopCount(counts) {
    if (!counts.size) return null;

    let topValue = null;
    let topCount = 0;

    for (const [value, count] of counts) {
        if (count > topCount) {
            topValue = value;
            topCount = count;
        }
    }

    return topValue ? { value: topValue, count: topCount } : null;
}

/**
 * @param {object} entry
 * @returns {number | null}
 */
function resolveEntryScore(entry) {
    return toNullableNumber(entry.score ?? entry.topPick?.score);
}

/**
 * @param {object} entry
 * @returns {string | null}
 */
function resolveEntryRiskLevel(entry) {
    const risk = entry.riskLevel ?? entry.topPick?.riskLevel ?? null;
    const text = String(risk ?? '').trim();
    return text || null;
}

/**
 * @param {object} entry
 * @returns {string[]}
 */
function resolveEntryProfileTokens(entry) {
    const tokens = [];

    const profile = String(entry.decisionProfile ?? '').trim();
    if (profile) tokens.push(profile);

    if (Array.isArray(entry.profileTags)) {
        for (const tag of entry.profileTags) {
            const text = String(tag ?? '').trim();
            if (text) tokens.push(text);
        }
    }

    return tokens;
}

/**
 * @param {Array<object>} history
 * @param {number} [max]
 * @returns {Array<object>}
 */
export function selectDecisionMemoryInsightEntries(history = [], max = DECISION_MEMORY_INSIGHTS_MAX) {
    const list = Array.isArray(history) ? history : [];
    return normalizeDecisionHistoryList(list).slice(0, max);
}

/**
 * @param {Array<object>} history
 * @param {{ max?: number, min?: number }} [options]
 * @returns {object}
 */
export function buildDecisionMemoryInsightsModel(history = [], options = {}) {
    const max = options.max ?? DECISION_MEMORY_INSIGHTS_MAX;
    const min = options.min ?? DECISION_MEMORY_INSIGHTS_MIN;
    const entries = selectDecisionMemoryInsightEntries(history, max);

    const base = {
        title: DECISION_MEMORY_INSIGHTS_TITLE,
        description: DECISION_MEMORY_INSIGHTS_DESCRIPTION,
        entryCount: entries.length,
        softState: null,
        insights: []
    };

    if (entries.length < min) {
        return {
            ...base,
            softState: DECISION_MEMORY_INSIGHTS_SOFT_STATE
        };
    }

    const topCategory = pickTopCount(countValues(entries, (entry) => {
        const category = normalizeHistoryEntryCategory(entry);
        return category.categoryName;
    }));

    const topRisk = pickTopCount(countValues(entries, resolveEntryRiskLevel));

    const scores = entries.map(resolveEntryScore).filter((score) => score !== null);
    const averageScore = scores.length
        ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null;

    const profileCounts = new Map();
    for (const entry of entries) {
        for (const token of resolveEntryProfileTokens(entry)) {
            profileCounts.set(token, (profileCounts.get(token) || 0) + 1);
        }
    }
    const topProfile = pickTopCount(profileCounts);

    const insights = [];

    if (topCategory) {
        insights.push({
            key: 'top-category',
            label: 'En sık kullanılan kategori',
            value: `${topCategory.value} (${topCategory.count} karar)`
        });
    }

    if (topRisk) {
        insights.push({
            key: 'risk-tendency',
            label: 'Son kararlarda baskın risk eğilimi',
            value: `${topRisk.value} (${topRisk.count}/${entries.length})`
        });
    }

    if (averageScore !== null) {
        insights.push({
            key: 'average-fit',
            label: 'Ortalama uygunluk skoru',
            value: `${averageScore}/100`
        });
    }

    if (topProfile) {
        insights.push({
            key: 'top-profile',
            label: 'En sık görülen karar profili / etiket',
            value: topProfile.value
        });
    }

    if (!insights.length) {
        return {
            ...base,
            softState: DECISION_MEMORY_INSIGHTS_SOFT_STATE
        };
    }

    return {
        ...base,
        insights
    };
}

/**
 * @param {object | null | undefined} model
 * @param {(value: string) => string} escapeHtml
 * @returns {string}
 */
export function renderDecisionMemoryInsightsHtml(model, escapeHtml) {
    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
    if (!model) return '';

    const insightRows = Array.isArray(model.insights)
        ? model.insights.map((item) =>
            '<li class="decision-memory-insights-item" data-memory-insight="' + safe(item.key) + '">' +
                '<span class="decision-memory-insights-label">' + safe(item.label) + '</span>' +
                '<strong class="decision-memory-insights-value">' + safe(item.value) + '</strong>' +
            '</li>'
        ).join('')
        : '';

    const body = model.softState
        ? '<p class="decision-memory-insights-soft" data-memory-insights-soft>' + safe(model.softState) + '</p>'
        : '<ul class="decision-memory-insights-list">' + insightRows + '</ul>';

    return '<aside class="decision-memory-insights" data-decision-memory-insights aria-label="' + safe(model.title) + '">' +
        '<div class="decision-memory-insights-head">' +
            '<h3>' + safe(model.title) + '</h3>' +
            '<p>' + safe(model.description) + '</p>' +
        '</div>' +
        body +
    '</aside>';
}
