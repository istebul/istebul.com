/**
 * Purchase Decision Intelligence — Turkish labels, summary, next steps (Sprint-24).
 */

/** @type {ReadonlyArray<string>} */
export const PURCHASE_DECISION_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alınır',
  'kesin al',
  'kaçırılmaz fırsat',
  'garanti kazanç',
  'garantili kazanç',
  'kesin kazanç',
  'kesin yatırım',
  'kesin al/sat',
  'mutlaka al',
  'hemen al',
  'garanti'
]);

/** @type {Readonly<Record<string, string>>} */
export const DECISION_LEVEL_LABELS = Object.freeze({
  strong_buy_candidate: 'Güçlü al adayı',
  buy_candidate: 'Al adayı',
  negotiate_first: 'Önce pazarlık yap',
  wait: 'Bekle',
  avoid: 'Vazgeç'
});

/** @type {Readonly<Record<string, string>>} */
export const CONFIDENCE_LEVEL_LABELS = Object.freeze({
  high: 'Yüksek veri güveni',
  medium: 'Orta veri güveni',
  low: 'Düşük veri güveni'
});

/** @type {Readonly<Record<string, string>>} */
export const RISK_LEVEL_LABELS = Object.freeze({
  low: 'Düşük risk',
  medium: 'Orta risk',
  high: 'Yüksek risk'
});

/** @type {Readonly<Record<string, string>>} */
export const PRIMARY_ACTION_LABELS = Object.freeze({
  buy: 'Alımı değerlendir',
  negotiate: 'Pazarlık yap',
  wait: 'Bekle',
  avoid: 'Vazgeç'
});

/**
 * @param {number} score
 * @returns {'strong_buy_candidate'|'buy_candidate'|'negotiate_first'|'wait'|'avoid'}
 */
export function resolveDecisionLevel(score) {
  const s = Number(score) || 0;
  if (s >= 85) return 'strong_buy_candidate';
  if (s >= 72) return 'buy_candidate';
  if (s >= 58) return 'negotiate_first';
  if (s >= 42) return 'wait';
  return 'avoid';
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
 * @param {number} riskScore
 * @returns {'low'|'medium'|'high'}
 */
export function resolveRiskLevel(riskScore) {
  const s = Number(riskScore) || 50;
  if (s <= 30) return 'low';
  if (s <= 60) return 'medium';
  return 'high';
}

/**
 * @param {'strong_buy_candidate'|'buy_candidate'|'negotiate_first'|'wait'|'avoid'|string} level
 * @returns {'buy'|'negotiate'|'wait'|'avoid'}
 */
export function resolvePrimaryAction(level) {
  if (level === 'strong_buy_candidate' || level === 'buy_candidate') return 'buy';
  if (level === 'negotiate_first') return 'negotiate';
  if (level === 'wait') return 'wait';
  return 'avoid';
}

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizePurchaseDecisionText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of PURCHASE_DECISION_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {boolean} containsForbidden
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenPurchasePhrase(text) {
  const lower = String(text ?? '').toLocaleLowerCase('tr-TR');
  return PURCHASE_DECISION_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {Record<string, unknown>} context
 * @returns {string}
 */
export function buildPurchaseDecisionSummary(context) {
  const {
    decisionLabel = 'Değerlendirilebilir',
    confidenceLabel = 'Orta veri güveni',
    riskLabel = 'Orta risk',
    primaryActionLabel = 'Bekle',
    hasMissingInfo = false,
    hasPriceUncertainty = false
  } = context;

  let summary = `Bu ilan karar destek açısından "${decisionLabel}" seviyesinde görünüyor; `;
  summary += `${confidenceLabel.toLowerCase()} ile ${riskLabel.toLowerCase()} profili mevcut. `;
  summary += `Önerilen yaklaşım: ${primaryActionLabel.toLowerCase()}. `;

  if (hasMissingInfo || hasPriceUncertainty) {
    summary +=
      'Mevcut bilgiler ışığında ek doğrulama ve eksik bilgilerin tamamlanması karar güvenini artırabilir.';
  } else {
    summary += 'Mevcut bilgiler ışığında ön değerlendirme yapılabilir; nihai karar için doğrulama önerilir.';
  }

  return sanitizePurchaseDecisionText(summary);
}

/**
 * @param {'vehicle'|'housing'|'vacation'|'konut'|'tatil'|string} category
 * @param {'buy'|'negotiate'|'wait'|'avoid'|string} primaryAction
 * @returns {string[]}
 */
export function buildCategoryNextSteps(category, primaryAction = 'wait') {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat === 'housing' || cat === 'real_estate' || cat === 'konut') {
    const steps = [
      'Tapu ve iskan durumunu doğrula',
      'Aidat, deprem ve bina bilgilerini kontrol et',
      'Emsal fiyatları karşılaştır',
      'Finansman maliyetini tekrar hesapla',
      'Pazarlık sonrası karar seviyesini yeniden değerlendir'
    ];
    if (primaryAction === 'avoid') {
      steps.push('Alternatif konut seçeneklerini karşılaştır');
    }
    return steps.slice(0, 6);
  }

  if (cat === 'vacation' || cat === 'travel' || cat === 'tatil') {
    const steps = [
      'İptal koşullarını doğrula',
      'Konum ve yorum geçmişini kontrol et',
      'Ek ücretleri netleştir',
      'Tarih / kapasite uyumunu kontrol et',
      'Alternatiflerle toplam maliyeti karşılaştır'
    ];
    if (primaryAction === 'negotiate') {
      steps.push('Rezervasyon öncesi pazarlık hedef fiyatını belirle');
    }
    return steps.slice(0, 6);
  }

  const steps = [
    'Fiyatı benzer ilanlarla karşılaştır',
    'Tramer ve ekspertiz raporunu doğrula',
    'Bakım ve kilometre geçmişini kontrol et',
    'Pazarlık hedef fiyatını belirle',
    'Toplam sahip olma maliyetini tekrar değerlendir'
  ];
  if (primaryAction === 'wait') {
    steps.push('Piyasa hareketlerini kısa süre izle');
  }
  return steps.slice(0, 6);
}
