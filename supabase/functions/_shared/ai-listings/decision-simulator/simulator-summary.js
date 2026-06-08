/**
 * AI Decision Simulator — safe Turkish summary (Sprint-18 v1).
 */

/** @type {ReadonlyArray<string>} */
export const SIMULATOR_FORBIDDEN_PHRASES = Object.freeze([
  'garanti',
  'kesin alın',
  'kesinlikle alın',
  'yatırım tavsiyesi',
  'kazandırır',
  'kesin değer'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeSimulatorSummary(text) {
  let safe = String(text ?? '').trim();
  for (const phrase of SIMULATOR_FORBIDDEN_PHRASES) {
    const regex = new RegExp(phrase, 'gi');
    safe = safe.replace(regex, 'değerlendirilebilir');
  }
  return safe;
}

/**
 * @param {'improved'|'worsened'|'unchanged'} direction
 * @param {number} delta
 * @returns {string}
 */
export function buildSimulatorSummary(direction, delta = 0) {
  if (direction === 'improved') {
    return sanitizeSimulatorSummary(
      'Mevcut senaryoya göre yapılan değişiklikler bu seçeneği kullanıcı profiline daha uygun hale getirmiştir. Yine de satın alma öncesinde doğrulama önerilir.'
    );
  }
  if (direction === 'worsened') {
    return sanitizeSimulatorSummary(
      'Mevcut senaryoya göre yapılan değişiklikler bu seçeneğin profil uyumunu azaltmıştır. Ön değerlendirme ile alternatifleri karşılaştırmanız önerilir.'
    );
  }
  if (Math.abs(delta) > 0) {
    return sanitizeSimulatorSummary(
      'Mevcut senaryoya göre yapılan değişiklikler sınırlı etki üretmiştir. Ön değerlendirme ile doğrulama önerilir.'
    );
  }
  return sanitizeSimulatorSummary(
    'Senaryo değişikliği karar etiketini değiştirmedi. Mevcut bilgiler ışığında ön değerlendirme önerilir.'
  );
}

/**
 * @param {string} newLabel
 * @param {'improved'|'worsened'|'unchanged'} direction
 * @returns {string}
 */
export function buildSimulatorRecommendation(newLabel, direction) {
  const label = String(newLabel ?? 'İncelenebilir');
  if (direction === 'improved') {
    return sanitizeSimulatorSummary(
      `Yeni senaryoda bu seçenek "${label}" olarak değerlendirilebilir; ön değerlendirme ile ilerlemeniz önerilir.`
    );
  }
  if (direction === 'worsened') {
    return sanitizeSimulatorSummary(
      `Yeni senaryoda bu seçenek "${label}" seviyesine düşmüştür; dikkatli ilerlenmeli ve alternatifler karşılaştırılmalıdır.`
    );
  }
  return sanitizeSimulatorSummary(
    `Yeni senaryoda karar etiketi "${label}" olarak kalmıştır; doğrulama önerilir.`
  );
}
