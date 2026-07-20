/**
 * İSTEBUL Business Decision Engine — politika değerlendirme sonucu (PR-103B).
 */

/**
 * Tek politikanın değerlendirme sonucu.
 *
 * | Teknik | Anlam |
 * |--------|--------|
 * | passed | Politika koşulu ihlal edilmedi |
 * | triggered | Politika koşulu ihlal edildi |
 * | skipped | Değerlendirilemedi |
 */
export type PolicyOutcome = 'passed' | 'triggered' | 'skipped';

export const POLICY_OUTCOME_LABELS: Readonly<Record<PolicyOutcome, string>> =
  Object.freeze({
    passed: 'PASSED',
    triggered: 'TRIGGERED',
    skipped: 'SKIPPED'
  });
