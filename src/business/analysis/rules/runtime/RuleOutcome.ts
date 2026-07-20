/**
 * İSTEBUL Business Analysis Engine — kural değerlendirme sonucu (PR-102C).
 */

/**
 * Tek kuralın değerlendirme sonucu.
 *
 * | Teknik | Anlam |
 * |--------|--------|
 * | passed | Koşul ihlal edilmedi |
 * | triggered | Koşul ihlal edildi (kural ateşlendi) |
 * | skipped | Değerlendirilemedi |
 */
export type RuleOutcome = 'passed' | 'triggered' | 'skipped';

export const RULE_OUTCOME_LABELS: Readonly<Record<RuleOutcome, string>> =
  Object.freeze({
    passed: 'Geçti',
    triggered: 'Tetiklendi',
    skipped: 'Atlandı'
  });
