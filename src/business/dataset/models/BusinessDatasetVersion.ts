/**
 * İSTEBUL Business — dataset sürüm tip sözleşmesi.
 */

/**
 * Şema ve içerik sürümleme.
 */
export interface BusinessDatasetVersion {
  /** BusinessDataset şema sürümü — semver benzeri */
  schemaVersion: string;
  /** İçerik revizyonu — artan sayı veya etiket */
  revision: string;
  /** Yürürlük / anlık görüntü zamanı (ISO 8601) */
  effectiveAt: string;
  /** Önceki revizyon referansı */
  previousRevision?: string;
  /** Değişiklik özeti (Türkçe) */
  changeSummary?: string;
}
