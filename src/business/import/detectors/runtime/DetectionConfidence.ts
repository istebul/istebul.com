/**
 * İSTEBUL Business Import Engine — DetectionConfidence (PR-101D).
 *
 * Kural tabanlı güven skoru; AI yoktur.
 */

/** Güven skoru — kapalı aralık [0.00, 1.00] */
export type DetectionConfidence = number;

export function clampConfidence(value: number): DetectionConfidence {
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

/** İki ondalığa yuvarlar (0.00–1.00). */
export function roundConfidence(value: number): DetectionConfidence {
  return Math.round(clampConfidence(value) * 100) / 100;
}

export type ConfidenceBand = 'high' | 'medium' | 'low';

export function confidenceBand(value: DetectionConfidence): ConfidenceBand {
  const c = clampConfidence(value);
  if (c >= 0.75) {
    return 'high';
  }
  if (c >= 0.4) {
    return 'medium';
  }
  return 'low';
}
