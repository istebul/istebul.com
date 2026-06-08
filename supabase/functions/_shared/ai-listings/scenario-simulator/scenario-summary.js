/**
 * Scenario Simulator v1 — summary and safe language (Sprint-28).
 */

/** @type {Readonly<Record<string, string>>} */
export const SCENARIO_LEVEL_LABELS = Object.freeze({
  improves: 'Kararı güçlendirir',
  neutral: 'Etki sınırlı',
  worsens: 'Kararı zayıflatır',
  insufficient_data: 'Veri yetersiz'
});

/** @type {Readonly<string[]>} */
export const SCENARIO_FORBIDDEN_PHRASES = Object.freeze([
  'kesin alınır',
  'garanti kazanç',
  'kaçırılmaz',
  'risksiz',
  'mutlaka al',
  'mutlaka sat',
  'kesin al',
  'garantili kazanç'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeScenarioText(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of SCENARIO_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenScenarioPhrase(text) {
  const lower = String(text ?? '').toLowerCase();
  return SCENARIO_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {number} delta
 * @param {boolean} hasData
 * @returns {'improves'|'neutral'|'worsens'|'insufficient_data'}
 */
export function resolveScenarioLevel(delta, hasData) {
  if (!hasData) return 'insufficient_data';
  if (delta >= 4) return 'improves';
  if (delta <= -4) return 'worsens';
  return 'neutral';
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function buildScenarioSummary(ctx) {
  const delta = Number(ctx.scoreDelta ?? 0);
  const level = String(ctx.scenarioLevel ?? 'neutral');
  const label = SCENARIO_LEVEL_LABELS[level] ?? 'Etki sınırlı';

  if (level === 'insufficient_data') {
    return sanitizeScenarioText(
      'Mevcut veriler sınırlı olduğundan senaryo etkisi tahmini üretilemedi. Ek bilgi toplanması önerilir.'
    );
  }

  const direction =
    delta > 0
      ? `Tahmini karar skoru ${Math.abs(delta)} puan artabilir`
      : delta < 0
        ? `Tahmini karar skoru ${Math.abs(delta)} puan azalabilir`
        : 'Tahmini karar skoru büyük ölçüde sabit kalabilir';

  return sanitizeScenarioText(
    `Seçilen senaryo karar desteği açısından "${label.toLowerCase()}" görünüyor. ${direction}; sonuç veri kalitesine bağlıdır.`
  );
}

/**
 * @param {string} category
 * @returns {string[]}
 */
export function buildScenarioNextSteps(category) {
  const cat = String(category ?? 'vehicle').toLowerCase();

  if (cat.includes('housing') || cat === 'konut') {
    return [
      'Finansman ve aidat senaryolarını gerçek tekliflerle doğrula',
      'Emsal fiyatları güncel verilerle karşılaştır',
      'Tapu ve bina bilgilerini senaryo sonrası yeniden değerlendir'
    ];
  }

  if (cat.includes('vacation') || cat === 'tatil' || cat === 'travel') {
    return [
      'İptal koşulları ve ek ücretleri senaryo sonrası kontrol et',
      'Tarih değişikliğinin toplam maliyete etkisini doğrula',
      'Rezervasyon koşullarını yazılı teyit et'
    ];
  }

  return [
    'Fiyat senaryosunu pazarlık teklifiyle karşılaştır',
    'Toplam sahip olma maliyetini güncel verilerle yeniden hesapla',
    'Ekspertiz ve tramer sonuçlarını senaryo sonrası gözden geçir'
  ];
}
