/**
 * AI Listings Repository — aggregate statistics (Sprint-11).
 */

/**
 * @param {Array<Record<string, unknown>>} records
 * @returns {{
 *   total: number,
 *   active: number,
 *   duplicate: number,
 *   archived: number,
 *   today: number,
 *   average_ai: number|null,
 *   average_quality: number|null,
 *   average_risk: number|null
 * }}
 */
export function computeRepositoryStats(records) {
  const today = new Date().toISOString().slice(0, 10);

  let active = 0;
  let duplicate = 0;
  let archived = 0;
  let todayCount = 0;
  /** @type {number[]} */
  const aiScores = [];
  /** @type {number[]} */
  const qualityScores = [];
  /** @type {number[]} */
  const riskScores = [];

  for (const record of records) {
    const status = String(record.status ?? '');
    if (status === 'archived') {
      archived += 1;
    } else {
      active += 1;
    }

    const dup = String(record.duplicate_status ?? 'new');
    if (dup === 'exact' || dup === 'similar') duplicate += 1;

    const createdAt = String(record.created_at ?? '').slice(0, 10);
    if (createdAt === today) todayCount += 1;

    const ai = Number(record.decision_score);
    if (Number.isFinite(ai)) aiScores.push(ai);

    const quality = Number(record.quality_score);
    if (Number.isFinite(quality)) qualityScores.push(quality);

    const risk = Number(record.risk_score);
    if (Number.isFinite(risk)) riskScores.push(risk);
  }

  return {
    total: records.length,
    active,
    duplicate,
    archived,
    today: todayCount,
    average_ai: average(aiScores),
    average_quality: average(qualityScores),
    average_risk: average(riskScores)
  };
}

/**
 * @param {Array<Record<string, unknown>>} records
 * @param {string} category
 * @returns {ReturnType<typeof computeRepositoryStats>}
 */
export function computeRepositoryStatsByCategory(records, category) {
  const normalized = String(category ?? '').trim().toLowerCase();
  if (!normalized || normalized === 'all' || normalized === 'toplam') {
    return computeRepositoryStats(records);
  }

  const filtered = records.filter((record) => {
    const cat = String(record.category ?? '').toLowerCase();
    if (normalized === 'housing' || normalized === 'konut') {
      return cat === 'housing' || cat === 'real_estate';
    }
    if (normalized === 'vehicle' || normalized === 'arac' || normalized === 'araç') {
      return cat === 'vehicle';
    }
    if (normalized === 'vacation' || normalized === 'tatil') {
      return cat === 'vacation';
    }
    return cat === normalized;
  });

  return computeRepositoryStats(filtered);
}

/**
 * @param {number[]} values
 * @returns {number|null}
 */
function average(values) {
  if (!values.length) return null;
  const sum = values.reduce((acc, value) => acc + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}
