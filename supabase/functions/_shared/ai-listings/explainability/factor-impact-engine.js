/**
 * Decision Explainability — positive/negative factor drivers (Sprint-25).
 */

/**
 * @param {Record<string, unknown>} signals
 * @returns {Array<{ key: string, label: string, impact: string, score: number, explanation: string }>}
 */
export function buildTopPositiveDrivers(signals) {
  /** @type {Array<{ key: string, label: string, impact: string, score: number, explanation: string }>} */
  const drivers = [];

  if (Number(signals.qualityScore) >= 65) {
    drivers.push({
      key: 'quality',
      label: 'Kalite skoru güçlü',
      impact: Number(signals.qualityScore) >= 80 ? 'high' : 'medium',
      score: Number(signals.qualityScore),
      explanation: 'İlan kalite skoru kararın olumlu yönünü destekliyor.'
    });
  }
  if (Number(signals.trustScore) >= 65) {
    drivers.push({
      key: 'trust',
      label: 'Güven skoru yüksek',
      impact: Number(signals.trustScore) >= 80 ? 'high' : 'medium',
      score: Number(signals.trustScore),
      explanation: 'Güven skoru doğrulama profilini güçlendiriyor.'
    });
  }
  if (Number(signals.ownershipCostSignal) >= 60) {
    drivers.push({
      key: 'ownershipCost',
      label: 'Toplam maliyet kontrol edilebilir',
      impact: Number(signals.ownershipCostSignal) >= 75 ? 'high' : 'medium',
      score: Number(signals.ownershipCostSignal),
      explanation: 'Sahip olma maliyeti sinyali kabul edilebilir görünüyor.'
    });
  }
  if (Number(signals.negotiationSignal) >= 55) {
    drivers.push({
      key: 'negotiation',
      label: 'Pazarlık alanı mevcut',
      impact: 'medium',
      score: Number(signals.negotiationSignal),
      explanation: 'Pazarlık sinyali fiyat konumunda esneklik gösterebilir.'
    });
  }
  if (Number(signals.missingCritical?.length ?? 0) <= 1) {
    drivers.push({
      key: 'missingInfo',
      label: 'Eksik kritik bilgi az',
      impact: 'medium',
      score: 100 - Number(signals.missingInfoPenalty ?? 0),
      explanation: 'Kritik alanlar büyük ölçüde tamamlanmış görünüyor.'
    });
  }
  if (Number(signals.recommendationScore) >= 70) {
    drivers.push({
      key: 'recommendation',
      label: 'Profil uyumu yüksek',
      impact: Number(signals.recommendationScore) >= 85 ? 'high' : 'medium',
      score: Number(signals.recommendationScore),
      explanation: 'Profil uyumu kararın temelini oluşturuyor.'
    });
  }
  if (signals.hasImageEvidence) {
    drivers.push({
      key: 'images',
      label: 'Görsel kanıt mevcut',
      impact: 'low',
      score: 70,
      explanation: 'Fotoğraflar ilan doğrulamasına katkı sağlıyor.'
    });
  }

  if (!drivers.length) {
    drivers.push({
      key: 'baseline',
      label: 'Temel veriler mevcut',
      impact: 'low',
      score: 50,
      explanation: 'Mevcut verilerle ön değerlendirme yapılabilir.'
    });
  }

  return drivers.sort((a, b) => b.score - a.score).slice(0, 5);
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {Array<{ key: string, label: string, impact: string, score: number, explanation: string }>}
 */
export function buildTopNegativeDrivers(signals) {
  /** @type {Array<{ key: string, label: string, impact: string, score: number, explanation: string }>} */
  const drivers = [];

  if (Number(signals.missingCritical?.length ?? 0) > 0) {
    drivers.push({
      key: 'missingInfo',
      label: 'Kritik bilgiler eksik',
      impact: Number(signals.missingCritical.length) >= 3 ? 'high' : 'medium',
      score: Number(signals.missingInfoPenalty ?? 0),
      explanation: 'Eksik kritik alanlar karar netliğini azaltıyor.'
    });
  }
  if (signals.priceUncertainty) {
    drivers.push({
      key: 'price',
      label: 'Fiyat seviyesi doğrulanmalı',
      impact: 'medium',
      score: Number(signals.suspiciousPrice ?? 30),
      explanation: 'Fiyat konumu ek piyasa karşılaştırması gerektirebilir.'
    });
  }
  if (!signals.hasImageEvidence) {
    drivers.push({
      key: 'images',
      label: 'Görsel kanıt zayıf',
      impact: 'medium',
      score: 60,
      explanation: 'Fotoğraf eksikliği doğrulamayı zorlaştırıyor.'
    });
  }
  if (Number(signals.duplicateRisk) >= 35) {
    drivers.push({
      key: 'duplicate',
      label: 'Mükerrer ilan riski var',
      impact: Number(signals.duplicateRisk) >= 60 ? 'high' : 'medium',
      score: Number(signals.duplicateRisk),
      explanation: 'Benzer ilan eşleşmesi güvenilirliği etkileyebilir.'
    });
  }
  if (Number(signals.ownershipCostSignal) < 45) {
    drivers.push({
      key: 'ownershipCost',
      label: 'Toplam maliyet belirsiz',
      impact: 'medium',
      score: 100 - Number(signals.ownershipCostSignal ?? 50),
      explanation: 'Maliyet sinyali net değil; ek hesaplama önerilir.'
    });
  }
  if (Number(signals.suspiciousPrice) >= 35) {
    drivers.push({
      key: 'suspiciousPrice',
      label: 'Şüpheli fiyat sinyali',
      impact: 'high',
      score: Number(signals.suspiciousPrice),
      explanation: 'Fiyat sapması ek inceleme gerektirebilir.'
    });
  }
  if (Number(signals.staleRisk) >= 40) {
    drivers.push({
      key: 'stale',
      label: 'İlan güncelliği zayıf',
      impact: 'medium',
      score: Number(signals.staleRisk),
      explanation: 'Eski ilan verisi karar güncelliğini etkileyebilir.'
    });
  }

  if (!drivers.length) {
    drivers.push({
      key: 'baseline',
      label: 'Belirgin olumsuz sinyal sınırlı',
      impact: 'low',
      score: 20,
      explanation: 'Mevcut verilerde belirgin olumsuz sinyal tespit edilmedi.'
    });
  }

  return drivers.sort((a, b) => b.score - a.score).slice(0, 5);
}
