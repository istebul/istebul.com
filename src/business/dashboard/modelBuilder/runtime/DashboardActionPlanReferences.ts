/**
 * İSTEBUL Business Dashboard Engine — Action Plan References (PR-105B).
 *
 * DecisionResult.actions varsa yapısal referans taşır; yoksa boş kalır.
 * Yeni aksiyon üretmez.
 */

import type { DecisionActionKind } from '../../../decision/models/DecisionAction';

/**
 * Tek aksiyon planı referansı.
 */
export interface DashboardActionPlanReference {
  id: string;
  kind: DecisionActionKind;
  title: string;
  description: string;
  recommendationId: string | null;
}

/**
 * Aksiyon planı referansları bölümü.
 */
export interface DashboardActionPlanReferences {
  /** Referans sayısı */
  referenceCount: number;
  /** Tür dağılımı */
  kindCounts: Readonly<Partial<Record<DecisionActionKind, number>>>;
  /** Eşlenen aksiyonlar */
  items: readonly DashboardActionPlanReference[];
  /** Referans var mı */
  present: boolean;
}
