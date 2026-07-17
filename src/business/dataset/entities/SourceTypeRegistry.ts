/**
 * İSTEBUL Business — kaynak tip kayıtları (statik).
 */

import type { BusinessSourceTypeId } from '../models/BusinessSource';

export interface BusinessSourceTypeDefinition {
  /** Kimlik */
  id: BusinessSourceTypeId;
  /** Ad — Türkçe görünen ad */
  name: string;
  /** Açıklama */
  description: string;
  /** Sıralama */
  order: number;
}

const SOURCE_TYPES: BusinessSourceTypeDefinition[] = [
  {
    id: 'excel',
    name: 'Excel',
    description: 'Microsoft Excel (.xlsx, .xls) dosyaları.',
    order: 1
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Virgül veya noktalı virgül ayrımlı metin dosyaları.',
    order: 2
  },
  {
    id: 'pdf',
    name: 'PDF',
    description: 'PDF belgelerinden çıkarılan tablo veya metin.',
    order: 3
  },
  {
    id: 'word',
    name: 'Word',
    description: 'Word belgelerinden yapılandırılmış veri.',
    order: 4
  },
  {
    id: 'json',
    name: 'JSON',
    description: 'JSON dosya veya API gövdeleri.',
    order: 5
  },
  {
    id: 'xml',
    name: 'XML',
    description: 'XML şema veya belge kaynakları.',
    order: 6
  },
  {
    id: 'rest-api',
    name: 'REST API',
    description: 'HTTP REST uç noktalarından çekilen veri.',
    order: 7
  },
  {
    id: 'sql',
    name: 'SQL',
    description: 'İlişkisel veritabanı sorgu sonuçları.',
    order: 8
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Google E-Tablolar bağlantıları.',
    order: 9
  },
  {
    id: 'garsonai',
    name: 'GarsonAI',
    description: 'GarsonAI operasyon verisi (dönüştürülmüş; GarsonAI koduna dokunulmaz).',
    order: 10
  },
  {
    id: 'erp',
    name: 'ERP',
    description: 'Kurumsal ERP entegrasyonları.',
    order: 11
  },
  {
    id: 'crm',
    name: 'CRM',
    description: 'CRM sistemlerinden müşteri ve pipeline verisi.',
    order: 12
  },
  {
    id: 'manual-entry',
    name: 'Manual Entry',
    description: 'Elle girilen veya form tabanlı kayıtlar.',
    order: 13
  }
];

export const SOURCE_TYPE_REGISTRY: readonly BusinessSourceTypeDefinition[] =
  Object.freeze(SOURCE_TYPES);

export function getSourceTypeById(
  id: BusinessSourceTypeId
): BusinessSourceTypeDefinition | undefined {
  return SOURCE_TYPE_REGISTRY.find((entry) => entry.id === id);
}

export function listSourceTypes(): readonly BusinessSourceTypeDefinition[] {
  return SOURCE_TYPE_REGISTRY;
}

export const SOURCE_TYPE_COUNT = SOURCE_TYPE_REGISTRY.length;

export default SOURCE_TYPE_REGISTRY;
