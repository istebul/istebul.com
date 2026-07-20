/**
 * İSTEBUL Business Analysis Engine — yerleşik KPI tanımları (PR-102B).
 */

import type { KpiDefinition } from './KpiDefinition';

export const BUILTIN_KPI_DEFINITIONS: readonly KpiDefinition[] = Object.freeze([
  Object.freeze({
    id: 'entity-count',
    name: 'Entity Count',
    description: 'Dataset içindeki entity sayısı.',
    category: 'dataset-metrics',
    unit: 'adet',
    calculationType: 'adet',
    order: 1
  }),
  Object.freeze({
    id: 'record-count',
    name: 'Record Count',
    description: 'Tüm entity satırlarının toplamı.',
    category: 'dataset-metrics',
    unit: 'adet',
    calculationType: 'adet',
    order: 2
  }),
  Object.freeze({
    id: 'column-count',
    name: 'Column Count',
    description: 'Tüm entity sütunlarının toplamı.',
    category: 'dataset-metrics',
    unit: 'adet',
    calculationType: 'adet',
    order: 3
  }),
  Object.freeze({
    id: 'total-field-count',
    name: 'Total Field Count',
    description: 'Satır × sütun alan slotlarının toplamı.',
    category: 'dataset-metrics',
    unit: 'adet',
    calculationType: 'adet',
    order: 4
  }),
  Object.freeze({
    id: 'empty-value-count',
    name: 'Empty Value Count',
    description: 'Boş string hücre sayısı.',
    category: 'data-quality',
    unit: 'adet',
    calculationType: 'adet',
    order: 5
  }),
  Object.freeze({
    id: 'empty-value-ratio',
    name: 'Empty Value Ratio',
    description: 'Boş hücrelerin toplam alanlara oranı.',
    category: 'data-quality',
    unit: 'oran',
    calculationType: 'oran',
    order: 6
  }),
  Object.freeze({
    id: 'filled-value-ratio',
    name: 'Filled Value Ratio',
    description: 'Dolu hücrelerin toplam alanlara oranı.',
    category: 'data-quality',
    unit: 'oran',
    calculationType: 'oran',
    order: 7
  }),
  Object.freeze({
    id: 'null-value-count',
    name: 'Null Value Count',
    description: 'Null / tanımsız hücre sayısı.',
    category: 'data-quality',
    unit: 'adet',
    calculationType: 'adet',
    order: 8
  }),
  Object.freeze({
    id: 'average-column-count',
    name: 'Average Column Count',
    description: 'Entity başına ortalama sütun sayısı.',
    category: 'structure',
    unit: 'adet',
    calculationType: 'ortalama',
    order: 9
  }),
  Object.freeze({
    id: 'average-record-width',
    name: 'Average Record Width',
    description: 'Satır başına ortalama alan genişliği.',
    category: 'structure',
    unit: 'adet',
    calculationType: 'ortalama',
    order: 10
  }),
  Object.freeze({
    id: 'dataset-version',
    name: 'Dataset Version',
    description: 'Dataset şema sürümü / revizyon etiketi.',
    category: 'metadata',
    unit: 'etiket',
    calculationType: 'metin',
    order: 11
  }),
  Object.freeze({
    id: 'entity-names',
    name: 'Entity Names',
    description: 'Entity adlarının virgülle birleşik listesi.',
    category: 'metadata',
    unit: 'liste',
    calculationType: 'metin',
    order: 12
  })
]);

export const BUILTIN_KPI_DEFINITION_COUNT = BUILTIN_KPI_DEFINITIONS.length;

export function getBuiltinKpiDefinition(
  id: string
): KpiDefinition | undefined {
  return BUILTIN_KPI_DEFINITIONS.find((item) => item.id === id);
}
