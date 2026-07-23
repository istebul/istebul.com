/**
 * İSTEBUL Business Decision Engine — runtime Action Plan tanımı (PR-103D).
 *
 * Foundation `DecisionAction` sözleşmesini değiştirmez.
 */

import type { DecisionActionKind } from '../../models/DecisionAction';
import type { DecisionPriorityLevel } from '../../models/DecisionPriority';

/**
 * Action Plan tanımındaki adım şablonu.
 */
export interface ActionStepTemplate {
  order: number;
  title: string;
  description: string;
  kind: DecisionActionKind;
}

/**
 * Runtime Action Plan şablon / tanım kaydı.
 */
export interface ActionPlanDefinition {
  /** Kararlı kimlik */
  id: string;
  /** Kod */
  code: string;
  /** Başlık şablonu */
  title: string;
  /** Açıklama şablonu */
  description: string;
  /** Varsayılan öncelik */
  defaultPriority: DecisionPriorityLevel;
  /** Tahmini etki (0–100) */
  estimatedImpact: number;
  /** Tahmini efor (0–100) */
  estimatedEffort: number;
  /** Adım şablonları */
  stepTemplates: readonly ActionStepTemplate[];
  /** Kaynak recommendation tanım kimliği */
  sourceRecommendationId?: string;
  /** Sıra */
  order: number;
  /** Aktif mi */
  enabled: boolean;
}
