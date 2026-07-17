/**
 * İSTEBUL Business Import Engine — pipeline aşama ve durum tipleri.
 */

/**
 * Import pipeline aşama kimlikleri (sıralı).
 */
export type ImportStage =
  | 'adapter-secimi'
  | 'okuma'
  | 'tespit'
  | 'semantik-esleme'
  | 'normalizasyon'
  | 'dogrulama'
  | 'dataset-olusturma'
  | 'tamamlandi';

/**
 * İçe aktarma iş durumu.
 *
 * | Teknik | Türkçe |
 * |--------|--------|
 * | bekliyor | Bekliyor |
 * | suruyor | Sürüyor |
 * | basarili | Başarılı |
 * | basarisiz | Başarısız |
 * | iptal | İptal |
 */
export type ImportStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

/** Durum etiketleri (Türkçe) */
export const IMPORT_STATUS_LABELS: Readonly<Record<ImportStatus, string>> =
  Object.freeze({
    bekliyor: 'Bekliyor',
    suruyor: 'Sürüyor',
    basarili: 'Başarılı',
    basarisiz: 'Başarısız',
    iptal: 'İptal'
  });
