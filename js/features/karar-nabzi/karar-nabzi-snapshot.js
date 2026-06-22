/**
 * Karar Nabzı — frozen deterministic snapshots from results models.
 * No engine calls; no AI text persistence.
 */

export const TRACKED_DECISION_SCHEMA_VERSION = 1;

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function toNullableNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Stable id for the same vehicle + wizard inputs within a session revisit.
 * @param {object|null|undefined} topResult
 * @param {object|null|undefined} formData
 */
export function buildAutoTrackedSnapshotId(topResult = {}, formData = {}) {
  const vehicle = String(topResult?.name || topResult?.vehicle?.name || 'arac')
    .trim()
    .replace(/\s+/g, '_');
  const budget = formData?.budget ?? '';
  const usage = formData?.usage ?? '';
  return `kn_auto_${vehicle}_${budget}_${usage}`.slice(0, 96);
}

/**
 * @param {object} model
 * @param {object} formData
 * @param {object|null|undefined} topResult
 * @param {{ id?: string, trackedAt?: string }} [options]
 */
export function buildAutoTrackedSnapshot(model = {}, formData = {}, topResult = null, options = {}) {
  const recommendation = model.recommendation || {};
  const vehicle = recommendation.vehicle || {};
  const title = String(vehicle.name || topResult?.name || 'Araç önerisi').trim() || 'Araç önerisi';

  const decisionScore = toNullableNumber(model.decisionScore ?? recommendation.decisionScore) ?? 0;
  const confidenceScore = toNullableNumber(model.confidenceScore ?? recommendation.confidenceScore) ?? 0;
  const overallRisk = String(model.riskLevel || model.overallRisk || 'Orta');
  const recommendationLevel = String(model.recommendationLevel || model.intelligence?.recommendationLevel || 'wait');
  const recommendationLabel = String(
    model.recommendationLabel || recommendation.recommendationLabel || 'Değerlendirme önerilir'
  );

  const totalCostRaw = toNullableNumber(
    topResult?.costs?.ownership?.totals?.months12 ?? topResult?.costs?.total
  );
  const totalCostFormatted = model.totalCostLabel
    ? String(model.totalCostLabel)
    : totalCostRaw != null
      ? new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY',
          maximumFractionDigits: 0
        }).format(totalCostRaw)
      : '—';

  const scoreFactors = Array.isArray(model.scoreFactors)
    ? model.scoreFactors.slice(0, 4).map((factor) => ({
        label: String(factor?.label || ''),
        impact: String(factor?.impact || '0')
      }))
    : [];

  const riskItems = Array.isArray(model.riskAnalysis)
    ? model.riskAnalysis.slice(0, 3).map((risk) => ({
        title: String(risk?.title || risk?.label || ''),
        level: String(risk?.level || '')
      }))
    : [];

  const badges = [
    recommendationLabel,
    overallRisk ? `${overallRisk} risk` : null
  ].filter(Boolean);

  const subtitleParts = [
    model.costHint ? String(model.costHint) : null,
    model.usage ? `Kullanım: ${String(model.usage)}` : null
  ].filter(Boolean);

  const trackedAt = options.trackedAt || new Date().toISOString();
  const id = options.id || buildAutoTrackedSnapshotId(topResult || { name: title }, formData);

  return {
    id,
    schemaVersion: TRACKED_DECISION_SCHEMA_VERSION,
    trackedAt,
    tracked: true,
    categoryId: 'auto',
    categoryLabel: 'Araç',
    source: 'auto_results_v2',
    decisionScore,
    confidenceScore,
    overallRisk,
    recommendationLevel,
    recommendationLabel,
    title,
    subtitle: subtitleParts.join(' · ') || 'Auto karar analizi özeti',
    primaryMetric: {
      label: '12 ay TCO',
      value: totalCostRaw,
      formatted: totalCostFormatted
    },
    rawInputs: formData && typeof formData === 'object' ? { ...formData } : {},
    primaryEntityId: title,
    signalDigest: {
      scoreFactors,
      riskItems,
      badges: badges.slice(0, 3)
    },
    revisitPath: '/auto/#analiz',
    engineVersion: 'decision-intelligence-v3'
  };
}
