/**
 * Decision History — timeline HTML builder (Sprint-31).
 */

import { escapeHtml } from '../core/dom-safe.js';
import {
  buildHistoryTimeline,
  getRecentlyViewedListings,
  getRecentComparisons,
  getRecentReports
} from './history-engine.js';

/**
 * @param {unknown} value
 * @returns {string}
 */
function safe(value) {
  return escapeHtml(String(value ?? ''));
}

/**
 * @param {string} iso
 * @returns {string}
 */
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {string} emptyText
 * @returns {string}
 */
function renderMiniList(items, emptyText) {
  if (!items.length) {
    return `<p class="udc-muted">${safe(emptyText)}</p>`;
  }
  return `<ul class="udc-history-mini">${items
    .map(
      (item) => `
    <li>
      <strong>${safe(item.listing_title || item.listingTitle || item.listing_id || 'İlan')}</strong>
      <small>${formatDate(item.updated_at || item.updatedAt || item.created_at)}</small>
    </li>`
    )
    .join('')}</ul>`;
}

/**
 * @param {Record<string, unknown>} data
 * @returns {string}
 */
export function buildHistoryTimelineHtml(data = {}) {
  const events = Array.isArray(data.events) ? data.events : [];
  const records = Array.isArray(data.records) ? data.records : [];
  const timeline = buildHistoryTimeline(events);

  const recentListings = getRecentlyViewedListings(records);
  const recentComparisons = getRecentComparisons(records);
  const recentReports = getRecentReports(records);

  return `
    <section class="udc-history" aria-label="Karar Geçmişi">
      <h4>Karar Geçmişi</h4>

      <div class="udc-history__grid">
        <div class="udc-history__block">
          <h5>Son görüntülenen ilanlar</h5>
          ${renderMiniList(recentListings, 'Henüz görüntülenen ilan yok.')}
        </div>
        <div class="udc-history__block">
          <h5>Son karşılaştırmalar</h5>
          ${renderMiniList(recentComparisons, 'Henüz karşılaştırma kaydı yok.')}
        </div>
        <div class="udc-history__block">
          <h5>Son raporlar</h5>
          ${renderMiniList(recentReports, 'Henüz rapor kaydı yok.')}
        </div>
      </div>

      <h5>Zaman çizelgesi</h5>
      ${
        timeline.length
          ? `<ol class="udc-history__timeline" role="list">
          ${timeline
            .slice(0, 20)
            .map(
              (event) => `
            <li class="udc-history__event">
              <time datetime="${safe(event.created_at)}">${formatDate(event.created_at)}</time>
              <span>${safe(event.label)}</span>
              ${event.listing_id ? `<small>İlan: ${safe(event.listing_id)}</small>` : ''}
            </li>`
            )
            .join('')}
        </ol>`
          : '<p class="udc-muted">Henüz karar geçmişi kaydı yok.</p>'
      }
    </section>`;
}
