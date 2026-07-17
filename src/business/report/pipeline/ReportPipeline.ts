/**
 * Report pipeline aşama tanımları.
 */

import type { ReportStage } from '../models/ReportStage';

export interface ReportPipelineStageDefinition {
  id: ReportStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: ReportPipelineStageDefinition[] = [
  {
    id: 'karar-dogrulama',
    name: 'Decision Validation',
    description:
      'DecisionResult yapısal ve durum doğrulaması (implementasyon sonraki PR).',
    order: 1
  },
  {
    id: 'bolum-derleme',
    name: 'Section Assembly',
    description: 'ISectionBuilder ile rapor bölümleri derlenir.',
    order: 2
  },
  {
    id: 'kanit-toplama',
    name: 'Evidence Collection',
    description: 'IEvidenceCollector ile referans ve kanıt kayıtları toplanır.',
    order: 3
  },
  {
    id: 'rapor-birlestirme',
    name: 'Report Composition',
    description: 'IReportComposer ile ReportModel taslağı birleştirilir.',
    order: 4
  },
  {
    id: 'rapor-inceleme',
    name: 'Report Review',
    description: 'IReportReviewer ile tutarlılık incelemesi yapılır.',
    order: 5
  },
  {
    id: 'rapor-derleme',
    name: 'Report Assembly',
    description: 'Nihai ReportModel paketlenir ve döndürülür.',
    order: 6
  }
];

export const REPORT_PIPELINE_STAGES: readonly ReportPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const REPORT_PIPELINE_STAGE_COUNT = REPORT_PIPELINE_STAGES.length;

export function getReportPipelineStage(
  id: ReportStage
): ReportPipelineStageDefinition | undefined {
  return REPORT_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listReportPipelineStages(): readonly ReportPipelineStageDefinition[] {
  return REPORT_PIPELINE_STAGES;
}
