/**
 * İSTEBUL Business Import Engine — dataset builder yardımcıları (PR-101I).
 */

import type { BusinessEntityTypeId } from '../../../dataset/entities/BusinessEntityType';
import { getEntityTypeById } from '../../../dataset/entities/EntityTypeRegistry';
import type { BusinessColumnDataType } from '../../../dataset/models/BusinessColumn';
import type { BusinessCellValue } from '../../../dataset/models/BusinessRow';
import type { BusinessSource } from '../../../dataset/models/BusinessSource';
import type { BusinessSourceTypeId } from '../../../dataset/models/BusinessSource';
import type { ImportSource } from '../../types/ImportSource';
import type {
  NormalizedField,
  NormalizedPrimitiveType
} from '../../normalizers/runtime/NormalizedField';
import type { BusinessColumn } from '../../../dataset/models/BusinessColumn';

const ENTITY_TYPE_IDS = new Set<string>(
  (
    [
      'urun',
      'kategori',
      'stok',
      'depo',
      'raf',
      'sayim',
      'siparis',
      'musteri',
      'tedarikci',
      'personel',
      'departman',
      'vardiya',
      'gelir',
      'gider',
      'fatura',
      'tahsilat',
      'odeme',
      'butce',
      'arac',
      'sevkiyat',
      'gorev',
      'risk',
      'kpi',
      'dokuman'
    ] as const
  ).map(String)
);

/**
 * Normalize ilkel tip → BusinessColumn veri tipi.
 */
export function primitiveTypeToColumnDataType(
  primitiveType: NormalizedPrimitiveType
): BusinessColumnDataType {
  switch (primitiveType) {
    case 'string':
      return 'metin';
    case 'number':
      return 'sayi';
    case 'boolean':
      return 'mantiksal';
    case 'date':
      return 'tarih-saat';
    case 'null':
      return 'metin';
    case 'collection':
      return 'json';
    case 'unknown':
      return 'metin';
    default: {
      const _exhaustive: never = primitiveType;
      void _exhaustive;
      return 'metin';
    }
  }
}

/**
 * Normalize alan → hücre değeri.
 */
export function cellValueFromField(field: NormalizedField): BusinessCellValue {
  if (field.primitiveType === 'date' && field.dateIso) {
    return field.dateIso;
  }
  const { value } = field;
  if (value === null) {
    return null;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return Object.freeze([...value]);
  }
  return String(value);
}

/**
 * Entity tipi çözümleme — bilinmeyen değerler varsayılana düşer.
 */
export function resolveEntityTypeId(
  candidate: string | undefined,
  fallback: BusinessEntityTypeId = 'urun'
): BusinessEntityTypeId {
  if (candidate && ENTITY_TYPE_IDS.has(candidate)) {
    return candidate as BusinessEntityTypeId;
  }
  return fallback;
}

/**
 * Import kaynağı → BusinessSource.
 */
export function mapImportSourceToBusinessSource(
  source: ImportSource,
  capturedAt?: string
): BusinessSource {
  const type: BusinessSourceTypeId =
    source.type === 'manual' ? 'manual-entry' : source.type;
  return {
    type,
    label: source.label,
    uri: source.uri,
    capturedAt: capturedAt ?? source.requestedAt,
    metadata: source.metadata
  };
}

/**
 * Normalize alan → BusinessColumn.
 */
export function columnFromNormalizedField(
  field: NormalizedField,
  order: number
): BusinessColumn {
  return {
    id: field.fieldName,
    name: field.fieldName,
    dataType: primitiveTypeToColumnDataType(field.primitiveType),
    required: false,
    sourceFieldKey: field.sourceKey,
    order
  };
}

/**
 * Entity görünen adı.
 */
export function entityDisplayName(entityType: BusinessEntityTypeId): string {
  return getEntityTypeById(entityType)?.name ?? entityType;
}

/**
 * Benzersiz alan tanımlarını entity tipine göre grupla.
 */
export function groupFieldDefinitionsByEntity(
  fields: readonly NormalizedField[],
  defaultEntityType: BusinessEntityTypeId
): Map<BusinessEntityTypeId, NormalizedField[]> {
  const map = new Map<BusinessEntityTypeId, NormalizedField[]>();
  for (const field of fields) {
    const entityType = resolveEntityTypeId(field.entityType, defaultEntityType);
    const list = map.get(entityType) ?? [];
    if (!list.some((f) => f.fieldName === field.fieldName)) {
      list.push(field);
    }
    map.set(entityType, list);
  }
  return map;
}
