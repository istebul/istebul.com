/**
 * Purchase Decision Intelligence — wait scenario (Sprint-24).
 */

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {'low'|'medium'|'high'}
 */
export function resolveWaitBenefitLevel(signals, strength) {
  if (safeNumber(signals.missingCritical?.length ?? 0) >= 2 || signals.priceUncertainty) return 'high';
  if (strength.decisionLevel === 'wait' || strength.decisionLevel === 'negotiate_first') return 'medium';
  if (safeNumber(signals.staleRisk) >= 45) return 'medium';
  return 'low';
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {'low'|'medium'|'high'}
 */
export function resolveWaitRiskLevel(signals, strength) {
  if (safeNumber(signals.offerAdvantage) >= 70 && strength.decisionLevel === 'buy_candidate') return 'high';
  if (safeNumber(signals.recommendationScore) >= 80) return 'medium';
  if (strength.decisionLevel === 'strong_buy_candidate') return 'high';
  return 'low';
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {string}
 */
export function buildWaitExplanation(signals, strength) {
  const parts = [];

  if (safeNumber(signals.missingCritical?.length ?? 0) > 0) {
    parts.push('Veri kalitesi düşük');
  }
  if (signals.priceUncertainty) {
    parts.push('fiyat seviyesi belirsiz');
  }
  if (safeNumber(signals.staleRisk) >= 45) {
    parts.push('ilan güncelliği zayıf');
  }

  if (parts.length) {
    return `${parts.join(' ve ')} olduğu için beklemek, ek doğrulama yapılana kadar daha güvenli olabilir.`;
  }

  if (strength.decisionLevel === 'strong_buy_candidate' || strength.decisionLevel === 'buy_candidate') {
    return 'Karar seviyesi olumlu görünse de piyasa koşullarını kısa süre izlemek ek güvence sağlayabilir.';
  }

  return 'Mevcut bilgiler ışığında beklemek, ek araştırma ve doğrulama için zaman kazandırabilir.';
}

/**
 * @param {Record<string, unknown>} signals
 * @param {string} category
 * @returns {string[]}
 */
export function buildWhenToWait(signals, category) {
  /** @type {string[]} */
  const items = [];

  if (safeNumber(signals.missingCritical?.length ?? 0) > 0) {
    items.push('Kritik bilgiler tamamlanana kadar');
  }
  if (signals.priceUncertainty) {
    items.push('Fiyat doğrulaması yapılana kadar');
  }
  if (safeNumber(signals.staleRisk) >= 45) {
    items.push('İlan güncelliği teyit edilene kadar');
  }
  if (safeNumber(signals.duplicateRisk) >= 40) {
    items.push('Mükerrer ilan kontrolü tamamlanana kadar');
  }

  const cat = String(category ?? 'vehicle').toLowerCase();
  if (cat === 'vehicle' || cat === 'arac') {
    items.push('Ekspertiz ve tramer raporu alınana kadar');
  } else if (cat === 'housing' || cat === 'konut') {
    items.push('Tapu ve iskan durumu doğrulanana kadar');
  } else {
    items.push('İptal koşulları netleşene kadar');
  }

  return items.slice(0, 5);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {string[]}
 */
export function buildWhenNotToWait(signals, strength) {
  /** @type {string[]} */
  const items = [];

  if (strength.decisionLevel === 'strong_buy_candidate' && safeNumber(signals.trustScore) >= 75) {
    items.push('Güven skoru yüksek ve profil uyumu güçlüyse');
  }
  if (safeNumber(signals.offerAdvantage) >= 70 && safeNumber(signals.negotiationRisk) < 40) {
    items.push('Fiyat avantajı belirgin ve pazarlık riski düşükse');
  }
  if (safeNumber(signals.missingCritical?.length ?? 0) === 0 && !signals.priceUncertainty) {
    items.push('Kritik alanlar tamamlanmış ve fiyat doğrulanmışsa');
  }
  if (safeNumber(signals.staleRisk) < 20) {
    items.push('İlan güncel ve doğrulama tamamlanmışsa');
  }

  if (!items.length) {
    items.push('Tüm doğrulamalar tamamlandıysa ve toplam maliyet kabul edilebilirse');
  }

  return items.slice(0, 5);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @param {string} category
 * @returns {{
 *   waitBenefitLevel: 'low'|'medium'|'high',
 *   waitRiskLevel: 'low'|'medium'|'high',
 *   explanation: string,
 *   whenToWait: string[],
 *   whenNotToWait: string[]
 * }}
 */
export function buildWaitScenario(signals, strength, category) {
  return {
    waitBenefitLevel: resolveWaitBenefitLevel(signals, strength),
    waitRiskLevel: resolveWaitRiskLevel(signals, strength),
    explanation: buildWaitExplanation(signals, strength),
    whenToWait: buildWhenToWait(signals, category),
    whenNotToWait: buildWhenNotToWait(signals, strength)
  };
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
