/**
 * AI Decision Coach — category-based verification questions (Sprint-17 v1).
 */

/** @type {Readonly<Record<string, ReadonlyArray<string>>>} */
export const VERIFICATION_QUESTIONS_BY_CATEGORY = Object.freeze({
  vehicle: Object.freeze([
    'Tramer kaydı var mı?',
    'Yetkili servis geçmişi belgelenebiliyor mu?',
    'Kilometre doğrulanabiliyor mu?',
    'Değişen/boyalı parça var mı?',
    'Lastik, bakım ve muayene durumu nedir?'
  ]),
  housing: Object.freeze([
    'Tapu durumu ve mülkiyet net mi?',
    'Deprem riski ve bina yaşı doğrulanabiliyor mu?',
    'Aidat ve ortak giderler net mi?',
    'Krediye uygunluk durumu nedir?',
    'İskan ve yapı ruhsatı mevcut mu?'
  ]),
  real_estate: Object.freeze([
    'Tapu durumu ve mülkiyet net mi?',
    'Deprem riski ve bina yaşı doğrulanabiliyor mu?',
    'Aidat ve ortak giderler net mi?',
    'Krediye uygunluk durumu nedir?',
    'İskan ve yapı ruhsatı mevcut mu?'
  ]),
  travel: Object.freeze([
    'İptal koşulları net mi?',
    'Konum doğrulaması yapılabiliyor mu?',
    'Kullanıcı yorumları incelenebiliyor mu?',
    'Ek ücretler ve gizli masraflar var mı?',
    'Sezon fiyatı ve tarih uyumu net mi?'
  ]),
  general: Object.freeze([
    'Satıcıdan kayıt ve belge doğrulaması istenebiliyor mu?',
    'Fiyat ve koşullar yazılı olarak netleştirilebiliyor mu?',
    'Kaynak ve iletişim bilgileri doğrulanabiliyor mu?'
  ])
});

/**
 * @param {string} category
 * @returns {string[]}
 */
export function resolveCategoryForQuestions(category) {
  const key = String(category ?? 'vehicle').toLowerCase();
  if (key === 'housing' || key === 'real_estate') return [...VERIFICATION_QUESTIONS_BY_CATEGORY.housing];
  if (key === 'travel' || key === 'tatil') return [...VERIFICATION_QUESTIONS_BY_CATEGORY.travel];
  if (key === 'vehicle' || key === 'arac' || key === 'auto') return [...VERIFICATION_QUESTIONS_BY_CATEGORY.vehicle];
  return [...VERIFICATION_QUESTIONS_BY_CATEGORY.general];
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string[]}
 */
export function buildVerificationQuestions(ctx) {
  const category =
    ctx.user_intent?.category ??
    ctx.selected_recommendation?.category ??
    'vehicle';

  const questions = resolveCategoryForQuestions(String(category));
  const missing = Array.isArray(ctx.missing_fields) ? ctx.missing_fields : [];

  if (missing.some((f) => /fotoğraf/i.test(String(f)))) {
    questions.push('Güncel ve detaylı fotoğraflar paylaşılabiliyor mu?');
  }
  if (missing.some((f) => /konum/i.test(String(f)))) {
    questions.push('Konum ve adres bilgisi netleştirilebiliyor mu?');
  }

  return [...new Set(questions)].slice(0, 7);
}
