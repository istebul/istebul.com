/**
 * AI Decision Report — decision simulator section (Sprint-19 v1).
 */

/**
 * @param {Record<string, unknown>|null|undefined} simulator
 * @returns {{
 *   available: boolean,
 *   old_label: string,
 *   new_label: string,
 *   old_fit_score: number,
 *   new_fit_score: number,
 *   delta: number,
 *   positive_reasons: string[],
 *   negative_reasons: string[],
 *   recommendation: string,
 *   summary: string,
 *   confidence: number
 * }}
 */
export function buildSimulatorSection(simulator = null) {
  if (!simulator || !simulator.old_label) {
    return {
      available: false,
      old_label: '—',
      new_label: '—',
      old_fit_score: 0,
      new_fit_score: 0,
      delta: 0,
      positive_reasons: [],
      negative_reasons: [],
      recommendation: 'Senaryo simülasyonu mevcut profil ile üretilmedi.',
      summary: 'Varsayılan senaryoda değişiklik uygulanmadı.',
      confidence: 0
    };
  }

  return {
    available: true,
    old_label: String(simulator.old_label ?? '—'),
    new_label: String(simulator.new_label ?? '—'),
    old_fit_score: Number(simulator.old_fit_score ?? 0),
    new_fit_score: Number(simulator.new_fit_score ?? 0),
    delta: Number(simulator.delta ?? 0),
    positive_reasons: Array.isArray(simulator.positive_reasons) ? simulator.positive_reasons.map(String) : [],
    negative_reasons: Array.isArray(simulator.negative_reasons) ? simulator.negative_reasons.map(String) : [],
    recommendation: String(simulator.recommendation ?? ''),
    summary: String(simulator.summary ?? ''),
    confidence: Number(simulator.confidence ?? 0)
  };
}
