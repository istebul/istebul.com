/**
 * Purchase Decision Intelligence — positive/risk factors (Sprint-24).
 */

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {string[]}
 */
export function buildPositiveFactors(signals, strength) {
  /** @type {string[]} */
  const factors = [];

  if (safeNumber(signals.qualityScore) >= 70) {
    factors.push('Kalite skoru güçlü');
  }
  if (safeNumber(signals.trustScore) >= 70) {
    factors.push('Güven skoru yüksek');
  }
  if (safeNumber(signals.offerAdvantage) >= 60) {
    factors.push('Fiyat seviyesi benzer alternatiflere göre makul görünüyor');
  }
  if (safeNumber(signals.ownershipCostSignal) >= 65) {
    factors.push('Toplam sahip olma maliyeti kontrol edilebilir');
  }
  if (safeNumber(signals.negotiationSignal) >= 55 && safeNumber(signals.negotiationRisk) < 50) {
    factors.push('Pazarlık alanı mevcut');
  }
  if (safeNumber(signals.recommendationScore) >= 75) {
    factors.push('Profil uyumu yüksek görünüyor');
  }
  if (safeNumber(signals.duplicateRisk) < 20) {
    factors.push('Mükerrer ilan riski düşük');
  }
  if (signals.hasImageEvidence) {
    factors.push('Görsel kanıt mevcut');
  }
  if (safeNumber(signals.missingCritical?.length ?? 0) === 0) {
    factors.push('Kritik alanlar büyük ölçüde tamamlanmış');
  }

  if (!factors.length) {
    factors.push('Mevcut verilerle ön değerlendirme yapılabilir');
  }

  return factors.slice(0, 5);
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>} strength
 * @returns {string[]}
 */
export function buildRiskFactors(signals, strength) {
  /** @type {string[]} */
  const factors = [];

  if (safeNumber(signals.missingCritical?.length ?? 0) > 0) {
    factors.push('Kritik bilgiler eksik');
  }
  if (signals.priceUncertainty) {
    factors.push('Fiyat seviyesi doğrulanmalı');
  }
  if (!signals.hasImageEvidence) {
    factors.push('Görsel kanıt zayıf');
  }
  if (safeNumber(signals.duplicateRisk) >= 40) {
    factors.push('Mükerrer ilan riski var');
  }
  if (safeNumber(signals.ownershipCostSignal) < 45) {
    factors.push('Toplam maliyet belirsiz');
  }
  if (safeNumber(signals.suspiciousPrice) >= 35) {
    factors.push('Şüpheli fiyat sinyali mevcut');
  }
  if (safeNumber(signals.staleRisk) >= 45) {
    factors.push('İlan güncelliği zayıf görünüyor');
  }
  if (safeNumber(signals.categoryRisk) >= 40) {
    factors.push('Kategoriye özgü risk sinyali mevcut');
  }
  if (safeNumber(signals.negotiationRisk) >= 60) {
    factors.push('Pazarlık riski yüksek görünüyor');
  }

  if (!factors.length && strength.riskLevel === 'medium') {
    factors.push('Orta düzeyde doğrulama ihtiyacı var');
  }
  if (!factors.length && strength.riskLevel === 'high') {
    factors.push('Genel risk profili yüksek');
  }

  return factors.slice(0, 5);
}

/**
 * @param {unknown} value
 * @returns {number}
 */
function safeNumber(value) {
  const n = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
