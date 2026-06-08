/**
 * AI Decision Flow — consistency checker (Sprint-20 QA).
 */

import { REPORT_FORBIDDEN_PHRASES, sanitizeReportText } from '../decision-report/executive-summary.js';

/** @type {Readonly<Record<string, number>>} */
const RECOMMENDATION_TIER = Object.freeze({
  'çok uygun': 5,
  uygun: 4,
  incelenebilir: 3,
  'dikkatli incelenmeli': 2,
  'dikkatli ilerle': 2,
  önerilmez: 1
});

/** @type {Readonly<Record<string, number>>} */
const COACH_TIER = Object.freeze({
  'güçlü aday': 5,
  incelenebilir: 4,
  'dikkatli ilerle': 3,
  'önce doğrula': 2,
  'uygun görünmüyor': 1
});

/**
 * @param {string} label
 * @param {Readonly<Record<string, number>>} map
 * @returns {number}
 */
function labelTier(label, map) {
  const key = String(label ?? '').trim().toLowerCase();
  for (const [pattern, tier] of Object.entries(map)) {
    if (key.includes(pattern)) return tier;
  }
  return 3;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function containsForbiddenCalibrationText(text) {
  const lower = String(text ?? '').toLowerCase();
  return REPORT_FORBIDDEN_PHRASES.some((phrase) => lower.includes(phrase));
}

/**
 * @param {{
 *   recommendation?: Record<string, unknown>|null,
 *   coach?: Record<string, unknown>|null,
 *   simulator?: Record<string, unknown>|null,
 *   report?: Record<string, unknown>|null
 * }} flow
 * @returns {{ checks: Array<{ id: string, passed: boolean, message: string }>, warnings: string[] }}
 */
export function checkDecisionFlowConsistency(flow) {
  /** @type {Array<{ id: string, passed: boolean, message: string }>} */
  const checks = [];
  /** @type {string[]} */
  const warnings = [];

  const rec = flow.recommendation ?? {};
  const coach = flow.coach ?? {};
  const sim = flow.simulator ?? {};
  const report = flow.report ?? {};

  if (!rec?.id) {
    checks.push({ id: 'has_recommendation', passed: false, message: 'Öneri seçimi yok' });
    return { checks, warnings: ['Karar zinciri için öneri bulunamadı'] };
  }

  checks.push({ id: 'has_recommendation', passed: true, message: 'Öneri mevcut' });

  const recLabel = String(rec.recommendation_label ?? '');
  const coachLabel = String(coach.coach_label ?? '');
  const finalLabel = String(report.final_decision?.label ?? '');
  const recTier = labelTier(recLabel, RECOMMENDATION_TIER);
  const coachTier = labelTier(coachLabel, COACH_TIER);
  const finalTier = labelTier(finalLabel, RECOMMENDATION_TIER);

  const tierGap = Math.abs(recTier - coachTier);
  const recFinalGap = Math.abs(recTier - finalTier);
  const coachRecAligned = tierGap <= 2;
  checks.push({
    id: 'coach_recommendation_alignment',
    passed: coachRecAligned,
    message: coachRecAligned
      ? 'Recommendation ve Coach etiketleri uyumlu'
      : `Recommendation (${recLabel}) ile Coach (${coachLabel}) etiketleri çelişiyor`
  });
  if (!coachRecAligned) warnings.push('Recommendation ve Coach etiketleri arasında fark var');

  const reportAligned = recFinalGap <= 2;
  checks.push({
    id: 'report_final_alignment',
    passed: reportAligned,
    message: reportAligned
      ? 'Report final decision recommendation ile uyumlu'
      : `Report (${finalLabel}) recommendation (${recLabel}) ile uyumsuz`
  });
  if (!reportAligned) warnings.push('Report final decision recommendation ile çelişiyor');

  const risk = Number(rec.risk_score);
  if (Number.isFinite(risk) && risk >= 61) {
    const cautious = finalTier <= 3;
    checks.push({
      id: 'high_risk_cautious_final',
      passed: cautious,
      message: cautious
        ? 'Yüksek riskli ilan için temkinli final decision'
        : 'Yüksek riskli ilan için final decision yeterince temkinli değil'
    });
    if (!cautious) warnings.push('Yüksek risk için final decision daha temkinli olmalı');
  }

  const quality = Number(rec.quality_score);
  if (Number.isFinite(quality) && quality < 55) {
    const redFlags = Array.isArray(coach.red_flags) ? coach.red_flags : [];
    const hasQualityFlag = redFlags.some((f) => /kalite|fotoğraf|açıklama/i.test(String(f)));
    checks.push({
      id: 'low_quality_coach_flags',
      passed: hasQualityFlag || redFlags.length > 0,
      message: hasQualityFlag
        ? 'Düşük kalite coach red flags içinde'
        : 'Düşük kalite için coach red flags eksik olabilir'
    });
    if (!hasQualityFlag && redFlags.length === 0) warnings.push('Düşük kalite coach red flags içinde görünmüyor');
  }

  const duplicate = String(rec.duplicate_status ?? '');
  const dupPenalty = Number(rec.breakdown?.duplicate_penalty ?? 0);
  const coachDup = (coach.red_flags ?? []).some((f) => /duplicate/i.test(String(f)));
  const duplicateSignal = duplicate === 'exact' || duplicate === 'similar' || dupPenalty < 0 || coachDup;
  if (duplicateSignal) {
    const weaknesses = (report.weaknesses ?? []).map(String).join(' ').toLowerCase();
    const hasDup = weaknesses.includes('duplicate');
    checks.push({
      id: 'duplicate_in_weaknesses',
      passed: hasDup,
      message: hasDup ? 'Duplicate report weaknesses içinde' : 'Duplicate report weaknesses içinde değil'
    });
    if (!hasDup) warnings.push('Duplicate yüksek ancak report weaknesses içinde yok');
  }

  const subscores = /** @type {Record<string, number>} */ (rec.subscores ?? {});
  const price = Number(rec.price ?? rec.listing?.price);
  const budget = Number(flow.profile?.budget);
  if (Number.isFinite(budget) && budget > 0 && Number.isFinite(price) && price > budget * 1.1) {
    const budgetLow = Number(subscores.budget_fit) < 55;
    checks.push({
      id: 'over_budget_lower_score',
      passed: budgetLow,
      message: budgetLow
        ? 'Bütçe dışı ilan için budget fit düşük'
        : 'Bütçe dışı ilan için fit skoru yeterince düşmüyor'
    });
    if (!budgetLow) warnings.push('Bütçe dışı ilan skoru beklenenden yüksek');
  }

  if (sim.available && Number.isFinite(sim.delta)) {
    const simImproved = sim.delta > 3;
    const simWorsened = sim.delta < -3;
    const execSummary = String(report.executive_summary ?? '').toLowerCase();
    const simSummary = String(sim.summary ?? '').toLowerCase();
    let simConsistent = true;
    if (simImproved && simSummary.includes('azalt')) simConsistent = false;
    if (simWorsened && simSummary.includes('daha uygun')) simConsistent = false;
    if (simImproved && execSummary.includes('sınırlı uyum')) simConsistent = false;
    checks.push({
      id: 'simulator_report_consistency',
      passed: simConsistent,
      message: simConsistent
        ? 'Simulator delta report özeti ile uyumlu'
        : 'Simulator delta report özeti ile çelişiyor'
    });
    if (!simConsistent) warnings.push('Simulator delta report summary ile çelişiyor');
  }

  const reportTexts = [
    report.executive_summary,
    report.final_decision?.explanation,
    ...(report.strengths ?? []),
    ...(report.weaknesses ?? [])
  ]
    .filter(Boolean)
    .join(' ');

  const noForbidden = !containsForbiddenCalibrationText(reportTexts);
  checks.push({
    id: 'no_forbidden_wording',
    passed: noForbidden,
    message: noForbidden ? 'Report yasak ifade içermiyor' : 'Report yasak ifade içeriyor'
  });
  if (!noForbidden) warnings.push('Report yasak ifade içeriyor');

  const simAvail = Boolean(sim.available ?? sim.old_label);
  checks.push({
    id: 'simulator_present',
    passed: simAvail,
    message: simAvail ? 'Simulator sonucu mevcut' : 'Simulator sonucu eksik'
  });

  const coachPresent = Boolean(coach.coach_label);
  checks.push({
    id: 'coach_present',
    passed: coachPresent,
    message: coachPresent ? 'Coach sonucu mevcut' : 'Coach sonucu eksik'
  });

  return { checks, warnings: [...new Set(warnings)] };
}

/**
 * @param {{ checks: Array<{ passed: boolean }> }} result
 * @returns {number}
 */
export function computeConsistencyScore(result) {
  const checks = result.checks ?? [];
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.passed).length;
  return Math.round((passed / checks.length) * 100);
}
