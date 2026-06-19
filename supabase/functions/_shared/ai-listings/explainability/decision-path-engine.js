/**
 * Decision Explainability — decision formation path (Sprint-25).
 */

/**
 * @param {number} score
 * @param {number} [good=65]
 * @param {number} [warn=45]
 * @returns {'positive'|'neutral'|'warning'|'negative'}
 */
export function resolvePathStatus(score, good = 65, warn = 45) {
  const s = Number(score) || 0;
  if (s >= good) return 'positive';
  if (s >= warn) return 'neutral';
  if (s >= 30) return 'warning';
  return 'negative';
}

/**
 * @param {number} score
 * @param {number} [high=75]
 * @param {number} [mid=50]
 * @returns {'low'|'medium'|'high'}
 */
export function resolvePathImpact(score, high = 75, mid = 50) {
  const s = Number(score) || 0;
  if (s >= high) return 'high';
  if (s >= mid) return 'medium';
  return 'low';
}

/**
 * @param {Record<string, unknown>} signals
 * @param {Record<string, unknown>|null} purchaseDecision
 * @returns {Array<{ id: string, label: string, status: string, impact: string, explanation: string }>}
 */
export function buildDecisionPath(signals, purchaseDecision) {
  const listingScore = clampListingCompleteness(signals);
  const riskScore = 100 - Number(signals.riskScore ?? 50);

  const steps = [
    {
      id: 'listing_info',
      label: 'İlan bilgileri',
      status: resolvePathStatus(listingScore),
      impact: resolvePathImpact(listingScore),
      explanation: listingScore >= 65
        ? 'Temel ilan bilgileri karar için yeterli görünüyor.'
        : 'İlan bilgileri kısmen eksik; ek doğrulama önerilir.'
    },
    {
      id: 'quality_score',
      label: 'Kalite skoru',
      status: resolvePathStatus(signals.qualityScore),
      impact: resolvePathImpact(signals.qualityScore),
      explanation: `Kalite skoru ${signals.qualityScore} — veri tamlığı ve içerik gücünü yansıtır.`
    },
    {
      id: 'trust_score',
      label: 'Güven skoru',
      status: resolvePathStatus(signals.trustScore),
      impact: resolvePathImpact(signals.trustScore),
      explanation: `Güven skoru ${signals.trustScore} — doğrulama ve risk profilini özetler.`
    },
    {
      id: 'ownership_cost',
      label: 'Toplam maliyet / finansman etkisi',
      status: resolvePathStatus(signals.ownershipCostSignal),
      impact: resolvePathImpact(signals.ownershipCostSignal),
      explanation: signals.hasOwnershipCostData
        ? 'Toplam maliyet sinyali karara dahil edildi.'
        : 'Maliyet verisi sınırlı; varsayılan sinyal kullanıldı.'
    },
    {
      id: 'negotiation_signal',
      label: 'Pazarlık sinyali',
      status: resolvePathStatus(signals.negotiationSignal),
      impact: resolvePathImpact(signals.negotiationSignal),
      explanation: signals.hasNegotiationData
        ? 'Pazarlık verisi fiyat konumunu destekliyor.'
        : 'Pazarlık sinyali fiyat zekâsından türetildi.'
    },
    {
      id: 'risks',
      label: 'Riskler',
      status: resolvePathStatus(riskScore),
      impact: resolvePathImpact(riskScore),
      explanation: riskScore >= 65
        ? 'Risk profili kontrol edilebilir görünüyor.'
        : 'Risk faktörleri karar netliğini sınırlayabilir.'
    },
    {
      id: 'purchase_decision',
      label: 'Al kararı',
      status: purchaseDecision
        ? purchaseDecision.decisionLevel === 'avoid'
          ? 'negative'
          : purchaseDecision.decisionLevel === 'strong_buy_candidate' || purchaseDecision.decisionLevel === 'buy_candidate'
            ? 'positive'
            : 'neutral'
        : 'neutral',
      impact: purchaseDecision ? 'high' : 'medium',
      explanation: purchaseDecision
        ? `Al kararı: ${purchaseDecision.decisionLabel} — ${purchaseDecision.primaryActionLabel}.`
        : 'Al kararı modülü mevcut değil; temel sinyallerle açıklama üretildi.'
    }
  ];

  return steps;
}

/**
 * @param {Record<string, unknown>} signals
 * @returns {number}
 */
function clampListingCompleteness(signals) {
  let score = 40;
  if (signals.hasImageEvidence) score += 15;
  if (signals.hasPriceEvidence) score += 20;
  score += Math.max(0, 25 - Number(signals.missingCritical?.length ?? 0) * 8);
  return Math.min(100, Math.max(0, Math.round(score)));
}
