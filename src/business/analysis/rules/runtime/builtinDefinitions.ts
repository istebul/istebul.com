/**
 * İSTEBUL Business Analysis Engine — yerleşik kural tanımları (PR-102C).
 */

import type { RuleDefinition } from './RuleDefinition';

/**
 * Built-in threshold defaults.
 */
export const BUILTIN_RULE_THRESHOLDS = Object.freeze({
  EMPTY_VALUE_RATIO: 0.2,
  NULL_VALUE_RATIO: 0.1,
  FILLED_VALUE_RATIO: 0.8,
  MINIMUM_ENTITY_COUNT: 1,
  MINIMUM_RECORD_COUNT: 1,
  MINIMUM_COLUMN_COUNT: 1
});

export const BUILTIN_RULE_DEFINITIONS: readonly RuleDefinition[] = Object.freeze([
  Object.freeze({
    id: 'empty-value-ratio-threshold',
    name: 'Empty Value Ratio Threshold',
    description:
      'Boş değer oranının eşik değerini aşıp aşmadığını kontrol eder.',
    category: 'data-quality',
    severity: 'WARNING',
    kpiId: 'empty-value-ratio',
    operator: 'gt',
    threshold: BUILTIN_RULE_THRESHOLDS.EMPTY_VALUE_RATIO,
    order: 1,
    enabled: true
  }),
  Object.freeze({
    id: 'null-value-ratio-threshold',
    name: 'Null Value Ratio Threshold',
    description:
      'Null değer oranının (null-value-count / total-field-count) eşiği aşıp aşmadığını kontrol eder.',
    category: 'data-quality',
    severity: 'WARNING',
    kpiId: 'null-value-count',
    kpiIds: ['null-value-count', 'total-field-count'],
    operator: 'gt',
    threshold: BUILTIN_RULE_THRESHOLDS.NULL_VALUE_RATIO,
    order: 2,
    enabled: true
  }),
  Object.freeze({
    id: 'filled-value-ratio-threshold',
    name: 'Filled Value Ratio Threshold',
    description:
      'Dolu değer oranının minimum eşiğin altına düşüp düşmediğini kontrol eder.',
    category: 'data-quality',
    severity: 'WARNING',
    kpiId: 'filled-value-ratio',
    operator: 'lt',
    threshold: BUILTIN_RULE_THRESHOLDS.FILLED_VALUE_RATIO,
    order: 3,
    enabled: true
  }),
  Object.freeze({
    id: 'minimum-entity-count',
    name: 'Minimum Entity Count',
    description: 'Dataset en az bir entity içermelidir.',
    category: 'dataset-structure',
    severity: 'ERROR',
    kpiId: 'entity-count',
    operator: 'lt',
    threshold: BUILTIN_RULE_THRESHOLDS.MINIMUM_ENTITY_COUNT,
    order: 4,
    enabled: true
  }),
  Object.freeze({
    id: 'minimum-record-count',
    name: 'Minimum Record Count',
    description: 'Dataset en az bir kayıt içermelidir.',
    category: 'dataset-structure',
    severity: 'WARNING',
    kpiId: 'record-count',
    operator: 'lt',
    threshold: BUILTIN_RULE_THRESHOLDS.MINIMUM_RECORD_COUNT,
    order: 5,
    enabled: true
  }),
  Object.freeze({
    id: 'minimum-column-count',
    name: 'Minimum Column Count',
    description: 'Dataset en az bir sütun içermelidir.',
    category: 'dataset-structure',
    severity: 'WARNING',
    kpiId: 'column-count',
    operator: 'lt',
    threshold: BUILTIN_RULE_THRESHOLDS.MINIMUM_COLUMN_COUNT,
    order: 6,
    enabled: true
  }),
  Object.freeze({
    id: 'dataset-version-present',
    name: 'Dataset Version Present',
    description: 'Dataset version bilgisinin mevcut olduğunu doğrular.',
    category: 'metadata',
    severity: 'ERROR',
    kpiId: 'dataset-version',
    operator: 'present',
    order: 7,
    enabled: true
  }),
  Object.freeze({
    id: 'entity-name-present',
    name: 'Entity Name Present',
    description: 'En az bir entity adının mevcut olduğunu doğrular.',
    category: 'metadata',
    severity: 'WARNING',
    kpiId: 'entity-names',
    operator: 'not-empty',
    order: 8,
    enabled: true
  })
]);

export const BUILTIN_RULE_DEFINITION_COUNT = BUILTIN_RULE_DEFINITIONS.length;

export function getBuiltinRuleDefinition(
  id: string
): RuleDefinition | undefined {
  return BUILTIN_RULE_DEFINITIONS.find((item) => item.id === id);
}
