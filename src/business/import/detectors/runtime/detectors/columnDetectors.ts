/**
 * Built-in column detector — tip, nullable, oranlar, aday alan (PR-101D).
 */

import type { CandidateField, DetectedColumn } from '../DetectedColumn';
import { roundConfidence } from '../DetectionConfidence';
import {
  columnNameSuggestsIdentity,
  computeTypeConfidence,
  dominantType,
  emptyRatio,
  isEmptyValue,
  normalizeColumnName,
  takeSamples,
  uniqueRatio
} from '../helpers';
import type { ColumnDetector } from './types';

const FIELD_ALIASES: ReadonlyArray<{
  fieldKey: string;
  patterns: readonly string[];
}> = [
  { fieldKey: 'id', patterns: ['id', 'kimlik', 'uuid', 'kod'] },
  { fieldKey: 'name', patterns: ['ad', 'adi', 'name', 'title', 'baslik'] },
  { fieldKey: 'sku', patterns: ['sku', 'urun_kodu', 'barkod', 'barcode'] },
  { fieldKey: 'quantity', patterns: ['adet', 'miktar', 'qty', 'quantity', 'stok'] },
  { fieldKey: 'price', patterns: ['fiyat', 'tutar', 'price', 'amount', 'ucret'] },
  { fieldKey: 'date', patterns: ['tarih', 'date', 'created_at', 'olusturma'] },
  { fieldKey: 'email', patterns: ['email', 'eposta', 'mail'] },
  { fieldKey: 'phone', patterns: ['telefon', 'phone', 'gsm', 'tel'] },
  {
    fieldKey: 'customer',
    patterns: ['musteri', 'customer', 'client', 'alici']
  },
  {
    fieldKey: 'supplier',
    patterns: ['tedarikci', 'supplier', 'vendor', 'satici']
  }
];

function candidateFieldsFor(name: string): CandidateField[] {
  const normalized = normalizeColumnName(name);
  const fields: CandidateField[] = [];
  for (const alias of FIELD_ALIASES) {
    for (const pattern of alias.patterns) {
      if (
        normalized === pattern ||
        normalized.includes(pattern) ||
        pattern.includes(normalized)
      ) {
        const exact = normalized === pattern;
        fields.push({
          fieldKey: alias.fieldKey,
          confidence: roundConfidence(exact ? 0.92 : 0.7),
          reason: `Kolon adı eşleşmesi: ${pattern}`
        });
        break;
      }
    }
  }
  return fields;
}

export const defaultColumnDetector: ColumnDetector = {
  id: 'default-column-detector',
  name: 'Varsayılan kolon dedektörü',
  description:
    'İlkel tip, nullable, empty/unique oranı, örnek değer ve aday alan üretir.',
  detect(columnName, index, values, context): DetectedColumn {
    const maxSamples = context.maxSampleValues ?? 5;
    const empty = emptyRatio(values);
    const unique = uniqueRatio(values);
    let { type, consistency } = dominantType(values);
    const nameBoost = columnNameSuggestsIdentity(columnName) ? 0.8 : 0;
    if (columnNameSuggestsIdentity(columnName) && type === 'metin') {
      type = 'kimlik';
      consistency = Math.max(consistency, 0.75);
    }
    const nullable = values.some((v) => isEmptyValue(v));
    const isCollection = values.some((v) => Array.isArray(v));
    if (isCollection && type !== 'karisik') {
      type = 'json';
    }
    const confidence = computeTypeConfidence({
      consistency,
      emptyRatio: empty,
      sampleSize: values.filter((v) => !isEmptyValue(v)).length,
      nameBoost
    });

    return {
      name: columnName,
      index,
      detectedType: type,
      nullable,
      isCollection,
      sampleValues: Object.freeze(takeSamples(values, maxSamples)),
      uniqueRatio: unique,
      emptyRatio: empty,
      confidence,
      candidateFields: Object.freeze(candidateFieldsFor(columnName))
    };
  }
};

export const BUILTIN_COLUMN_DETECTORS: readonly ColumnDetector[] = Object.freeze([
  defaultColumnDetector
]);
