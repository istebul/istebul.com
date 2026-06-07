/**
 * Negotiation Intelligence — pre-offer verification checklist (Sprint-22 v1).
 */

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const NEGOTIATION_CHECKLIST_BY_CATEGORY = Object.freeze({
  vehicle: Object.freeze([
    'Ekspertiz raporu',
    'Tramer kaydı',
    'Servis geçmişi',
    'Km doğrulama',
    'Boya / değişen parça kontrolü',
    'Lastik ve bakım durumu'
  ]),
  housing: Object.freeze([
    'Tapu ve mülkiyet durumu',
    'İskan durumu',
    'Krediye uygunluk',
    'Aidat ve giderler',
    'Deprem riski / bina yaşı',
    'Konut ekspertizi'
  ]),
  travel: Object.freeze([
    'İptal koşulları',
    'Ek ücretler',
    'Konum doğrulama',
    'Yorumlar ve puanlar',
    'Sezon fiyatı karşılaştırması'
  ])
});

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @returns {string[]}
 */
export function resolveNegotiationCategoryKey(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') return 'housing';
  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') return 'travel';
  return 'vehicle';
}

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {Record<string, unknown>} [input]
 * @returns {string[]}
 */
export function buildNegotiationChecklist(category, input = {}) {
  const key = resolveNegotiationCategoryKey(category);
  const base = [...(NEGOTIATION_CHECKLIST_BY_CATEGORY[key] ?? NEGOTIATION_CHECKLIST_BY_CATEGORY.vehicle)];

  const duplicate = String(input.duplicate_status ?? 'new');
  if (duplicate === 'exact' || duplicate === 'similar') {
    base.unshift('Benzer / mükerrer ilan karşılaştırması');
  }

  const priceIntel = /** @type {Record<string, unknown>} */ (input.price_intelligence ?? {});
  if (String(priceIntel.price_position ?? '') === 'underpriced') {
    base.unshift('Fiyat avantajı doğrulaması (hızlı kontrol önerilir)');
  }

  return base;
}
