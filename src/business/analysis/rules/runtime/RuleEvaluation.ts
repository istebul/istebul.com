/**
 * İSTEBUL Business Analysis Engine — tek kural değerlendirme kaydı (PR-102C).
 */

import type { RuleDefinition } from './RuleDefinition';
import type { RuleOutcome } from './RuleOutcome';

/**
 * Tek bir kuralın yürütme kaydı.
 */
export interface RuleEvaluation {
  /** Kullanılan tanım */
  definition: RuleDefinition;
  /** Sonuç */
  outcome: RuleOutcome;
  /** Gözlenen değer (KPI ham değeri veya türetilmiş oran) */
  observedValue?: string | number | null;
  /** Eşik değeri */
  threshold?: number;
  /** Kısa mesaj */
  message: string;
  /** Süre (ms) */
  durationMs: number;
  /** Skip nedeni */
  skipReason?: string;
}
