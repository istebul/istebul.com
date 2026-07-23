/**
 * İSTEBUL Business Dashboard Engine — KPI kart modeli.
 */

/**
 * Dashboard’da gösterilecek KPI özeti.
 */
export interface DashboardKPI {
  /** KPI kimliği — Knowledge KPIRegistry ile uyumlu */
  kpiId: string;
  /** Görünen ad */
  name: string;
  /** Birim */
  unit: string;
  /** Değer — hesaplama Analysis/Decision’dan gelir */
  value: string | number | null;
  /** Trend etiketi — örn. yükseliş / düşüş */
  trendLabel?: string;
  /** Renk jetonu */
  colorToken?: string;
}
