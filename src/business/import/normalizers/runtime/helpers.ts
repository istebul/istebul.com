/**
 * Normalizasyon yardımcıları (PR-101H).
 */

import type { NormalizedPrimitiveType } from './NormalizedField';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/i;

export function isNullish(value: unknown): boolean {
  return value === null || value === undefined;
}

export function isEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === '';
}

export function inferPrimitiveType(value: unknown): NormalizedPrimitiveType {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'collection';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? 'number' : 'unknown';
  }
  if (typeof value === 'bigint') {
    return 'number';
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') {
      return 'null';
    }
    if (/^(true|false|evet|hayir|yes|no|1|0)$/i.test(t)) {
      return 'boolean';
    }
    if (ISO_DATETIME.test(t) || ISO_DATE.test(t)) {
      return 'date';
    }
    if (/^-?\d+([.,]\d+)?$/.test(t.replace(/\s/g, ''))) {
      return 'number';
    }
    return 'string';
  }
  return 'unknown';
}

export function parseBoolean(value: string): boolean | null {
  const t = value.trim().toLowerCase();
  if (['true', 'evet', 'yes', '1', 'e'].includes(t)) {
    return true;
  }
  if (['false', 'hayir', 'hayır', 'no', '0', 'h'].includes(t)) {
    return false;
  }
  return null;
}

export function parseNumber(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '') {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseDateIso(value: string): string | null {
  const t = value.trim();
  if (ISO_DATETIME.test(t) || ISO_DATE.test(t)) {
    const d = new Date(t.includes('T') || t.includes(' ') ? t : `${t}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return null;
}

export function normalizeFieldName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export function cloneState<T>(state: T): T {
  return { ...state };
}

export function pushApplied(state: { appliedRuleIds: string[] }, ruleId: string): void {
  if (!state.appliedRuleIds.includes(ruleId)) {
    state.appliedRuleIds.push(ruleId);
  }
}
