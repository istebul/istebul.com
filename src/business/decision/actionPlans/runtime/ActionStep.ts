/**
 * İSTEBUL Business Decision Engine — aksiyon adımı (PR-103D).
 */

import type { DecisionActionKind } from '../../models/DecisionAction';

/**
 * Action Plan içindeki uygulanabilir adım.
 */
export interface ActionStep {
  /** Adım kimliği */
  id: string;
  /** Sıra */
  order: number;
  /** Başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Foundation aksiyon türü */
  kind: DecisionActionKind;
}
