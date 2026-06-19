/**
 * Listing Quality & Trust — safe Turkish summary (Sprint-23 v1).
 */

/** @type {ReadonlyArray<string>} */
export const QUALITY_FORBIDDEN_PHRASES = Object.freeze([
  'garanti',
  'kazandırır',
  'yatırım tavsiyesi',
  'kesin değer',
  'garantili',
  'kesin alınır',
  'mutlaka alın',
  'gerçek piyasa değeri'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeQualitySummary(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of QUALITY_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'ön değerlendirme');
  }
  return safe;
}

/**
 * @param {number} qualityScore
 * @param {'excellent'|'good'|'fair'|'weak'|string} qualityLevel
 * @param {number} trustScore
 * @param {'high'|'medium'|'low'|string} trustLevel
 * @param {string[]} strongSignals
 * @param {string[]} weakSignals
 * @returns {string}
 */
export function buildQualitySummaryText(
  qualityScore,
  qualityLevel,
  trustScore,
  trustLevel,
  strongSignals,
  weakSignals
) {
  let opening = 'Bu ilan, temel bilgi doluluğu açısından ';

  if (qualityLevel === 'excellent' || qualityLevel === 'good') {
    opening += 'güçlü görünüyor.';
  } else if (qualityLevel === 'fair') {
    opening += 'orta düzeyde görünüyor.';
  } else {
    opening += 'zayıf görünüyor.';
  }

  let middle = '';
  if (weakSignals.length > 0) {
    const focus = weakSignals.slice(0, 2).join(' ve ').toLowerCase();
    middle = ` Ancak ${focus} karar öncesi ayrıca kontrol edilmelidir.`;
  } else if (trustLevel === 'low') {
    middle = ' Ancak güven sinyalleri karar öncesi ayrıca kontrol edilmelidir.';
  } else if (trustLevel === 'medium') {
    middle = ' Bazı güven sinyalleri karar öncesi doğrulanmalıdır.';
  } else {
    middle = ' Temel doğrulama adımları tamamlandığında değerlendirmeye devam edilebilir.';
  }

  let closing = '';
  if (qualityScore < 50 || trustScore < 50) {
    closing = ' Nihai karar öncesi eksik alanların tamamlanması önerilir.';
  }

  return sanitizeQualitySummary(`${opening}${middle}${closing}`);
}

/**
 * @param {Array<{ label: string, score: number, passed: boolean }>} qualitySignals
 * @param {Array<{ label: string, triggered: boolean, description?: string }>} trustSignals
 * @returns {{ strong: string[], weak: string[] }}
 */
export function partitionQualityTrustSignals(qualitySignals, trustSignals) {
  /** @type {string[]} */
  const strong = [];
  /** @type {string[]} */
  const weak = [];

  for (const signal of qualitySignals) {
    if (signal.score >= 80 && signal.passed) {
      strong.push(`${signal.label} yeterli`);
    } else if (signal.score < 50 || !signal.passed) {
      weak.push(`${signal.label} zayıf veya eksik`);
    }
  }

  for (const signal of trustSignals) {
    if (signal.triggered) {
      weak.push(signal.description || signal.label);
    }
  }

  return {
    strong: [...new Set(strong)].slice(0, 6),
    weak: [...new Set(weak)].slice(0, 6)
  };
}
