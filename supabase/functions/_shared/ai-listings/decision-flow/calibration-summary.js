/**
 * AI Decision Flow — calibration summary (Sprint-20 QA).
 */

import { sanitizeReportText } from '../decision-report/executive-summary.js';
import { computeConsistencyScore } from './consistency-checker.js';

/** @type {ReadonlyArray<string>} */
export const CALIBRATION_FORBIDDEN_PHRASES = Object.freeze([
  'garanti',
  'kesin alın',
  'kesinlikle alın',
  'yatırım tavsiyesi',
  'gerçek piyasa',
  'kesin değer'
]);

/**
 * @param {number} score
 * @returns {'Tutarlı'|'Kısmen tutarlı'|'Çelişkili'}
 */
export function resolveConsistencyStatus(score) {
  if (score >= 80) return 'Tutarlı';
  if (score >= 55) return 'Kısmen tutarlı';
  return 'Çelişkili';
}

/**
 * @param {number} score
 * @param {string[]} warnings
 * @returns {string}
 */
export function buildCalibrationSummaryText(score, warnings = []) {
  if (warnings.length === 0 && score >= 80) {
    return sanitizeReportText(
      'Karar zinciri mevcut bilgiler ışığında tutarlı görünüyor.'
    );
  }
  if (warnings.length > 0) {
    return sanitizeReportText(
      `Karar zincirinde ${warnings.length} uyarı tespit edildi; ön değerlendirme ile kontrol önerilir.`
    );
  }
  return sanitizeReportText(
    'Karar zinciri kısmen tutarlı; eksik alanlar doğrulanmalıdır.'
  );
}

/**
 * @param {{
 *   recommendation?: Record<string, unknown>|null,
 *   coach?: Record<string, unknown>|null,
 *   simulator?: Record<string, unknown>|null,
 *   report?: Record<string, unknown>|null,
 *   checks?: Array<{ id: string, passed: boolean, message: string }>,
 *   warnings?: string[]
 * }} calibrationInput
 * @returns {{
 *   consistency_score: number,
 *   status: string,
 *   warnings: string[],
 *   summary: string,
 *   alignment: { recommendation: boolean, coach: boolean, simulator: boolean, report: boolean }
 * }}
 */
export function buildCalibrationSummary(calibrationInput) {
  const checks = calibrationInput.checks ?? [];
  const warnings = calibrationInput.warnings ?? [];
  const consistency_score = computeConsistencyScore({ checks });
  const status = resolveConsistencyStatus(consistency_score);

  const findCheck = (id) => checks.find((c) => c.id === id)?.passed ?? false;

  return {
    consistency_score,
    status,
    warnings,
    summary: buildCalibrationSummaryText(consistency_score, warnings),
    alignment: {
      recommendation: findCheck('has_recommendation'),
      coach: findCheck('coach_present') && findCheck('coach_recommendation_alignment'),
      simulator: findCheck('simulator_present'),
      report: findCheck('report_final_alignment') && findCheck('no_forbidden_wording')
    }
  };
}
