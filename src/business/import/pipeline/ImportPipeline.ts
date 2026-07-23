/**
 * İSTEBUL Business Import Engine — pipeline aşama tanımları.
 *
 * Yalnızca aşama sözleşmesi; çalıştırıcı implementasyonu yoktur.
 */

import type { ImportStage } from '../types/ImportStage';

/**
 * Tek bir pipeline aşamasının tanımı.
 */
export interface ImportPipelineStageDefinition {
  /** Aşama kimliği */
  id: ImportStage;
  /** Görünen ad (Türkçe) */
  name: string;
  /** Açıklama */
  description: string;
  /** Sıra — 1’den başlar */
  order: number;
}

/**
 * Architecture Freeze v1.0 — sabit aşama sırası.
 */
export const IMPORT_PIPELINE_STAGES: readonly ImportPipelineStageDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'adapter-secimi',
      name: 'Adapter Seçimi',
      description:
        'Kaynak tipine göre adapter ve reader kaydı seçilir; henüz dosya okunmaz.',
      order: 1
    }),
    Object.freeze({
      id: 'okuma',
      name: 'Okuma',
      description:
        'IImportReader ile ham payload referansı okunur (implementasyon sonraki PR).',
      order: 2
    }),
    Object.freeze({
      id: 'tespit',
      name: 'Tespit',
      description: 'IImportDetector ile şema ve entity önerileri üretilir.',
      order: 3
    }),
    Object.freeze({
      id: 'semantik-esleme',
      name: 'Semantik Eşleme',
      description:
        'ISemanticMapper ile sütunlar resmi entity şemasına bağlanır.',
      order: 4
    }),
    Object.freeze({
      id: 'normalizasyon',
      name: 'Normalizasyon',
      description: 'IDataNormalizer ile BusinessDataset üretilir.',
      order: 5
    }),
    Object.freeze({
      id: 'dogrulama',
      name: 'Doğrulama',
      description: 'IImportValidator ile dataset doğrulanır.',
      order: 6
    }),
    Object.freeze({
      id: 'dataset-olusturma',
      name: 'Dataset Oluşturma',
      description: 'Doğrulanmış dataset sonuç paketine bağlanır.',
      order: 7
    }),
    Object.freeze({
      id: 'tamamlandi',
      name: 'Tamamlandı',
      description: 'ImportResult döndürülür.',
      order: 8
    })
  ]);

export const IMPORT_PIPELINE_STAGE_COUNT = IMPORT_PIPELINE_STAGES.length;

export function getImportPipelineStage(
  id: ImportStage
): ImportPipelineStageDefinition | undefined {
  return IMPORT_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listImportPipelineStages(): readonly ImportPipelineStageDefinition[] {
  return IMPORT_PIPELINE_STAGES;
}
