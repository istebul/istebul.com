/**
 * Ortak yardımcı fonksiyonlar — PR-101D.
 */

import type { DetectedType } from './DetectedType';
import {
  clampConfidence,
  roundConfidence,
  type DetectionConfidence
} from './DetectionConfidence';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  return false;
}

export function normalizeColumnName(name: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    I: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u'
  };
  const mapped = name.replace(/[çÇğĞıIİöÖşŞüÜ]/g, (ch) => trMap[ch] ?? ch);
  return mapped
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MONEY_RE =
  /^(₺|TL|TRY|USD|EUR|\$|€)?\s*-?\d{1,3}([.,]\d{3})*([.,]\d{1,2})?\s*(₺|TL|TRY|USD|EUR|\$|€)?$/i;
const PERCENT_RE = /^-?\d+([.,]\d+)?\s*%$/;

/**
 * Tek değer için tip sezgisi.
 */
export function inferValueType(value: unknown): DetectedType {
  if (isEmptyValue(value)) {
    return 'bilinmeyen';
  }
  if (typeof value === 'boolean') {
    return 'mantiksal';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return 'bilinmeyen';
    }
    return Number.isInteger(value) ? 'tamsayi' : 'sayi';
  }
  if (typeof value === 'bigint') {
    return 'tamsayi';
  }
  if (Array.isArray(value) || isPlainObject(value)) {
    return 'json';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^(true|false|evet|hayir|yes|no)$/i.test(trimmed)) {
      return 'mantiksal';
    }
    if (ISO_DATETIME.test(trimmed)) {
      return 'tarih-saat';
    }
    if (ISO_DATE.test(trimmed)) {
      return 'tarih';
    }
    if (UUID_RE.test(trimmed)) {
      return 'kimlik';
    }
    if (PERCENT_RE.test(trimmed)) {
      return 'yuzde';
    }
    if (MONEY_RE.test(trimmed) && /[₺$€]|TL|TRY|USD|EUR/i.test(trimmed)) {
      return 'para';
    }
    if (/^-?\d+([.,]\d+)?$/.test(trimmed)) {
      const asNum = Number(trimmed.replace(',', '.'));
      if (Number.isFinite(asNum)) {
        return Number.isInteger(asNum) && !/[.,]/.test(trimmed)
          ? 'tamsayi'
          : 'sayi';
      }
    }
    return 'metin';
  }
  return 'bilinmeyen';
}

/**
 * Kolon adı kimlik / id ipucu veriyor mu.
 */
export function columnNameSuggestsIdentity(name: string): boolean {
  const n = normalizeColumnName(name);
  return (
    n === 'id' ||
    n.endsWith('_id') ||
    n === 'sku' ||
    n === 'uuid' ||
    n === 'kod' ||
    n.endsWith('_kod')
  );
}

/**
 * Değer listesinden baskın tip + karışık tespiti.
 */
export function dominantType(
  values: readonly unknown[]
): { type: DetectedType; consistency: number } {
  const counts = new Map<DetectedType, number>();
  let nonEmpty = 0;
  for (const value of values) {
    if (isEmptyValue(value)) {
      continue;
    }
    nonEmpty += 1;
    const t = inferValueType(value);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (nonEmpty === 0) {
    return { type: 'bilinmeyen', consistency: 0 };
  }
  let best: DetectedType = 'bilinmeyen';
  let bestCount = 0;
  for (const [type, count] of counts) {
    if (count > bestCount) {
      best = type;
      bestCount = count;
    }
  }
  const consistency = bestCount / nonEmpty;
  if (counts.size > 1 && consistency < 0.7) {
    return { type: 'karisik', consistency };
  }
  return { type: best, consistency };
}

/**
 * Tip güveni — kural tabanlı.
 */
export function computeTypeConfidence(input: {
  consistency: number;
  emptyRatio: number;
  sampleSize: number;
  nameBoost?: number;
}): DetectionConfidence {
  const sampleFactor =
    input.sampleSize <= 0
      ? 0.2
      : input.sampleSize < 3
        ? 0.55
        : input.sampleSize < 10
          ? 0.8
          : 1;
  const emptyPenalty = Math.min(0.45, input.emptyRatio * 0.5);
  const nameBoost = clampConfidence(input.nameBoost ?? 0) * 0.15;
  const raw =
    input.consistency * 0.7 * sampleFactor +
    (1 - emptyPenalty) * 0.15 +
    nameBoost +
    0.1;
  return roundConfidence(raw);
}

export function uniqueRatio(values: readonly unknown[]): number {
  if (values.length === 0) {
    return 0;
  }
  const set = new Set(values.map((v) => JSON.stringify(v)));
  return roundConfidence(set.size / values.length);
}

export function emptyRatio(values: readonly unknown[]): number {
  if (values.length === 0) {
    return 1;
  }
  const empty = values.filter((v) => isEmptyValue(v)).length;
  return roundConfidence(empty / values.length);
}

export function takeSamples(
  values: readonly unknown[],
  max: number
): unknown[] {
  const out: unknown[] = [];
  for (const value of values) {
    if (isEmptyValue(value)) {
      continue;
    }
    out.push(value);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}
