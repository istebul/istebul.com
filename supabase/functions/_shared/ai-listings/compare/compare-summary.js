/**
 * Compare Intelligence v1 — summary, tradeoffs, next steps (Sprint-27).
 */

import { clampScore, safeNumber } from '../engine/score-utils.js';

/** @type {Readonly<Record<string, string>>} */
export const COMPARE_LEVEL_LABELS = Object.freeze({
  clear_winner: 'Net avantaj',
  slight_advantage: 'Hafif avantaj',
  close_call: 'Yakın karar',
  weak_comparison: 'Zayıf karşılaştırma'
});

/** @type {Readonly<string[]>} */
export const COMPARE_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alınır',
  'kaçırılmaz fırsat',
  'garanti kazanç',
  'risksiz',
  'mutlaka al',
  'mutlaka sat',
  'kesin al',
  'yatırım tavsiyesi',
  'garantili kazanç'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeCompareText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of COMPARE_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenComparePhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  return COMPARE_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {number} dataQuality
 * @param {number} itemCount
 * @returns {number}
 */
export function computeCompareScore(dataQuality, itemCount) {
  let score = clampScore(dataQuality);
  if (itemCount >= 3) score = clampScore(score + 5);
  if (itemCount >= 2) score = clampScore(score + 10);
  return score;
}

/**
 * @param {string} compareLevel
 * @returns {string}
 */
export function resolveCompareLabel(compareLevel) {
  return COMPARE_LEVEL_LABELS[compareLevel] ?? COMPARE_LEVEL_LABELS.weak_comparison;
}

/**
 * @param {number} dataQuality
 * @param {string} winnerLevel
 * @returns {string}
 */
