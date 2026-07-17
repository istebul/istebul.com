/**
 * İSTEBUL Business Dashboard Engine — bölüm modeli.
 */

/**
 * Dashboard bölümü — widget grupları.
 */
export interface DashboardSection {
  /** Bölüm kimliği */
  id: string;
  /** Başlık */
  title: string;
  /** Sıra */
  order: number;
  /** Bu bölümdeki widget kimlikleri */
  widgetIds: readonly string[];
  /** Açıklama */
  description?: string;
}
