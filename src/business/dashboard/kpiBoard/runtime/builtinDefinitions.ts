/**
 * Builtin KPI tanımları (PR-105D).
 */

import type { KpiDefinition } from './KpiDefinition';
import {
  KPI_LABELS,
  KPI_ORDER,
  KPI_SOURCE_PART_BY_ID,
  KPI_UNIT_BY_ID
} from './KpiId';

export const BUILTIN_KPI_DEFINITIONS: readonly KpiDefinition[] = Object.freeze(
  KPI_ORDER.map((id, index) =>
    Object.freeze({
      id,
      kpiCode: `KPI_${id.toUpperCase().replace(/-/g, '_')}`,
      name: KPI_LABELS[id],
      description: `Standart dashboard KPI: ${KPI_LABELS[id]}`,
      unit: KPI_UNIT_BY_ID[id],
      sourcePartId: KPI_SOURCE_PART_BY_ID[id],
      order: index + 1,
      enabled: true
    })
  )
);

export const BUILTIN_KPI_DEFINITION_COUNT = BUILTIN_KPI_DEFINITIONS.length;

export function getBuiltinKpiDefinition(id: string): KpiDefinition | undefined {
  return BUILTIN_KPI_DEFINITIONS.find((item) => item.id === id);
}

export function getBuiltinKpiDefinitionByCode(
  kpiCode: string
): KpiDefinition | undefined {
  return BUILTIN_KPI_DEFINITIONS.find((item) => item.kpiCode === kpiCode);
}
