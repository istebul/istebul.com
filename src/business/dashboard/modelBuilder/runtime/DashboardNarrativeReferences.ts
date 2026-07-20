/**
 * İSTEBUL Business Dashboard Engine — Narrative References (PR-105B).
 *
 * Yeni metin üretmez; ReportModel bulgu / ek / referans kimliklerini taşır.
 */

/**
 * Narrative kaynak türü.
 */
export type DashboardNarrativeReferenceKind =
  | 'finding'
  | 'appendix'
  | 'reference'
  | 'executive-summary';

/**
 * Tek narrative referansı.
 */
export interface DashboardNarrativeReference {
  id: string;
  kind: DashboardNarrativeReferenceKind;
  title: string;
  sourceId: string;
}

/**
 * Narrative referansları bölümü.
 */
export interface DashboardNarrativeReferences {
  /** Referans sayısı */
  referenceCount: number;
  /** Tür dağılımı */
  kindCounts: Readonly<
    Partial<Record<DashboardNarrativeReferenceKind, number>>
  >;
  /** Eşlenen referanslar */
  items: readonly DashboardNarrativeReference[];
  /** Referans var mı */
  present: boolean;
}
