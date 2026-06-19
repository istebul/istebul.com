/**
 * Render-only decision summary for the comparison hub.
 * Reads existing comparison item fields (score, periodicCost, riskLevel) — no engine calls.
 */

/** @typedef {{ id?: string, title?: string, score?: number, periodicCost?: number, price?: number, riskLevel?: string }} ComparisonItem */

/** @typedef {{ label: string, item: ComparisonItem | null, detail?: string }} SummaryHighlight */

/** @typedef {{ lowestTco: SummaryHighlight, lowestRisk: SummaryHighlight, highestFit: SummaryHighlight, mostBalanced: SummaryHighlight }} ComparisonDecisionSummary */

const RISK_RANK = Object.freeze({
    'düşük risk': 1,
    'kontrollü risk': 2,
    'kontrol gerekli': 3,
    'dikkat gerektirir': 4
});

const SUMMARY_FIELDS = Object.freeze([
    { key: 'lowestTco', label: 'En düşük TCO', dataField: 'lowest-tco' },
    { key: 'lowestRisk', label: 'En düşük risk profili', dataField: 'lowest-risk' },
    { key: 'highestFit', label: 'En yüksek ihtiyaç uyumu', dataField: 'highest-fit' },
    { key: 'mostBalanced', label: 'En dengeli seçenek', dataField: 'most-balanced' }
]);

/**
 * @param {string | undefined | null} riskLevel
 * @returns {number}
 */
export function resolveComparisonRiskRank(riskLevel) {
    const normalized = String(riskLevel || '').trim().toLocaleLowerCase('tr-TR');
    return RISK_RANK[normalized] ?? 5;
}

/**
 * @param {ComparisonItem} item
 * @returns {number}
 */
export function resolveComparisonTcoValue(item = {}) {
    const periodicCost = Number(item.periodicCost || 0);
    if (periodicCost > 0) return periodicCost;
    return Number(item.price || 0);
}

/**
 * @param {ComparisonItem[]} items
 * @returns {ComparisonItem | null}
 */
function pickLowestTco(items) {
    return [...items].sort((left, right) => {
        const tcoDiff = resolveComparisonTcoValue(left) - resolveComparisonTcoValue(right);
        if (tcoDiff !== 0) return tcoDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'tr');
    })[0] || null;
}

/**
 * @param {ComparisonItem[]} items
 * @returns {ComparisonItem | null}
 */
function pickLowestRisk(items) {
    return [...items].sort((left, right) => {
        const riskDiff = resolveComparisonRiskRank(left.riskLevel) - resolveComparisonRiskRank(right.riskLevel);
        if (riskDiff !== 0) return riskDiff;
        const scoreDiff = Number(right.score || 0) - Number(left.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'tr');
    })[0] || null;
}

/**
 * @param {ComparisonItem[]} items
 * @returns {ComparisonItem | null}
 */
function pickHighestFit(items) {
    return [...items].sort((left, right) => {
        const scoreDiff = Number(right.score || 0) - Number(left.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const riskDiff = resolveComparisonRiskRank(left.riskLevel) - resolveComparisonRiskRank(right.riskLevel);
        if (riskDiff !== 0) return riskDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'tr');
    })[0] || null;
}

/**
 * @param {ComparisonItem[]} items
 * @returns {ComparisonItem | null}
 */
function pickMostBalanced(items) {
    return [...items].sort((left, right) => {
        const scoreDiff = Number(right.score || 0) - Number(left.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const riskDiff = resolveComparisonRiskRank(left.riskLevel) - resolveComparisonRiskRank(right.riskLevel);
        if (riskDiff !== 0) return riskDiff;
        const tcoDiff = resolveComparisonTcoValue(left) - resolveComparisonTcoValue(right);
        if (tcoDiff !== 0) return tcoDiff;
        return String(left.title || '').localeCompare(String(right.title || ''), 'tr');
    })[0] || null;
}

/**
 * @param {ComparisonItem[]} items
 * @returns {ComparisonDecisionSummary | null}
 */
export function buildComparisonDecisionSummary(items = []) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!list.length) return null;

    const lowestTcoItem = pickLowestTco(list);
    const lowestRiskItem = pickLowestRisk(list);
    const highestFitItem = pickHighestFit(list);
    const mostBalancedItem = pickMostBalanced(list);

    return {
        lowestTco: {
            label: 'En düşük TCO',
            item: lowestTcoItem,
            detail: lowestTcoItem ? formatTcoDetail(lowestTcoItem) : ''
        },
        lowestRisk: {
            label: 'En düşük risk profili',
            item: lowestRiskItem,
            detail: lowestRiskItem?.riskLevel || ''
        },
        highestFit: {
            label: 'En yüksek ihtiyaç uyumu',
            item: highestFitItem,
            detail: highestFitItem?.score ? `${highestFitItem.score}/100` : ''
        },
        mostBalanced: {
            label: 'En dengeli seçenek',
            item: mostBalancedItem,
            detail: mostBalancedItem ? buildBalancedDetail(mostBalancedItem) : ''
        }
    };
}

/**
 * @param {ComparisonItem} item
 * @returns {string}
 */
function formatTcoDetail(item) {
    const value = resolveComparisonTcoValue(item);
    return value > 0 ? `₺${value.toLocaleString('tr-TR')}` : '';
}

/**
 * @param {ComparisonItem} item
 * @returns {string}
 */
function buildBalancedDetail(item) {
    const parts = [];
    if (item.score) parts.push(`${item.score}/100 uyum`);
    if (item.riskLevel) parts.push(item.riskLevel);
    return parts.join(' · ');
}

/**
 * @param {ComparisonDecisionSummary | null} summary
 * @param {(value: string) => string} escapeHtml
 * @param {string} [aiExplanationHtml]
 * @returns {string}
 */
export function renderComparisonDecisionSummaryHtml(summary, escapeHtml, aiExplanationHtml = '') {
    if (!summary) return '';

    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
    const aiSlot = String(aiExplanationHtml || '');

    const cards = SUMMARY_FIELDS.map((field) => {
        const highlight = summary[field.key];
        const title = highlight?.item?.title || '—';
        const detail = highlight?.detail || 'Veri yok';

        return '<article class="comparison-decision-summary-item" data-summary-field="' + safe(field.dataField) + '">' +
            '<span>' + safe(highlight?.label || field.label) + '</span>' +
            '<strong>' + safe(title) + '</strong>' +
            '<small>' + safe(detail) + '</small>' +
        '</article>';
    }).join('');

    return '<section class="comparison-decision-summary" data-comparison-decision-summary aria-label="Karar özeti">' +
        '<div class="comparison-decision-summary-head">' +
            '<span class="assistant-kicker">Karar özeti</span>' +
            '<h3>Mevcut seçeneklerde öne çıkanlar</h3>' +
            '<p>Skor, toplam maliyet ve risk etiketlerinden türetilen deterministik özet — nihai karar size aittir.</p>' +
        '</div>' +
        '<div class="comparison-decision-summary-grid">' + cards + '</div>' +
        aiSlot +
    '</section>';
}
