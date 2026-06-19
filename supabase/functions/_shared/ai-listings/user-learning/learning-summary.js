/**
 * Learning Summary — Turkish-safe copy for Learning Insights (Sprint-30 / Faz B).
 */

/** @type {Readonly<string[]>} */
export const LEARNING_FORBIDDEN_PHRASES = Object.freeze([
  'garanti',
  'kesin kazanç',
  'piyasa manipülasyonu',
  'içeriden bilgi'
]);

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeLearningText(text) {
  let output = String(text ?? '').trim();
  for (const phrase of LEARNING_FORBIDDEN_PHRASES) {
    const re = new RegExp(phrase, 'gi');
    output = output.replace(re, '');
  }
  return output.trim() || 'Öğrenme özeti hazırlanıyor.';
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenLearningPhrase(text) {
  const lower = String(text ?? '').toLocaleLowerCase('tr-TR');
  return LEARNING_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {Record<string, unknown>} learningResult
 * @param {Record<string, unknown>} [feedbackResult]
 * @param {Record<string, unknown>} [outcomeResult]
 * @returns {Record<string, unknown>}
 */
export function buildLearningInsightsSummary(learningResult, feedbackResult = {}, outcomeResult = {}) {
  const topModule = /** @type {Array<Record<string, unknown>>} */ (learningResult.topModules ?? [])[0];
  const topModuleLabel = String(topModule?.label ?? 'Karar Merkezi');
  const helpfulRate = Number(
    learningResult.helpfulStats?.rate ?? outcomeResult.helpfulRate ?? 0
  );
  const eventCount = Number(learningResult.eventCount ?? 0);
  const feedbackCount = Number(feedbackResult.feedbackCount ?? learningResult.totalFeedback ?? 0);

  const headline = sanitizeLearningText(
    eventCount > 0
      ? `En çok kullanılan modül: ${topModuleLabel}. Toplam ${eventCount} etkileşim kaydedildi.`
      : 'Henüz yeterli kullanım verisi yok; öğrenme özeti sınırlı.'
  );

  const insights = [];

  if (topModule) {
    insights.push(
      sanitizeLearningText(
        `${topModuleLabel} modülü ${topModule.count} kez açıldı; karar akışınızda öne çıkıyor.`
      )
    );
  }

  const topReports = /** @type {Array<Record<string, unknown>>} */ (learningResult.topReports ?? []);
  if (topReports.length > 0) {
    insights.push(
      sanitizeLearningText(
        `En çok açılan karar raporu: ${topReports[0].report_id} (${topReports[0].count} görüntüleme).`
      )
    );
  }

  const topScenarios = /** @type {Array<Record<string, unknown>>} */ (learningResult.topScenarios ?? []);
  if (topScenarios.length > 0) {
    insights.push(
      sanitizeLearningText(
        `En çok çalıştırılan senaryo: ${topScenarios[0].scenario_id} (${topScenarios[0].count} kez).`
      )
    );
  }

  if (feedbackCount > 0) {
    insights.push(
      sanitizeLearningText(
        `Geri bildirimlerinizin %${helpfulRate} kadarı faydalı bulundu; açıklamalar bu sinyallerle iyileştirilir.`
      )
    );
  }

  const topReasons = /** @type {Array<Record<string, unknown>>} */ (feedbackResult.topReasons ?? []);
  if (topReasons.length > 0) {
    insights.push(
      sanitizeLearningText(`Sık geri bildirim teması: ${topReasons[0].label}.`)
    );
  }

  return {
    title: 'Learning Insights',
    titleTr: 'Öğrenme Öngörüleri',
    headline,
    insights: insights.slice(0, 5),
    helpfulRate,
    eventCount,
    feedbackCount,
    explainable: true,
    disclaimer:
      'Bu öngörüler kullanım davranışlarınızdan türetilmiştir; ana karar skorlarını değiştirmez.'
  };
}
