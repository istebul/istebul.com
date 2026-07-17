/**
 * Built-in entity detectors — kolon adı kuralları (PR-101D). AI yok.
 */

import type { BusinessEntityTypeId } from '../../../../dataset/entities/BusinessEntityType';
import { getEntityTypeById } from '../../../../dataset/entities/EntityTypeRegistry';
import type { DetectedColumn } from '../DetectedColumn';
import type { DetectedEntity } from '../DetectedEntity';
import { roundConfidence } from '../DetectionConfidence';
import { normalizeColumnName } from '../helpers';
import type { SchemaContext } from '../SchemaContext';
import type { EntityDetector } from './types';

const ENTITY_COLUMN_SIGNALS: ReadonlyArray<{
  entityType: BusinessEntityTypeId;
  signals: readonly string[];
}> = [
  {
    entityType: 'urun',
    signals: ['urun', 'product', 'sku', 'barkod', 'urun_adi', 'urun_kodu']
  },
  {
    entityType: 'stok',
    signals: ['stok', 'stock', 'miktar', 'adet', 'quantity', 'depo_stok']
  },
  {
    entityType: 'musteri',
    signals: ['musteri', 'customer', 'client', 'alici', 'musteri_adi']
  },
  {
    entityType: 'tedarikci',
    signals: ['tedarikci', 'supplier', 'vendor', 'satici']
  },
  {
    entityType: 'personel',
    signals: ['personel', 'employee', 'calisan', 'staff', 'sicil']
  },
  {
    entityType: 'fatura',
    signals: ['fatura', 'invoice', 'fatura_no', 'invoice_no']
  },
  {
    entityType: 'siparis',
    signals: ['siparis', 'order', 'siparis_no', 'order_id']
  },
  {
    entityType: 'depo',
    signals: ['depo', 'warehouse', 'lokasyon', 'warehouse_id']
  },
  {
    entityType: 'kategori',
    signals: ['kategori', 'category', 'kategori_adi']
  },
  {
    entityType: 'butce',
    signals: ['butce', 'budget', 'kalem', 'butce_kodu']
  }
];

function scoreEntity(
  entityType: BusinessEntityTypeId,
  signals: readonly string[],
  columns: readonly DetectedColumn[],
  hintBoost: number
): DetectedEntity | null {
  const matched: string[] = [];
  for (const col of columns) {
    const n = normalizeColumnName(col.name);
    for (const signal of signals) {
      if (n === signal || n.includes(signal) || signal.includes(n)) {
        matched.push(col.name);
        break;
      }
    }
  }
  if (matched.length === 0 && hintBoost <= 0) {
    return null;
  }
  const base =
    matched.length === 0
      ? 0.35 * hintBoost
      : Math.min(0.95, 0.45 + matched.length * 0.18 + hintBoost * 0.15);
  const def = getEntityTypeById(entityType);
  return {
    entityType,
    label: def?.name ?? entityType,
    confidence: roundConfidence(base),
    matchedColumns: Object.freeze(matched),
    reason:
      matched.length > 0
        ? `Kolon sinyalleri: ${matched.join(', ')}`
        : 'Entity hint'
  };
}

export const defaultEntityDetector: EntityDetector = {
  id: 'default-entity-detector',
  name: 'Varsayılan entity dedektörü',
  description: 'Kolon adı sinyallerinden entity adayı üretir.',
  detect(columns, context: SchemaContext): readonly DetectedEntity[] {
    const hints = new Set(context.entityHints ?? []);
    const entities: DetectedEntity[] = [];
    for (const entry of ENTITY_COLUMN_SIGNALS) {
      const hintBoost = hints.has(entry.entityType) ? 1 : 0;
      const detected = scoreEntity(
        entry.entityType,
        entry.signals,
        columns,
        hintBoost
      );
      if (detected) {
        entities.push(detected);
      }
    }
    // Hint-only entities not in signal table
    for (const hint of hints) {
      if (entities.some((e) => e.entityType === hint)) {
        continue;
      }
      const def = getEntityTypeById(hint);
      entities.push({
        entityType: hint,
        label: def?.name ?? hint,
        confidence: roundConfidence(0.4),
        matchedColumns: Object.freeze([]),
        reason: 'Entity hint (sinyal yok)'
      });
    }
    return Object.freeze(
      [...entities].sort((a, b) => b.confidence - a.confidence)
    );
  }
};

export const BUILTIN_ENTITY_DETECTORS: readonly EntityDetector[] = Object.freeze([
  defaultEntityDetector
]);
