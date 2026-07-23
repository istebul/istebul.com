/**
 * İSTEBUL Business Import Engine — adapter kayıt sistemi.
 *
 * Henüz adapter implementasyonu yoktur; yalnızca metadata kaydı.
 */

import type { BusinessSourceTypeId } from '../../dataset/models/BusinessSource';
import type { ImportAdapterTypeId } from '../types/ImportSource';

/**
 * Adapter kayıt girişi.
 */
export interface ImportAdapterRegistration {
  /** Adapter kimliği */
  id: ImportAdapterTypeId;
  /** Görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Eşlenen BusinessDataset kaynak tipi */
  datasetSourceType: BusinessSourceTypeId;
  /** Reader kayıtlı mı (gelecek) */
  readerRegistered: boolean;
  /** Sıralama */
  order: number;
}

const ADAPTERS: ImportAdapterRegistration[] = [
  {
    id: 'excel',
    name: 'Excel',
    description: 'Microsoft Excel dosyaları için adapter kaydı.',
    datasetSourceType: 'excel',
    readerRegistered: false,
    order: 1
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'CSV metin dosyaları için adapter kaydı.',
    datasetSourceType: 'csv',
    readerRegistered: false,
    order: 2
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'PDF belgeleri için adapter kaydı.',
    datasetSourceType: 'pdf',
    readerRegistered: false,
    order: 3
  },
  {
    id: 'word',
    name: 'Word',
    description: 'Word belgeleri için adapter kaydı.',
    datasetSourceType: 'word',
    readerRegistered: false,
    order: 4
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JSON dosya ve gövdeleri için adapter kaydı.',
    datasetSourceType: 'json',
    readerRegistered: false,
    order: 5
  },
  {
    id: 'xml',
    name: 'XML',
    description: 'XML kaynakları için adapter kaydı.',
    datasetSourceType: 'xml',
    readerRegistered: false,
    order: 6
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'HTTP REST uç noktaları için adapter kaydı.',
    datasetSourceType: 'rest-api',
    readerRegistered: false,
    order: 7
  },
  {
    id: 'sql',
    name: 'SQL',
    description: 'SQL sorgu sonuçları için adapter kaydı.',
    datasetSourceType: 'sql',
    readerRegistered: false,
    order: 8
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Google E-Tablolar için adapter kaydı.',
    datasetSourceType: 'google-sheets',
    readerRegistered: false,
    order: 9
  },
  {
    id: 'garsonai',
    name: 'GarsonAI',
    description:
      'GarsonAI kaynaklı veri dönüşümü için adapter kaydı (GarsonAI koduna dokunulmaz).',
    datasetSourceType: 'garsonai',
    readerRegistered: false,
    order: 10
  },
  {
    id: 'erp',
    name: 'ERP',
    description: 'ERP entegrasyonları için adapter kaydı.',
    datasetSourceType: 'erp',
    readerRegistered: false,
    order: 11
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'CRM entegrasyonları için adapter kaydı.',
    datasetSourceType: 'crm',
    readerRegistered: false,
    order: 12
  },
  {
    id: 'manual',
    name: 'Manual',
    description: 'Elle giriş / form kaynakları için adapter kaydı.',
    datasetSourceType: 'manual-entry',
    readerRegistered: false,
    order: 13
  }
];

export const IMPORT_ADAPTER_REGISTRY: readonly ImportAdapterRegistration[] =
  Object.freeze(ADAPTERS);

export function getImportAdapterById(
  id: ImportAdapterTypeId
): ImportAdapterRegistration | undefined {
  return IMPORT_ADAPTER_REGISTRY.find((entry) => entry.id === id);
}

export function listImportAdapters(): readonly ImportAdapterRegistration[] {
  return IMPORT_ADAPTER_REGISTRY;
}

export const IMPORT_ADAPTER_COUNT = IMPORT_ADAPTER_REGISTRY.length;

export default IMPORT_ADAPTER_REGISTRY;
