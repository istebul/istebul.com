/**
 * AI Listings Auto Collector — summary (Sprint-13).
 */

import { getCollectorSourceLabelTr } from './source-adapter.js';

/**
 * @param {{
 *   source_type: string,
 *   total_rows: number,
 *   valid_rows: number,
 *   invalid_rows: number,
 *   duplicate_candidates: number,
 *   repository_ready_rows: number
 * }} stats
 * @returns {string}
 */
export function buildCollectorSummaryText(stats) {
  const sourceLabel = getCollectorSourceLabelTr(stats.source_type);
  return (
    `Kaynak: ${sourceLabel}. Toplam ${stats.total_rows} kayıt; ` +
    `${stats.valid_rows} geçerli, ${stats.invalid_rows} hatalı, ` +
    `${stats.duplicate_candidates} duplicate adayı, ` +
    `${stats.repository_ready_rows} repository kaydı hazır.`
  );
}

/**
 * @param {{
 *   source_type: string,
 *   total_rows: number,
 *   valid_rows: number,
 *   invalid_rows: number,
 *   duplicate_candidates: number,
 *   repository_ready_rows: number
 * }} stats
 * @returns {Record<string, string|number>}
 */
export function buildCollectorSummary(stats) {
  return {
    source_type: stats.source_type,
    source_label: getCollectorSourceLabelTr(stats.source_type),
    total_rows: stats.total_rows,
    valid_rows: stats.valid_rows,
    invalid_rows: stats.invalid_rows,
    duplicate_candidates: stats.duplicate_candidates,
    repository_ready_rows: stats.repository_ready_rows,
    text: buildCollectorSummaryText(stats)
  };
}
