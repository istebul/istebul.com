/**
 * AI Decision Coach — actionable next steps (Sprint-17 v1).
 */

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
const CATEGORY_NEXT_STEPS = Object.freeze({
  vehicle: Object.freeze([
    'Satıcıdan servis ve tramer kaydı iste',
    'Ekspertiz planla',
    'Fiyat pazarlığı için makul teklif aralığı belirle',
    'Alternatiflerle karşılaştır',
    'Karar raporu oluştur'
  ]),
  housing: Object.freeze([
    'Tapu ve iskan belgelerini talep et',
    'Aidat ve deprem riski bilgilerini doğrula',
    'Ekspertiz veya teknik inceleme planla',
    'Alternatiflerle karşılaştır',
    'Karar raporu oluştur'
  ]),
  travel: Object.freeze([
    'İptal koşullarını yazılı olarak netleştir',
    'Konum ve yorumları doğrula',
    'Ek ücretleri kontrol et',
    'Alternatiflerle karşılaştır',
    'Karar raporu oluştur'
  ]),
  general: Object.freeze([
    'Eksik bilgileri satıcıdan talep et',
    'Fiyat ve koşulları doğrula',
    'Alternatiflerle karşılaştır',
    'Karar raporu oluştur'
  ])
});

/**
 * @param {string} category
 * @returns {string[]}
 */
function resolveCategorySteps(category) {
  const key = String(category ?? 'vehicle').toLowerCase();
  if (key === 'housing' || key === 'real_estate') return [...CATEGORY_NEXT_STEPS.housing];
  if (key === 'travel' || key === 'tatil') return [...CATEGORY_NEXT_STEPS.travel];
  if (key === 'vehicle' || key === 'arac' || key === 'auto') return [...CATEGORY_NEXT_STEPS.vehicle];
  return [...CATEGORY_NEXT_STEPS.general];
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {string[]} redFlags
 * @returns {string[]}
 */
export function buildNextSteps(ctx, redFlags = []) {
  const category =
    ctx.user_intent?.category ??
    ctx.selected_recommendation?.category ??
    'vehicle';

  /** @type {string[]} */
  const steps = [...resolveCategorySteps(String(category))];

  if (redFlags.includes('Fotoğraf yok')) {
    steps.unshift('Satıcıdan güncel fotoğraf talep et');
  }
  if (redFlags.includes('Konum yok')) {
    steps.unshift('Konum ve adres bilgisini doğrula');
  }
  if (redFlags.includes('Duplicate yüksek')) {
    steps.unshift('Benzer ilanlarla çapraz kontrol yap');
  }
  if (redFlags.includes('Fiyat çok yüksek')) {
    steps.unshift('Piyasa karşılaştırması ile fiyat pazarlığı planla');
  }

  return [...new Set(steps)].slice(0, 6);
}
