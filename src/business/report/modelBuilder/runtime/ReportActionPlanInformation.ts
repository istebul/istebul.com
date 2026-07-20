/**
 * İSTEBUL Business Report Engine — Action Plan Information (PR-104B).
 */

import type { DecisionActionKind } from '../../../decision/models/DecisionAction';

/**
 * Tek bir aksiyon eşlemesi — DecisionAction alanlarını taşır.
 */
export interface ReportMappedAction {
  id: string;
  kind: DecisionActionKind;
  title: string;
  description: string;
  recommendationId: string | null;
}

/**
 * Aksiyon planı bilgisi bölümü.
 */
export interface ReportActionPlanInformation {
  /** Aksiyon sayısı */
  actionCount: number;
  /** Tür dağılımı */
  kindCounts: Readonly<Partial<Record<DecisionActionKind, number>>>;
  /** Eşlenen aksiyonlar */
  items: readonly ReportMappedAction[];
  /** Aksiyon var mı */
  present: boolean;
}
