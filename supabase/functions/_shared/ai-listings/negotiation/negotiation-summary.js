/**
 * Negotiation Intelligence — safe Turkish summary (Sprint-22 v1).
 */

import { formatCostTry } from '../ownership-cost/cost-breakdown.js';

/** @type {ReadonlyArray<string>} */
export const NEGOTIATION_FORBIDDEN_PHRASES = Object.freeze([
  'kesin bu fiyata alınır',
  'garanti',
  'kazandırır',
  'yatırım tavsiyesi',
  'gerçek piyasa değeri',
  'kesin değer',
  'garantili',
  'kesin fiyat'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeNegotiationSummary(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of NEGOTIATION_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'ön değerlendirme');
  }
  return safe;
}

/**
 * @param {Record<string, unknown>} input
 * @param {Record<string, unknown>} offerRange
 * @param {'Düşük'|'Orta'|'Yüksek'|string} riskLevel
 * @returns {string[]}
 */
export function buildNegotiationReasons(input, offerRange, riskLevel) {
  /** @type {string[]} */
  const reasons = [];
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const position = String(priceIntel.price_position ?? 'unknown');
  const risk = Number(input.risk_score ?? 50);
  const quality = Number(input.quality_score ?? 50);
  const duplicate = String(input.duplicate_status ?? 'new');

  if (position === 'overpriced') {
    reasons.push('Fiyat konumu yüksek görünüyor; daha geniş pazarlık aralığı önerildi.');
  } else if (position === 'slightly_overpriced') {
    reasons.push('Fiyat konumu hafif yüksek; orta düzey pazarlık alanı değerlendirildi.');
  } else if (position === 'fair') {
    reasons.push('Fiyat konumu dengeli; sınırlı pazarlık payı önerildi.');
  } else if (position === 'underpriced') {
    reasons.push('Fiyat konumu düşük görünüyor; dikkatli teklif ve hızlı doğrulama önerilir.');
  } else {
    reasons.push('Fiyat konumu belirsiz; genel ön değerlendirme aralığı üretildi.');
  }

  if (risk >= 55) {
    reasons.push('Risk skoru yüksek olduğu için teklif aralığı aşağı çekildi.');
  }

  if (quality < 55) {
    reasons.push('Kalite skoru düşük olduğu için teklif aralığı aşağı çekildi.');
  }

  const ownership = /** @type {Record<string, unknown>} */ (input.ownership_cost ?? {});
  if (Number(ownership.total_cost ?? 0) > Number(input.listing_price ?? 0) * 1.2) {
    reasons.push('Sahip olma maliyeti yüksek; teklif aralığında maliyet baskısı yansıtıldı.');
  }

  if (duplicate === 'exact' || duplicate === 'similar') {
    reasons.push('Mükerrer / benzer ilan uyarısı: karşılaştırma yapılmadan teklif verilmemesi önerilir.');
  }

  const market = /** @type {Record<string, unknown>} */ (input.market_intelligence ?? {});
  const liquidity = String(market.liquidity_label ?? '');
  if (liquidity && /düşük|yavaş/i.test(liquidity)) {
    reasons.push('Piyasa likiditesi düşük; pazarlık süresi uzayabilir.');
  }

  if (riskLevel === 'Yüksek') {
    reasons.push('Genel pazarlık riski yüksek; doğrulama adımları tamamlanmadan nihai teklif önerilmez.');
  }

  return reasons.slice(0, 6);
}

/**
 * @param {Record<string, unknown>} offerRange
 * @param {'Düşük'|'Orta'|'Yüksek'|string} riskLevel
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
export function buildNegotiationSummaryText(offerRange, riskLevel, input = {}) {
  const low = formatCostTry(Number(offerRange.suggested_offer_low ?? 0));
  const high = formatCostTry(Number(offerRange.suggested_offer_high ?? 0));
  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  const position = String(priceIntel.price_position ?? 'unknown');

  let summary =
    `Mevcut bilgiler ışığında bu ilan için makul teklif aralığı ${low} - ${high} olarak değerlendirilebilir. `;

  if (position === 'underpriced') {
    summary +=
      'Fiyat avantajı olabileceği için hızlı doğrulama önerilir; agresif pazarlık yerine dikkatli teklif yaklaşımı uygun görünür. ';
  } else {
    summary +=
      'Fotoğraf, konum ve ekspertiz doğrulaması yapılmadan nihai teklif verilmemesi önerilir. ';
  }

  if (riskLevel === 'Yüksek') {
    summary += 'Pazarlık riski yüksek; nihai karar öncesi ek doğrulama adımları tamamlanmalıdır.';
  } else if (riskLevel === 'Orta') {
    summary += 'Ön değerlendirme tamamlanana kadar temkinli ilerlenmesi önerilir.';
  } else {
    summary += 'Ön değerlendirme sonrası doğrulama tamamlandığında teklif sürecine geçilebilir.';
  }

  return sanitizeNegotiationSummary(summary);
}
