/**
 * İSTEBUL Business Decision Engine — karar pipeline aşama ve durum tipleri.
 */

export type DecisionStage =
  | 'analiz-sonuc-dogrulama'
  | 'risk-degerlendirme'
  | 'firsat-degerlendirme'
  | 'oneri-olusturma'
  | 'oncelik-hesaplama'
  | 'karar-derleme';

export type DecisionStatus =
  | 'bekliyor'
  | 'suruyor'
  | 'basarili'
  | 'basarisiz'
  | 'iptal';

export const DECISION_STATUS_LABELS: Readonly<Record<DecisionStatus, string>> =
  Object.freeze({
    bekliyor: 'Bekliyor',
    suruyor: 'Sürüyor',
    basarili: 'Başarılı',
    basarisiz: 'Başarısız',
    iptal: 'İptal'
  });
