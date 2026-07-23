/**
 * Semantik eşleme yardımcıları (PR-101G).
 */

export function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

export function roundConfidence(value: number): number {
  return Math.round(clampConfidence(value) * 100) / 100;
}

export type ConfidenceBand = 'high' | 'medium' | 'low';

export function confidenceBand(value: number): ConfidenceBand {
  const c = clampConfidence(value);
  if (c >= 0.75) {
    return 'high';
  }
  if (c >= 0.4) {
    return 'medium';
  }
  return 'low';
}

/**
 * Türkçe karakter + case-insensitive normalize.
 */
export function normalizeSemanticKey(name: string): string {
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
