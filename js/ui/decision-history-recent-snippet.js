/**
 * Recent Decision History snippet for Karar Merkezi hub.
 * Read-only render layer — no persistence or engine calls.
 */

import { buildDecisionHistorySignalStrip } from './decision-history-signal-strip.js';
import { normalizeHistoryEntryCategory } from './decision-history-category.js';

export const RECENT_DECISION_HISTORY_MAX = 3;

/**
 * @param {Array<object>} history
 * @param {number} [max]
 * @returns {Array<object>}
 */
export function selectRecentDecisionHistoryEntries(history = [], max = RECENT_DECISION_HISTORY_MAX) {
    const list = Array.isArray(history) ? history : [];
    return list.slice(0, max);
}

/**
 * @param {Array<object>} history
 * @param {number} [max]
 * @returns {object | null}
 */
export function buildRecentDecisionHistorySnippetModel(history = [], max = RECENT_DECISION_HISTORY_MAX) {
    const entries = selectRecentDecisionHistoryEntries(history, max);
    if (!entries.length) return null;

    return {
        title: 'Son kararlarınız',
        ctaLabel: 'Tüm karar geçmişini gör',
        ctaHref: '/gecmis/',
        items: entries.map((entry) => {
            const signals = buildDecisionHistorySignalStrip(entry);
            const category = normalizeHistoryEntryCategory(entry);
            return {
                id: entry.id,
                categoryName: category.categoryName,
                createdAt: entry.createdAt,
                title: entry.topPick?.name || entry.recommendations?.[0]?.name || 'Kaydedilen karar',
                fit: signals?.fit?.value || '—',
                risk: signals?.risk?.value || '—',
                tco: signals?.tco?.value || '—'
            };
        })
    };
}

/**
 * @param {object | null} model
 * @param {(value: string) => string} escapeHtml
 * @param {(value: string) => string} [formatDate]
 * @returns {string}
 */
export function renderRecentDecisionHistorySnippetHtml(model, escapeHtml, formatDate) {
    if (!model?.items?.length) return '';

    const safe = typeof escapeHtml === 'function' ? escapeHtml : (value) => String(value ?? '');
    const format = typeof formatDate === 'function' ? formatDate : () => '';

    const rows = model.items.map((item) =>
        '<li class="decision-history-recent-item" data-recent-history-id="' + safe(item.id) + '">' +
            '<div class="decision-history-recent-item-head">' +
                '<span class="assistant-kicker">' + safe(item.categoryName) + '</span>' +
                '<strong>' + safe(item.title) + '</strong>' +
                '<small>' + safe(format(item.createdAt)) + '</small>' +
            '</div>' +
            '<div class="decision-history-recent-signals">' +
                '<span data-recent-signal="fit"><em>Uygunluk</em>' + safe(item.fit) + '</span>' +
                '<span data-recent-signal="risk"><em>Risk</em>' + safe(item.risk) + '</span>' +
                '<span data-recent-signal="tco"><em>TCO</em>' + safe(item.tco) + '</span>' +
            '</div>' +
        '</li>'
    ).join('');

    return '<aside class="decision-history-recent-snippet" data-decision-history-recent-snippet aria-label="Son kararlar">' +
        '<div class="container decision-history-recent-snippet-inner">' +
            '<div class="decision-history-recent-head">' +
                '<h2>' + safe(model.title) + '</h2>' +
                '<a href="' + safe(model.ctaHref) + '" class="btn btn-outline btn-sm" data-native-route data-recent-history-cta>' + safe(model.ctaLabel) + '</a>' +
            '</div>' +
            '<ul class="decision-history-recent-list">' + rows + '</ul>' +
        '</div>' +
    '</aside>';
}