export function resolveCompareLevelFromContext(dataQuality, winnerLevel) {
  if (dataQuality < 40) return 'weak_comparison';
  return winnerLevel;
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {number}
 */
export function computeDataQuality(items) {
  if (!items.length) return 0;

  let total = 0;
  for (const item of items) {
    const ctx = /** @type {Record<string, unknown>} */ (item._context ?? {});
    const signals = /** @type {Record<string, unknown>} */ (ctx.signals ?? {});
    let q = 30;
    if (signals.hasPriceEvidence) q += 15;
    if (signals.hasImageEvidence) q += 10;
    if (signals.hasOwnershipCostData) q += 15;
    if (signals.hasNegotiationData) q += 10;
    if (ctx.purchase_decision) q += 10;
    if (ctx.explainability) q += 10;
    q -= Number(signals.missingCritical?.length ?? 0) * 5;
    total += clampScore(q);
  }

  return clampScore(Math.round(total / items.length));
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {Record<string, unknown>|null} winner
 * @param {string} compareLevel
 * @param {Record<string, unknown>} scoreComparison
 * @returns {string}
 */
export function buildCompareSummary(items, winner, compareLevel, scoreComparison) {
  const count = items.length;
  const label = COMPARE_LEVEL_LABELS[compareLevel] ?? 'Karşılaştırma';

  let intro = `${count} seçenek karar, maliyet, kalite, güven ve risk sinyalleri üzerinden karşılaştırıldı.`;
  let outcome = 'Seçenekler birbirine yakın görünüyor; ek doğrulama önerilir.';

  if (compareLevel === 'clear_winner' && winner) {
    outcome = `"${winner.title}" net avantaj gösteriyor; yine de belge ve maliyet doğrulaması önerilir.`;
  } else if (compareLevel === 'slight_advantage' && winner) {
    outcome = `"${winner.title}" hafif avantajlı görünüyor; diğer seçenekler de değerlendirilebilir.`;
  } else if (compareLevel === 'weak_comparison') {
    outcome = 'Veri eksikliği nedeniyle karşılaştırma sınırlı; ek bilgi toplanması önerilir.';
  }

  const gapNote = scoreComparison.gap > 0
    ? ` Skor farkı ${scoreComparison.gap} puan.`
    : '';

  return sanitizeCompareText(`${intro} Sonuç: ${label.toLowerCase()}.${gapNote} ${outcome}`);
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @param {Record<string, unknown>} scoreComparison
 * @param {Record<string, unknown>} costComparison
 * @param {Record<string, unknown>} riskComparison
 * @returns {string[]}
 */
export function buildTradeoffs(items, scoreComparison, costComparison, riskComparison) {
  /** @type {string[]} */
  const tradeoffs = [];

  if (items.length >= 2) {
    const sorted = [...items].sort((a, b) => safeNumber(b.score) - safeNumber(a.score));
    const first = sorted[0];
    const second = sorted[1];

    if (first && second) {
      if (safeNumber(first.decisionScore) > safeNumber(second.decisionScore)) {
        tradeoffs.push(
          `${first.title} daha güçlü karar skoruna sahip, ancak maliyet belirsizliği ${safeNumber(first.costSignal) < safeNumber(second.costSignal) ? 'daha yüksek' : 'benzer seviyede'} olabilir.`
        );
      }

      if (safeNumber(second.costSignal) > safeNumber(first.costSignal)) {
        tradeoffs.push(
          `${second.title} maliyet sinyali açısından daha olumlu görünüyor, fakat karar skoru daha düşük.`
        );
      }
    }
  }

  const riskItems = Array.isArray(riskComparison.items) ? riskComparison.items : [];
  const lowestRisk = riskItems.find((r) => r.id === riskComparison.lowestRiskId);
  const highestRisk = riskItems.find((r) => r.id === riskComparison.highestRiskId);

  if (lowestRisk && highestRisk && lowestRisk.id !== highestRisk.id) {
    tradeoffs.push(
      `"${lowestRisk.title}" daha düşük risk taşıyor, "${highestRisk.title}" ise daha yüksek risk sinyalleri içeriyor.`
    );
  }

  const costItems = Array.isArray(costComparison.items) ? costComparison.items : [];
  const lowestCost = costItems.find((c) => c.id === costComparison.lowestCostId);
  const highestCost = costItems.find((c) => c.id === costComparison.highestCostId);

  if (lowestCost && highestCost && lowestCost.id !== highestCost.id && lowestCost.dataAvailable) {
    tradeoffs.push(
      `Maliyet açısından "${lowestCost.title}" daha düşük görünüyor; karar skoru farkı değerlendirilmeli.`
    );
  }

  for (const item of items) {
    const negs = Array.isArray(item.weaknesses) ? item.weaknesses : [];
    const pos = Array.isArray(item.strengths) ? item.strengths : [];
    if (pos.length && negs.length) {
      tradeoffs.push(`${item.title}: ${pos[0]}, ancak ${negs[0].toLowerCase()}.`);
    }
    if (tradeoffs.length >= 6) break;
  }

  if (!tradeoffs.length) {
    tradeoffs.push('Seçenekler arasında belirgin bir trade-off tespit edilmedi; detaylı inceleme önerilir.');
  }

  return tradeoffs.slice(0, 6).map(sanitizeCompareText);
}

/**
 * @param {string} category
 * @returns {string[]}
 */
export function buildCategoryNextSteps(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat.includes('housing') || cat === 'konut' || cat === 'real_estate') {
    return [
      'Tapu, iskan ve bina bilgilerini karşılaştır',
      'Emsal fiyatları kontrol et',
      'Aidat ve finansman maliyetlerini kıyasla',
      'Deprem ve lokasyon risklerini birlikte değerlendir',
      'Toplam sahip olma maliyetlerini yan yana hesapla'
    ];
  }

  if (cat.includes('vacation') || cat === 'tatil' || cat === 'travel') {
    return [
      'Konum, yorum ve iptal koşullarını karşılaştır',
      'Ek ücretleri netleştir',
      'Tarih / kapasite uyumunu kontrol et',
      'Toplam tatil maliyetlerini kıyasla',
      'Rezervasyon koşullarını yazılı doğrula'
    ];
  }

  return [
    'İki aracın ekspertiz ve tramer kayıtlarını karşılaştır',
    'Kilometre ve bakım geçmişlerini doğrula',
    'Toplam sahip olma maliyetlerini kıyasla',
    'Pazarlık sonrası karar skorunu yeniden değerlendir',
    'Ruhsat ve şasi bilgilerini kontrol et'
  ];
}
