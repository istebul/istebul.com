/**
 * İSTEBUL Business Analysis Engine — pipeline aşama tanımları.
 */

import type { AnalysisStage } from '../models/AnalysisStage';

export interface AnalysisPipelineStageDefinition {
  id: AnalysisStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: AnalysisPipelineStageDefinition[] = [
  {
    id: 'dataset-dogrulama',
    name: 'Dataset Validation',
    description:
      'BusinessDataset yapısal ve sözleşme doğrulaması (dataset validation katmanı ile uyumlu).',
    order: 1
  },
  {
    id: 'kpi-hesaplama',
    name: 'KPI Calculation',
    description:
      'IKPIEngine ile KPI sonuçları üretilir; gerçek hesaplama sonraki PR.',
    order: 2
  },
  {
    id: 'kural-degerlendirme',
    name: 'Rule Evaluation',
    description: 'IRuleEngine ile kayıtlı kurallar değerlendirilir.',
    order: 3
  },
  {
    id: 'bulgu-uretimi',
    name: 'Finding Generation',
    description: 'IFindingBuilder ile yapılandırılmış bulgular derlenir.',
    order: 4
  },
  {
    id: 'ozet-uretimi',
    name: 'Summary Generation',
    description: 'ISummaryBuilder ile AnalysisSummary üretilir.',
    order: 5
  },
  {
    id: 'sonuc-derleme',
    name: 'Result Assembly',
    description: 'AnalysisResult paketi oluşturulur ve döndürülür.',
    order: 6
  }
];

export const ANALYSIS_PIPELINE_STAGES: readonly AnalysisPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const ANALYSIS_PIPELINE_STAGE_COUNT = ANALYSIS_PIPELINE_STAGES.length;

export function getAnalysisPipelineStage(
  id: AnalysisStage
): AnalysisPipelineStageDefinition | undefined {
  return ANALYSIS_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listAnalysisPipelineStages(): readonly AnalysisPipelineStageDefinition[] {
  return ANALYSIS_PIPELINE_STAGES;
}
