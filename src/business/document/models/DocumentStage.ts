/**
 * İSTEBUL Business Document Engine — pipeline aşama ve durum tipleri.
 */

export type DocumentStage =
  | 'rapor-dogrulama'
  | 'yerlesim-derleme'
  | 'bolum-formatlama'
  | 'stil-cozumu'
  | 'dokuman-birlestirme'
  | 'dokuman-derleme';

export type DocumentExecutionStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const DOCUMENT_EXECUTION_STATUS_LABELS: Readonly<
  Record<DocumentExecutionStatus, string>
> = Object.freeze({
  bekliyor: 'Bekliyor',
  suruyor: 'Sürüyor',
  basarili: 'Başarılı',
  basarisiz: 'Başarısız',
  iptal: 'İptal'
});
