/**
 * Render-only Decision Result Summary for Karar Merkezi result screen.
 * Reads existing decision result fields — no engine calls or new score calculations.
 */

import { formatMoney } from '../core/format.js';

export const DECISION_RESULT_SUMMARY_FIELDS = Object.freeze([
    { key: 'fit', label: 'Uygunluk özeti', dataField: 'fit-summary' },
    { key: 'risk', label: 'Risk özeti', dataField: 'risk-summary' },
    { key: 'tco', label: 'TCO özeti', dataField: 'tco-summary' },
    { key: 'profile', label: 'Karar profili özeti', dataField: 'profile-summary' }
]);

/**
 * @param {object | null | undefined} result
 * @returns {boolean}
 */
export function shouldRenderDecisionResultSummary(result) {
    return Boolean(result?.recommendations?.[0]);
}

/**
 * @param {Array<{ label?: string, value?: string }>} answers
 * @param {number} [max]
 * @returns {string}
 */
function buildProfileDetailFromAnswers(answers = [], max = 3) {
    const list = Array.isArray(answers) ? answers : [];
    const parts = list
        .filter((entry) => entry?.label && entry?.value)
        .slice(0, max)
        .map((entry) => `${entry.label}: ${entry.value}`);
    return parts.join(' · ');
}

/**
 * @param {object | null | undefined} result
 * @returns {Record<string, { label: string, value: string, detail: string }> | null}
 */
export function buildDecisionResultSummary(result) {
    if (!shouldRenderDecisionResultSummary(result)) return null;

    const primary = result.recommendations[0];
    const dataHealth = result.dataHealth || {};
    const insight = result.insight || {};
    const tags = Array.isArray(primary.decisionTags) ? primary.decisionTags : [];
    const totalLabel = primary.calculationTable?.totalLabel || 'Toplam dönemsel maliyet';
    const yearlyCost = Number(primary.yearlyCost || 0);
    const profileFromAnswers = buildProfileDetailFromAnswers(result.answers);
    const profileDetail = tags.length
        ? tags.slice(0, 3).join(' · ')
        : profileFromAnswers || insight.headline || result.categoryName || '';

    return {
        fit: {
            label: 'Uygunluk özeti',
            value: `${primary.score || '-'}/100`,
            detail: primary.scoreNote || primary.name || result.summary || 'Uyum skoru mevcut sonuçtan okunur.'
        },
        risk: {
            label: 'Risk özeti',
            value: primary.riskLevel || 'Kontrol gerekli',
            detail: dataHealth.confidenceLabel
                ? `Veri güven bandı: ${dataHealth.confidenceLabel}`
                : 'Risk etiketi kural tabanlı sonuçtan türetilir.'
        },
        tco: {
            label: 'TCO özeti',
            value: yearlyCost > 0 ? formatMoney(yearlyCost) : '—',
            detail: totalLabel
        },
        profile: {
            label: 'Karar profili özeti',
            value: insight.headline || result.categoryName || 'Karar profili',
            detail: profileDetail || 'Profil girdileri mevcut cevaplardan özetlenir.'
        }
    };
}

/**
 * @param {Record<string, { label: string, value: string, detail: string }> | null} summary
 * @param {(value: string) => string} escapeHtml
 * @param {string} [aiRationaleHtml]
 * @returns {string}
 */
export function renderDecisionResultSummaryHtml(summary, escapeHtml, aiRationaleHtml = '') {
    if (!summary) return '';

    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
    const aiSlot = String(aiRationaleHtml || '');

    const cards = DECISION_RESULT_SUMMARY_FIELDS.map((field) => {
        const item = summary[field.key] || {};
        return '<article class="decision-result-summary-item" data-result-summary-field="' + safe(field.dataField) + '">' +
            '<span>' + safe(item.label || field.label) + '</span>' +
            '<strong>' + safe(item.value || '—') + '</strong>' +
            '<small>' + safe(item.detail || '') + '</small>' +
        '</article>';
    }).join('');

    return '<section class="decision-result-summary" data-decision-result-summary aria-label="Ön değerlendirme sonucu">' +
        '<div class="decision-result-summary-head">' +
            '<span class="assistant-kicker">Ön değerlendirme sonucu</span>' +
            '<h3>Ön değerlendirme sinyalleri tek bakışta</h3>' +
            '<p>Uygunluk, risk, TCO ve profil özeti ön değerlendirmeden okunur; tam skor ve detaylı analiz ilgili kategori akışında hesaplanır.</p>' +
        '</div>' +
        '<div class="decision-result-summary-grid">' + cards + '</div>' +
        aiSlot +
    '</section>';
}
