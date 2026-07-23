/**
 * İSTEBUL Business Dashboard Engine — gezinme modeli.
 */

/**
 * Dashboard içi gezinme öğesi.
 */
export interface DashboardNavigationItem {
  /** Öğe kimliği */
  id: string;
  /** Etiket */
  label: string;
  /** Hedef bölüm kimliği */
  sectionId?: string;
  /** Sıra */
  order: number;
}

/**
 * Dashboard gezinme yapısı.
 */
export interface DashboardNavigation {
  /** Öğeler */
  items: readonly DashboardNavigationItem[];
}
