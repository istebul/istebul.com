/**
 * Decision Explainability — Turkish labels, summaries, safe language (Sprint-25).
 */

/** @type {ReadonlyArray<string>} */
export const EXPLAINABILITY_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alınır',
  'kaçırılmaz fırsat',
  'garanti kazanç',
  'risksiz',
  'kesin yatırım',
  'mutlaka al',
  'mutlaka sat',
  'kesin al',
  'garanti'
]);

/** @type {Readonly<Record<string, string>>} */
export const EXPLANATION_LEVEL_LABELS = Object.freeze({
  very_clear: 'Çok net açıklanabilir',
  clear: 'Açıklanabilir',
  partial: 'Kısmen açıklanabilir',
  weak: 'Zayıf açıklanabilir'
});

/** @type {Readonly<Record<string, string>>} */
export const CONFIDENCE_LEVEL_LABELS = Object.freeze({
  high: 'Yüksek veri güveni',
  medium: 'Orta veri güveni',
  low: 'Düşük veri güveni'
});

/** @type {Readonly<Record<string, string>>} */
export const CONTRIBUTION_LABELS = Object.freeze({
  recommendation: 'Profil uyumu',
  quality: 'Kalite skoru',
  trust: 'Güven skoru',
  negotiation: 'Pazarlık sinyali',
  ownershipCost: 'Toplam maliyet',
  missingInfo: 'Eksik bilgi',
  duplicateRisk: 'Mükerrer ilan riski',
  suspiciousPrice: 'Şüpheli fiyat',
  staleRisk: 'İlan güncelliği'
});

/**
 * @param {number} score
 * @returns {'very_clear'|'clear'|'partial'|'weak'}
 */
export function resolveExplanationLevel(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'very_clear';
  if (s >= 65) return 'clear';
  if (s >= 45) return 'partial';
  return 'weak';
}

/**
 * @param {number} score
 * @returns {'high'|'medium'|'low'}
 */
export function resolveConfidenceLevel(score) {
  const s = Number(score) || 0;
  if (s >= 80) return 'high';
  if (s >= 55) return 'medium';
  return 'low';
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeExplainabilityText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of EXPLAINABILITY_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenExplainabilityPhrase(text) {
  const lower = String(text ?? '').toLocaleLowerCase('tr-TR');
  return EXPLAINABILITY_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {Record<string, unknown>} context
 * @returns {string}
 */
export function buildReasoningSummary(context) {
  const {
    hasQuality = true,
    hasTrust = true,
    hasCost = false,
    hasNegotiation = false,
    hasGaps = false
  } = context;

  const parts = ['kalite', 'güven'];
  if (hasCost) parts.push('toplam maliyet');
  if (hasNegotiation) parts.push('pazarlık sinyalleri');

  let summary = `Bu karar; ${parts.join(', ')} ve risk faktörlerinin birlikte değerlendirilmesiyle oluşmuştur. `;
  summary += 'Mevcut veriler kararın temelini desteklese de ';
  summary += hasGaps
    ? 'eksik bilgilerin doğrulanması karar güvenini artıracaktır.'
    : 'nihai karar için ek doğrulama önerilir.';

  return sanitizeExplainabilityText(summary);
}

/**
 * @param {Record<string, unknown>} context
 * @returns {string}
 */
export function buildUserFriendlyExplanation(context) {
  const {
    decisionLabel = 'değerlendirilebilir',
    positiveCount = 0,
    negativeCount = 0,
    confidenceLabel = 'Orta veri güveni'
  } = context;

  const sentences = [
    `Bu ilan "${decisionLabel}" seviyesinde görünüyor ve mevcut bilgilerle ön değerlendirme yapılabilir.`,
    `${positiveCount} olumlu, ${negativeCount} dikkat gerektiren faktör tespit edildi.`,
    `${confidenceLabel} ile karar oluşturuldu; eksik bilgiler tamamlandıkça açıklama netliği artabilir.`,
    'Karar destek amaçlıdır; nihai seçim için doğrulama adımlarını tamamlamanız önerilir.'
  ];

  return sanitizeExplainabilityText(sentences.slice(0, 4).join(' '));
}

/**
 * @param {'vehicle'|'housing'|'vacation'|'konut'|'tatil'|string} category
 * @returns {string[]}
 */
export function buildVerificationSteps(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    return [
      'Tapu ve iskan durumunu doğrula',
      'Aidat, deprem ve bina bilgilerini kontrol et',
      'Emsal fiyatlarla karşılaştır',
      'Finansman maliyetini tekrar hesapla',
      'Pazarlık sonrası karar seviyesini yeniden değerlendir'
    ].slice(0, 6);
  }

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    return [
      'İptal koşullarını doğrula',
      'Konum ve yorum geçmişini kontrol et',
      'Ek ücretleri netleştir',
      'Alternatiflerle toplam maliyeti karşılaştır',
      'Tarih / kapasite uyumunu kontrol et'
    ].slice(0, 6);
  }

  return [
    'Tramer ve ekspertiz raporunu doğrula',
    'Kilometre ve bakım geçmişini kontrol et',
    'Benzer ilan fiyatlarıyla karşılaştır',
    'Pazarlık hedef fiyatını netleştir',
    'Toplam sahip olma maliyetini tekrar değerlendir'
  ].slice(0, 6);
}
