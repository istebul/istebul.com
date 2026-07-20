/**
 * İSTEBUL Business Analysis Engine — yerleşik finding tanımları (PR-102D).
 */

import type { FindingDefinition } from './FindingDefinition';

export const BUILTIN_FINDING_DEFINITIONS: readonly FindingDefinition[] =
  Object.freeze([
    Object.freeze({
      id: 'finding-empty-value-ratio-threshold',
      code: 'EMPTY_VALUE_RATIO_THRESHOLD',
      title: 'Empty Value Ratio Threshold',
      description: 'Boş değer oranı eşiği aşıldı.',
      category: 'data-quality',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'empty-value-ratio-threshold',
      order: 1,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-null-value-ratio-threshold',
      code: 'NULL_VALUE_RATIO_THRESHOLD',
      title: 'Null Value Ratio Threshold',
      description: 'Null değer oranı eşiği aşıldı.',
      category: 'data-quality',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'null-value-ratio-threshold',
      order: 2,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-filled-value-ratio-threshold',
      code: 'FILLED_VALUE_RATIO_THRESHOLD',
      title: 'Filled Value Ratio Threshold',
      description: 'Dolu değer oranı minimum eşiğin altında.',
      category: 'data-quality',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'filled-value-ratio-threshold',
      order: 3,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-minimum-entity-count',
      code: 'MINIMUM_ENTITY_COUNT',
      title: 'Minimum Entity Count',
      description: 'Dataset minimum entity sayısını karşılamıyor.',
      category: 'dataset-structure',
      defaultSeverity: 'ERROR',
      sourceRuleId: 'minimum-entity-count',
      order: 4,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-minimum-record-count',
      code: 'MINIMUM_RECORD_COUNT',
      title: 'Minimum Record Count',
      description: 'Dataset minimum kayıt sayısını karşılamıyor.',
      category: 'dataset-structure',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'minimum-record-count',
      order: 5,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-minimum-column-count',
      code: 'MINIMUM_COLUMN_COUNT',
      title: 'Minimum Column Count',
      description: 'Dataset minimum sütun sayısını karşılamıyor.',
      category: 'dataset-structure',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'minimum-column-count',
      order: 6,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-dataset-version-present',
      code: 'DATASET_VERSION_PRESENT',
      title: 'Dataset Version Present',
      description: 'Dataset version bilgisi eksik.',
      category: 'metadata',
      defaultSeverity: 'ERROR',
      sourceRuleId: 'dataset-version-present',
      order: 7,
      enabled: true
    }),
    Object.freeze({
      id: 'finding-entity-name-present',
      code: 'ENTITY_NAME_PRESENT',
      title: 'Entity Name Present',
      description: 'Entity adı eksik veya boş.',
      category: 'metadata',
      defaultSeverity: 'WARNING',
      sourceRuleId: 'entity-name-present',
      order: 8,
      enabled: true
    })
  ]);

export const BUILTIN_FINDING_DEFINITION_COUNT =
  BUILTIN_FINDING_DEFINITIONS.length;

export function getBuiltinFindingDefinition(
  id: string
): FindingDefinition | undefined {
  return BUILTIN_FINDING_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinFindingDefinitionByRuleId(
  ruleId: string
): FindingDefinition | undefined {
  return BUILTIN_FINDING_DEFINITIONS.find(
    (item) => item.sourceRuleId === ruleId
  );
}
