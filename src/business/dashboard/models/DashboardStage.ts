/**
 * İSTEBUL Business Dashboard Engine — pipeline aşama ve durum tipleri.
 */

export type DashboardStage =
  | 'dashboard-dogrulama'
  | 'widget-derleme'
  | 'yerlesim-cozumu'
  | 'filtre-cozumu'
  | 'dashboard-birlestirme'
  | 'dashboard-derleme';

export type DashboardExecutionStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const DASHBOARD_EXECUTION_STATUS_LABELS: Readonly<
  Record<DashboardExecutionStatus, string>
> = Object.freeze({
  bekliyor: 'Bekliyor',
  suruyor: 'Sürüyor',
  basarili: 'Başarılı',
  basarisiz: 'Başarısız',
  iptal: 'İptal'
});
