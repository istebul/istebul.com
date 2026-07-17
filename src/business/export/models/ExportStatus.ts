/**
 * İSTEBUL Business Export Engine — pipeline aşama ve durum tipleri.
 */

export type ExportStage =
  | 'export-dogrulama'
  | 'format-cozumu'
  | 'sablon-cozumu'
  | 'export-birlestirme'
  | 'artifact-derleme'
  | 'export-sonuc';

/**
 * Export iş durumu (ExportStatus).
 */
export type ExportStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const EXPORT_STATUS_LABELS: Readonly<Record<ExportStatus, string>> =
  Object.freeze({
    bekliyor: 'Bekliyor',
    suruyor: 'Sürüyor',
    basarili: 'Başarılı',
    basarisiz: 'Başarısız',
    iptal: 'İptal'
  });
