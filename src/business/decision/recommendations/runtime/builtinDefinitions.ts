/**
 * İSTEBUL Business Decision Engine — yerleşik recommendation tanımları (PR-103C).
 */

import type { RecommendationDefinition } from './RecommendationDefinition';

export const BUILTIN_RECOMMENDATION_DEFINITIONS: readonly RecommendationDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'rec-minimum-data-quality-score',
      code: 'MINIMUM_DATA_QUALITY_SCORE',
      title: 'Improve Data Quality Score',
      description:
        'Veri kalitesi skorunu yükseltmek için boş/null alanları ve doldurma oranını gözden geçirin.',
      category: 'data-quality' as const,
      defaultSeverity: 'WARNING' as const,
      defaultPriority: 'orta' as const,
      sourcePolicyId: 'minimum-data-quality-score',
      order: 1,
      enabled: true
    }),
    Object.freeze({
      id: 'rec-critical-finding-present',
      code: 'CRITICAL_FINDING_PRESENT',
      title: 'Address Critical Findings',
      description:
        'Kritik analiz bulgularını öncelikli olarak inceleyin ve giderin.',
      category: 'analysis' as const,
      defaultSeverity: 'CRITICAL' as const,
      defaultPriority: 'kritik' as const,
      sourcePolicyId: 'critical-finding-present',
      order: 2,
      enabled: true
    }),
    Object.freeze({
      id: 'rec-error-rule-present',
      code: 'ERROR_RULE_PRESENT',
      title: 'Resolve Error-Level Rules',
      description:
        'Kural kaynaklı hata/kritik bulguları çözmek için ilgili kuralları ve veri alanlarını kontrol edin.',
      category: 'analysis' as const,
      defaultSeverity: 'ERROR' as const,
      defaultPriority: 'yuksek' as const,
      sourcePolicyId: 'error-rule-present',
      order: 3,
      enabled: true
    }),
    Object.freeze({
      id: 'rec-minimum-dataset-size',
      code: 'MINIMUM_DATASET_SIZE',
      title: 'Increase Dataset Coverage',
      description:
        'Dataset entity ve satır sayısını minimum eşiğin üzerine çıkarın.',
      category: 'dataset' as const,
      defaultSeverity: 'ERROR' as const,
      defaultPriority: 'yuksek' as const,
      sourcePolicyId: 'minimum-dataset-size',
      order: 4,
      enabled: true
    }),
    Object.freeze({
      id: 'rec-required-metadata-available',
      code: 'REQUIRED_METADATA_AVAILABLE',
      title: 'Complete Required Metadata',
      description:
        'AnalysisResult için zorunlu metadata alanlarını (requestId, datasetId, statistics, completedAt) tamamlayın.',
      category: 'metadata' as const,
      defaultSeverity: 'ERROR' as const,
      defaultPriority: 'yuksek' as const,
      sourcePolicyId: 'required-metadata-available',
      order: 5,
      enabled: true
    })
  ]);

export const BUILTIN_RECOMMENDATION_DEFINITION_COUNT =
  BUILTIN_RECOMMENDATION_DEFINITIONS.length;

export function getBuiltinRecommendationDefinition(
  id: string
): RecommendationDefinition | undefined {
  return BUILTIN_RECOMMENDATION_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinRecommendationDefinitionByPolicyId(
  policyId: string
): RecommendationDefinition | undefined {
  return BUILTIN_RECOMMENDATION_DEFINITIONS.find(
    (item) => item.sourcePolicyId === policyId
  );
}
