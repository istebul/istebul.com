/**
 * İSTEBUL Business Decision Engine — yerleşik politika tanımları (PR-103B).
 */

import type { PolicyDefinition } from './PolicyDefinition';

/**
 * Built-in threshold defaults.
 */
export const BUILTIN_POLICY_THRESHOLDS = Object.freeze({
  MINIMUM_DATA_QUALITY_SCORE: 70,
  MINIMUM_ENTITY_COUNT: 1,
  MINIMUM_ROW_COUNT: 1
});

export const BUILTIN_POLICY_DEFINITIONS: readonly PolicyDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'minimum-data-quality-score',
      name: 'Minimum Data Quality Score',
      description:
        'AnalysisResult üzerinden türetilen veri kalitesi skorunun minimum eşiğin altında olup olmadığını kontrol eder.',
      category: 'data-quality' as const,
      severity: 'WARNING' as const,
      operator: 'lt' as const,
      threshold: BUILTIN_POLICY_THRESHOLDS.MINIMUM_DATA_QUALITY_SCORE,
      order: 1,
      enabled: true
    }),
    Object.freeze({
      id: 'critical-finding-present',
      name: 'Critical Finding Present',
      description:
        'AnalysisResult içinde kritik (kritik) önemde bulgu olup olmadığını kontrol eder.',
      category: 'analysis' as const,
      severity: 'CRITICAL' as const,
      operator: 'finding-severity' as const,
      findingSeverity: 'kritik' as const,
      order: 2,
      enabled: true
    }),
    Object.freeze({
      id: 'error-rule-present',
      name: 'Error Rule Present',
      description:
        'Kural kaynaklı (ruleId) hata/kritik bulgu olup olmadığını kontrol eder.',
      category: 'analysis' as const,
      severity: 'ERROR' as const,
      operator: 'finding-rule' as const,
      findingSeverity: 'kritik' as const,
      order: 3,
      enabled: true
    }),
    Object.freeze({
      id: 'minimum-dataset-size',
      name: 'Minimum Dataset Size',
      description:
        'AnalysisResult.statistics entity ve satır sayılarının minimum eşiği karşılayıp karşılamadığını kontrol eder.',
      category: 'dataset' as const,
      severity: 'ERROR' as const,
      operator: 'lt' as const,
      threshold: BUILTIN_POLICY_THRESHOLDS.MINIMUM_ENTITY_COUNT,
      order: 4,
      enabled: true
    }),
    Object.freeze({
      id: 'required-metadata-available',
      name: 'Required Metadata Available',
      description:
        'AnalysisResult için zorunlu metadata alanlarının (requestId, datasetId, statistics, completedAt) mevcut olduğunu doğrular.',
      category: 'metadata' as const,
      severity: 'ERROR' as const,
      operator: 'present' as const,
      order: 5,
      enabled: true
    })
  ]);

export const BUILTIN_POLICY_DEFINITION_COUNT =
  BUILTIN_POLICY_DEFINITIONS.length;

export function getBuiltinPolicyDefinition(
  id: string
): PolicyDefinition | undefined {
  return BUILTIN_POLICY_DEFINITIONS.find((item) => item.id === id);
}
