/**
 * Export pipeline aşama tanımları.
 */

import type { ExportStage } from '../models/ExportStatus';

export interface ExportPipelineStageDefinition {
  id: ExportStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: ExportPipelineStageDefinition[] = [
  {
    id: 'export-dogrulama',
    name: 'Export Validation',
    description:
      'İstek ve kaynak (Document/Dashboard) doğrulaması (implementasyon sonraki PR).',
    order: 1
  },
  {
    id: 'format-cozumu',
    name: 'Format Resolution',
    description: 'IFormatResolver ile ExportFormat listesi çözülür.',
    order: 2
  },
  {
    id: 'sablon-cozumu',
    name: 'Template Resolution',
    description: 'ITemplateResolver ile export şablonları çözülür.',
    order: 3
  },
  {
    id: 'export-birlestirme',
    name: 'Export Composition',
    description: 'IExportComposer ile sonuç iskeleti birleştirilir.',
    order: 4
  },
  {
    id: 'artifact-derleme',
    name: 'Artifact Assembly',
    description:
      'IArtifactBuilder ile artifact tanımları üretilir (bayt yok).',
    order: 5
  },
  {
    id: 'export-sonuc',
    name: 'Export Result',
    description: 'Nihai ExportResult paketlenir ve döndürülür.',
    order: 6
  }
];

export const EXPORT_PIPELINE_STAGES: readonly ExportPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const EXPORT_PIPELINE_STAGE_COUNT = EXPORT_PIPELINE_STAGES.length;

export function getExportPipelineStage(
  id: ExportStage
): ExportPipelineStageDefinition | undefined {
  return EXPORT_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listExportPipelineStages(): readonly ExportPipelineStageDefinition[] {
  return EXPORT_PIPELINE_STAGES;
}
