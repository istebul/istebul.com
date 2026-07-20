/**
 * İSTEBUL Business Decision Engine — tek politika değerlendirme kaydı (PR-103B).
 */

import type { PolicyDefinition } from './PolicyDefinition';
import type { PolicyOutcome } from './PolicyOutcome';

/**
 * Tek bir politikanın yürütme kaydı.
 */
export interface PolicyEvaluation {
  /** Kullanılan tanım */
  definition: PolicyDefinition;
  /** Sonuç */
  outcome: PolicyOutcome;
  /** Gözlenen değer */
  observedValue?: string | number | boolean | null;
  /** Eşik değeri */
  threshold?: number;
  /** Kısa mesaj */
  message: string;
  /** Süre (ms) */
  durationMs: number;
  /** Skip nedeni */
  skipReason?: string;
}
