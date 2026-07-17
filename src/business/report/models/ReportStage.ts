/**
 * İSTEBUL Business Report Engine — rapor pipeline aşama ve durum tipleri.
 */

export type ReportStage =
  | 'karar-dogrulama'
  | 'bolum-derleme'
  | 'kanit-toplama'
  | 'rapor-birlestirme'
  | 'rapor-inceleme'
  | 'rapor-derleme';

/** Rapor üretim işi durumu (Report DNA `ReportStatus` ile karışmaması için ayrı tip). */
export type ReportExecutionStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const REPORT_EXECUTION_STATUS_LABELS: Readonly<
  Record<ReportExecutionStatus, string>
> =
  Object.freeze({
    bekliyor: 'Bekliyor',
    suruyor: 'Sürüyor',
    basarili: 'Başarılı',
    basarisiz: 'Başarısız',
    iptal: 'İptal'
  });
