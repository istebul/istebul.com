/**
 * İSTEBUL Business Dashboard Engine — widget modeli.
 */

/**
 * Widget türü — grafik kütüphanesi bağlanmaz; yalnızca tip anahtarı.
 */
export type DashboardWidgetKind =
  | 'kpi-card'
  | 'line-chart'
  | 'bar-chart'
  | 'table'
  | 'heatmap'
  | 'list'
  | 'text'
  | 'ozel';

/**
 * Widget grid konumu.
 */
export interface DashboardWidgetPlacement {
  /** Sütun başlangıcı (0 tabanlı) */
  col: number;
  /** Satır başlangıcı (0 tabanlı) */
  row: number;
  /** Genişlik (sütun span) */
  colSpan: number;
  /** Yükseklik (satır span) */
  rowSpan: number;
}

/**
 * Dashboard widget tanımı — render sonraki PR.
 */
export interface DashboardWidget {
  /** Widget kimliği */
  id: string;
  /** WidgetRegistry kodu */
  widgetCode: string;
  /** Tür */
  kind: DashboardWidgetKind;
  /** Başlık */
  title: string;
  /** Yerleşim */
  placement: DashboardWidgetPlacement;
  /** Bağlı KPI kimlikleri */
  kpiIds?: readonly string[];
  /** Veri yükü — şekli sonraki PR’da daraltılır */
  payload?: Readonly<Record<string, unknown>>;
}
