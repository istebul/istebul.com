/**
 * İSTEBUL Business Decision Engine — pipeline aşama tanımları.
 */

import type { DecisionStage } from '../models/DecisionStage';

export interface DecisionPipelineStageDefinition {
  id: DecisionStage;
  name: string;
  description: string;
  order: number;
}

const STAGES: DecisionPipelineStageDefinition[] = [
  {
    id: 'analiz-sonuc-dogrulama',
    name: 'AnalysisResult Validation',
    description:
      'Analysis Engine çıktısının yapısal ve durum doğrulaması (implementasyon sonraki PR).',
    order: 1
  },
  {
    id: 'risk-degerlendirme',
    name: 'Risk Evaluation',
    description: 'IRiskEvaluator ile risk kayıtları türetilir.',
    order: 2
  },
  {
    id: 'firsat-degerlendirme',
    name: 'Opportunity Evaluation',
    description: 'IOpportunityEvaluator ile fırsat kayıtları türetilir.',
    order: 3
  },
  {
    id: 'oneri-olusturma',
    name: 'Recommendation Building',
    description: 'IRecommendationBuilder ile karar önerileri oluşturulur.',
    order: 4
  },
  {
    id: 'oncelik-hesaplama',
    name: 'Priority Calculation',
    description: 'IPriorityCalculator ile öncelik skorları hesaplanır.',
    order: 5
  },
  {
    id: 'karar-derleme',
    name: 'Decision Assembly',
    description: 'DecisionResult paketi derlenir ve döndürülür.',
    order: 6
  }
];

export const DECISION_PIPELINE_STAGES: readonly DecisionPipelineStageDefinition[] =
  Object.freeze(STAGES);

export const DECISION_PIPELINE_STAGE_COUNT = DECISION_PIPELINE_STAGES.length;

export function getDecisionPipelineStage(
  id: DecisionStage
): DecisionPipelineStageDefinition | undefined {
  return DECISION_PIPELINE_STAGES.find((stage) => stage.id === id);
}

export function listDecisionPipelineStages(): readonly DecisionPipelineStageDefinition[] {
  return DECISION_PIPELINE_STAGES;
}
