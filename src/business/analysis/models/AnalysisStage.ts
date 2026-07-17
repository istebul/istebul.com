/**
 * İSTEBUL Business Analysis Engine — analiz durumu ve aşama kimlikleri.
 */

/**
 * Analysis pipeline aşama kimlikleri (Architecture Freeze v1.0).
 */
export type AnalysisStage =
  | 'dataset-dogrulama'
  | 'kpi-hesaplama'
  | 'kural-degerlendirme'
  | 'bulgu-uretimi'
  | 'ozet-uretimi'
  | 'sonuc-derleme';

/**
 * Analiz iş durumu.
 */
export type AnalysisStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const ANALYSIS_STATUS_LABELS: Readonly<Record<AnalysisStatus, string>> =
  Object.freeze({
    bekliyor: 'Bekliyor',
    suruyor: 'Sürüyor',
    basarili: 'Başarılı',
    basarisiz: 'Başarısız',
    iptal: 'İptal'
  });
