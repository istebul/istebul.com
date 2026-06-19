/**
 * Data Acquisition — Turkish summary helpers (Sprint-9).
 */

import { getSourceLabelTr } from './source-detector.js';

/**
 * @param {{
 *   source_type: string,
 *   total_rows: number,
 *   valid_rows: number,
 *   invalid_rows: number,
 *   duplicate_candidates: number,
 *   savable_rows?: number
 * }} stats
 * @returns {string}
 */
export function buildAcquisitionSummaryText(stats) {
  const sourceLabel = getSourceLabelTr(stats.source_type);
  const savable = stats.savable_rows ?? stats.valid_rows;

  return (
    `${stats.total_rows} satır işlendi; ${stats.valid_rows} geçerli, ${stats.invalid_rows} hatalı, ` +
    `${stats.duplicate_candidates} duplicate adayı. Kaynak: ${sourceLabel}. ` +
    `Kaydedilebilir kayıt: ${savable}.`
  );
}

/**
 * @param {{
 *   source_type: string,
 *   total_rows: number,
 *   valid_rows: number,
 *   invalid_rows: number,
 *   duplicate_candidates: number,
 *   savable_rows?: number
 * }} stats
 * @returns {Record<string, string|number>}
 */
export function buildAcquisitionSummary(stats) {
  const savable = stats.savable_rows ?? stats.valid_rows;
  return {
    source_type: stats.source_type,
    source_label: getSourceLabelTr(stats.source_type),
    total_rows: stats.total_rows,
    valid_rows: stats.valid_rows,
    invalid_rows: stats.invalid_rows,
    duplicate_candidates: stats.duplicate_candidates,
    savable_rows: savable,
    text: buildAcquisitionSummaryText({ ...stats, savable_rows: savable })
  };
}
