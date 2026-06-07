/**
 * Listing Quality & Trust — pre-decision checklist (Sprint-23 v1).
 */

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const QUALITY_CHECKLIST_BY_CATEGORY = Object.freeze({
  vehicle: Object.freeze([
    'Ruhsat ve şasi bilgilerini doğrula',
    'Tramer / hasar kaydını kontrol et',
    'Ekspertiz raporu iste',
    'Kilometre tutarlılığını kontrol et',
    'Lastik, bakım ve muayene durumunu doğrula'
  ]),
  housing: Object.freeze([
    'Tapu durumunu kontrol et',
    'İskân / yapı kullanma izin belgesini sor',
    'Aidat ve ortak giderleri öğren',
    'Deprem yönetmeliği ve bina yaşını kontrol et',
    'Lokasyon, ulaşım ve çevre risklerini değerlendir'
  ]),
  travel: Object.freeze([
    'İptal koşullarını kontrol et',
    'Konum doğruluğunu haritadan teyit et',
    'Ek ücretleri sor',
    'Fotoğrafların güncelliğini kontrol et',
    'Yorum / puan geçmişini incele'
  ])
});

/**
 * @param {'vehicle'|'housing'|'travel'|string} category
 * @param {Record<string, unknown>} [context]
 * @returns {string[]}
 */
export function buildQualityChecklist(category, context = {}) {
  const cat = String(category ?? 'vehicle').toLowerCase();
  let key = 'vehicle';
  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') key = 'housing';
  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') key = 'travel';

  const base = [...(QUALITY_CHECKLIST_BY_CATEGORY[key] ?? QUALITY_CHECKLIST_BY_CATEGORY.vehicle)];

  const duplicate = String(context.duplicate_status ?? 'new');
  if (duplicate === 'exact' || duplicate === 'similar') {
    base.unshift('Benzer / mükerrer ilan karşılaştırması yap');
  }

  return base;
}
