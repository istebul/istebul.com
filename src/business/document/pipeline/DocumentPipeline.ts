/**
 * Document pipeline aşama tanımları.
 */

import type { DocumentStage } from '../models/DocumentStage';

export interface DocumentPipelineStageDefinition {
  id: DocumentStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: DocumentPipelineStageDefinition[] = [
  {
    id: 'rapor-dogrulama',
    name: 'Report Validation',
    description:
      'ReportModel yapısal ve durum doğrulaması (implementasyon sonraki PR).',
    order: 1
  },
  {
    id: 'yerlesim-derleme',
    name: 'Layout Assembly',
    description: 'ILayoutBuilder ile DocumentLayout üretilir.',
    order: 2
  },
  {
    id: 'bolum-formatlama',
    name: 'Section Formatting',
    description:
      'Report bölümleri DocumentSection biçimine dönüştürülür (sonraki PR).',
    order: 3
  },
  {
    id: 'stil-cozumu',
    name: 'Style Resolution',
    description: 'IStyleResolver ile stil ve tema çözülür.',
    order: 4
  },
  {
    id: 'dokuman-birlestirme',
    name: 'Document Composition',
    description: 'IDocumentComposer ile DocumentModel taslağı birleştirilir.',
    order: 5
  },
  {
    id: 'dokuman-derleme',
    name: 'Document Assembly',
    description: 'Nihai DocumentModel paketlenir ve döndürülür.',
    order: 6
  }
];

export const DOCUMENT_PIPELINE_STAGES: readonly DocumentPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const DOCUMENT_PIPELINE_STAGE_COUNT = DOCUMENT_PIPELINE_STAGES.length;

export function getDocumentPipelineStage(
  id: DocumentStage
): DocumentPipelineStageDefinition | undefined {
  return DOCUMENT_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listDocumentPipelineStages(): readonly DocumentPipelineStageDefinition[] {
  return DOCUMENT_PIPELINE_STAGES;
}
