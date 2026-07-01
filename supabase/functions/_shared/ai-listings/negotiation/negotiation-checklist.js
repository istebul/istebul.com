/**
 * Negotiation Intelligence — pre-offer checklist (Faz N-1).
 */

/**
 * @param {string} id
 * @param {string} label
 * @param {'pending'|'ok'|'warn'} status
 * @returns {{ id: string, label: string, status: 'pending'|'ok'|'warn' }}
 */
function checklistItem(id, label, status = 'pending') {
  return { id, label, status };
}

/**
 * @param {string} category
 * @returns {Array<{ id: string, label: string, status: 'pending'|'ok'|'warn' }>}
 */
function buildCategoryChecklist(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat === 'housing' || cat === 'konut' || cat === 'real_estate') {
    return [
      checklistItem('verify_title_deed', 'Tapu ve iskan bilgisini doğrula'),
      checklistItem('verify_dues', 'Aidat ve ortak giderleri kontrol et'),
      checklistItem('verify_location', 'Konum ve ulaşım bilgisini doğrula')
    ];
  }

  if (cat === 'vacation' || cat === 'tatil' || cat === 'travel') {
    return [
      checklistItem('verify_cancellation', 'İptal ve iade koşullarını kontrol et'),
      checklistItem('verify_season', 'Sezon ve tarih uyumunu doğrula'),
      checklistItem('verify_reviews', 'Yorum ve sağlayıcı geçmişini incele')
    ];
  }

  if (cat === 'vehicle' || cat === 'arac') {
    return [
      checklistItem('verify_inspection', 'Ekspertiz ve hasar kaydını kontrol et'),
      checklistItem('verify_mileage', 'Kilometre ve model yılını doğrula'),
      checklistItem('verify_service_history', 'Bakım geçmişini teyit et')
    ];
  }

  return [
    checklistItem('verify_listing_details', 'İlan detaylarını doğrula'),
    checklistItem('verify_provider', 'Sağlayıcı bilgisini kontrol et')
  ];
}

/**
 * @param {Record<string, unknown>} input
 * @param {ReturnType<typeof import('./negotiation-risk-engine.js').assessNegotiationRisk>} riskResult
 * @returns {Array<{ id: string, label: string, status: 'pending'|'ok'|'warn' }>}
 */
export function buildNegotiationChecklist(input, riskResult) {
  const ownershipSignal = /** @type {Record<string, unknown>} */ (input.ownershipSignal ?? {});
  const qualitySignal = /** @type {Record<string, unknown>} */ (input.qualitySignal ?? {});
  const sellerType = String(ownershipSignal.sellerType ?? 'unknown').toLowerCase();
  const verificationLevel = String(qualitySignal.verificationLevel ?? 'none').toLowerCase();
  const hasMarketReference = Boolean(
    input.marketReference &&
      (input.marketReference.medianPrice != null || input.marketReference.priceDeltaPct != null)
  );

  const checklist = [
    checklistItem(
      'verify_market_reference',
      'Piyasa referansını doğrula',
      hasMarketReference ? 'ok' : 'warn'
    ),
    checklistItem('verify_listing_details', 'İlan detaylarını doğrula', 'pending'),
    checklistItem(
      'verify_seller',
      'Satıcı veya sağlayıcı bilgisini doğrula',
      sellerType === 'unknown' ? 'warn' : 'pending'
    ),
    checklistItem('verify_extra_costs', 'Fiyat dışı maliyetleri kontrol et', 'pending')
  ];

  for (const item of buildCategoryChecklist(String(input.category ?? 'vehicle'))) {
    if (!checklist.some((entry) => entry.id === item.id)) {
      checklist.push(item);
    }
  }

  if (verificationLevel === 'none') {
    checklist.push(checklistItem('verify_documents', 'Doğrulama belgelerini talep et', 'warn'));
  } else if (verificationLevel === 'full') {
    checklist.push(checklistItem('verify_documents', 'Doğrulama belgelerini kontrol et', 'ok'));
  }

  if (riskResult.negotiationRisk === 'high') {
    checklist.push(checklistItem('review_risk_factors', 'Risk sinyallerini tekrar gözden geçir', 'warn'));
  }

  return checklist;
}
