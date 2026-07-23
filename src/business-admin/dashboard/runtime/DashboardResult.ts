/**
 * İSTEBUL Business Admin — DashboardResult girdi sözleşmesi (PR-202B).
 *
 * Dashboard Engine `DashboardModel` çıktısı ile yapısal uyumlu.
 * Engine yeniden yazılmaz; yalnızca projeksiyon girdisi olarak kullanılır.
 */

/**
 * Dashboard KPI özeti — workspace projeksiyon girdisi.
 */
export interface DashboardResultKpi {
  kpiId: string;
  name: string;
  unit: string;
  value: string | number | null;
  trendLabel?: string;
}

/**
 * Dashboard widget özeti — workspace projeksiyon girdisi.
 */
export interface DashboardResultWidget {
  id: string;
  widgetCode: string;
  kind: string;
  title: string;
  payload?: Readonly<Record<string, unknown>>;
}

/**
 * Dashboard bölüm özeti.
 */
export interface DashboardResultSection {
  id: string;
  title: string;
  order: number;
  widgetIds: readonly string[];
  description?: string;
}

/**
 * Dashboard metadata özeti.
 */
export interface DashboardResultMetadata {
  id: string;
  title: string;
  description?: string;
  locale: 'tr' | 'en';
  createdAt: string;
  version: string;
}

/**
 * Dashboard Engine sonucu (DashboardModel) — workspace girdisi.
 * CRUD / API / DB yok; yalnızca okuma projeksiyonu.
 */
export interface DashboardResult {
  id: string;
  metadata: DashboardResultMetadata;
  status: string;
  lastStage: string;
  sections: readonly DashboardResultSection[];
  widgets: readonly DashboardResultWidget[];
  kpis: readonly DashboardResultKpi[];
}
