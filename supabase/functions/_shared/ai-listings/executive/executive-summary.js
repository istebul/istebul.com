/**
 * Executive Decision Engine — Turkish executive summary (Sprint-8).
 */

import { getRiskLevel } from '../engine/risk-engine.js';

/**
 * @param {string} label
 * @returns {string}
 */
function toneFromExecutiveLabel(label) {
  switch (String(label ?? '')) {
    case 'Satın Alınabilir':
      return 'olumlu';
    case 'İncelenebilir':
      return 'genel olarak olumlu';
    case 'Dikkatli İncelenmeli':
      return 'dikkatli incelenmesi gereken';
    case 'Riskli':
      return 'risk sinyalleri içeren';
    default:
      return 'sınırlı bilgiyle zayıf';
  }
}

/**
 * @param {string[]} missingFields
 * @returns {string|null}
 */
function buildMissingFieldsSentence(missingFields) {
  const actionable = missingFields.filter((field) =>
    ['Fotoğraf', 'Konum', 'Kaynak URL', 'Açıklama'].includes(field)
  );
  if (!actionable.length) return null;

  const joined = actionable
    .slice(0, 3)
    .map((field) => field.toLocaleLowerCase('tr-TR'))
    .join(' ve ');
  return `Eksik ${joined} bilgileri tamamlanırsa karar güveni artacaktır.`;
}

/**
 * @param {{
 *   executive_label: string,
 *   executive_confidence: number,
 *   quality?: { quality_score?: number, missing_fields?: string[] },
 *   price_intelligence?: { price_score?: number, deviation_pct?: number },
 *   risk?: { risk_score?: number }
 * }} input
 * @returns {string}
 */
export function buildExecutiveSummary(input) {
  const tone = toneFromExecutiveLabel(input.executive_label);
  const riskLabel = getRiskLevel(Number(input.risk?.risk_score ?? 0)).label.toLowerCase();

  /** @type {string[]} */
  const sentences = [];

  sentences.push(
    `Mevcut bilgiler ışığında ilan ${tone} görünmektedir; bu bir deterministik analiz ön değerlendirmesidir.`
  );

  const priceScore = Number(input.price_intelligence?.price_score);
  if (Number.isFinite(priceScore) && priceScore >= 65) {
    sentences.push('Fiyat seviyesi deterministik ön değerlendirmeye göre makul aralıktadır.');
  } else if (Number.isFinite(priceScore) && priceScore > 0) {
    sentences.push('Fiyat seviyesi deterministik ön değerlendirmede iyileştirme alanı göstermektedir.');
  }

  sentences.push(`Risk seviyesi ${riskLabel}tür.`);

  const missingSentence = buildMissingFieldsSentence(input.quality?.missing_fields ?? []);
  if (missingSentence) {
    sentences.push(missingSentence);
  } else {
    sentences.push(`Karar güveni %${input.executive_confidence} seviyesindedir.`);
  }

  return sentences.slice(0, 4).join(' ');
}
