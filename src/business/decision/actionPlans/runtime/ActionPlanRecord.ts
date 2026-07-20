/**
 * İSTEBUL Business Decision Engine — zengin Action Plan kaydı (PR-103D).
 */

import type { DecisionAction } from '../../models/DecisionAction';
import type { DecisionPriorityLevel } from '../../models/DecisionPriority';
import type { ActionStep } from './ActionStep';

/**
 * Action Plan metadata alanları.
 */
export type ActionPlanMetadata = Readonly<
  Record<string, string | number | boolean | null>
>;

/**
 * Standart Action Plan kaydı.
 */
export interface ActionPlanRecord {
  /** Kimlik */
  id: string;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Öncelik */
  priority: DecisionPriorityLevel;
  /** Tahmini etki (0–100) */
  estimatedImpact: number;
  /** Tahmini efor (0–100) */
  estimatedEffort: number;
  /** Uygulanabilir adımlar */
  steps: readonly ActionStep[];
  /** Kaynak recommendation */
  sourceRecommendation?: string;
  /** Metadata */
  metadata: ActionPlanMetadata;
  /** Foundation DecisionAction projeksiyonları (adımlardan) */
  actions: readonly DecisionAction[];
  /** Skipped/informational recommendation’dan üretilen bilgi kaydı mı */
  informational?: boolean;
}
