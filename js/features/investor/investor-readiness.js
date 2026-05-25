/**
 * P7 — Deck / diligence readiness scoring.
 */

const DIMENSION_CHECKS = {
  metrics_story: (pack) => {
    const ms = pack.metricsStory || {};
    const slides = ms.slides || [];
    const hasNorthStar = Boolean(ms.northStar?.primary);
    const hasLive = slides.some((s) => (s.resolvedMetrics || []).some((m) => m.value != null));
    let score = 0;
    if (slides.length >= 3) score += 50;
    if (hasNorthStar) score += 25;
    if (hasLive) score += 25;
    return { score, max: 100, notes: hasLive ? [] : ['Attach live investor-metrics-snapshot before meetings'] };
  },
  moat_story: (pack) => {
    const pillars = pack.moatStory?.pillars || [];
    const hasFrame = (pack.moatStory?.competitiveFrame || []).length >= 3;
    let score = pillars.length >= 4 ? 70 : pillars.length * 15;
    if (hasFrame) score = Math.min(100, score + 20);
    if (pack.moatStory?.elevator) score = Math.min(100, score + 10);
    return { score: Math.min(100, score), max: 100, notes: [] };
  },
  deck_readiness: (pack) => {
    const dr = pack.deckReadiness || {};
    const slides = dr.slides || [];
    const checklist = dr.preMeetingChecklist || [];
    let score = 0;
    if (slides.length >= 14) score += 60;
    else score += Math.round((slides.length / 14) * 60);
    if (checklist.length >= 4) score += 25;
    if (dr.outlineDoc) score += 15;
    return { score: Math.min(100, score), max: 100, notes: [] };
  },
  financial_model: (pack) => {
    const fm = pack.financialModel || {};
    const scenarios = fm.scenarios || {};
    const ids = ['base', 'bull', 'bear'].filter((id) => scenarios[id]);
    const projections = fm.projections || {};
    const baseY1 = projections.base?.y1?.blendedArrTry;
    let score = ids.length * 20;
    if ((fm.useOfFunds || []).length >= 4) score += 20;
    if (baseY1 > 0) score += 20;
    if (fm.disclaimer) score += 10;
    return {
      score: Math.min(100, score),
      max: 100,
      notes: fm.disclaimer ? [] : ['Add financial disclaimer for diligence']
    };
  },
  growth_story: (pack) => {
    const phases = pack.growthStory?.phases || [];
    const flywheel = pack.growthStory?.flywheel || [];
    let score = Math.min(60, phases.length * 15);
    if (flywheel.length >= 4) score += 25;
    if (pack.growthStory?.headline) score += 15;
    return { score: Math.min(100, score), max: 100, notes: [] };
  },
  gtm_narrative: (pack) => {
    const motions = pack.gtmNarrative?.gtmMotions || [];
    const arc = pack.gtmNarrative?.narrativeArc || {};
    let score = Math.min(50, motions.length * 12);
    if (arc.problem && arc.solution) score += 25;
    if (pack.gtmNarrative?.icp?.consumer && pack.gtmNarrative?.icp?.partner) score += 25;
    return { score: Math.min(100, score), max: 100, notes: [] };
  }
};

/**
 * @param {object} pack — output of composeInvestorReadinessPack
 */
export function scoreInvestorReadiness(pack) {
  const weights = pack.deckReadiness?.diligenceScorecard || [
    { dimension: 'metrics_story', weight: 20 },
    { dimension: 'moat_story', weight: 15 },
    { dimension: 'deck_readiness', weight: 15 },
    { dimension: 'financial_model', weight: 15 },
    { dimension: 'growth_story', weight: 15 },
    { dimension: 'gtm_narrative', weight: 20 }
  ];

  const dimensions = {};
  let weightedSum = 0;
  let weightTotal = 0;
  const allNotes = [];

  for (const row of weights) {
    const id = row.dimension;
    const weight = row.weight ?? 0;
    const checker = DIMENSION_CHECKS[id];
    const result = checker ? checker(pack) : { score: 0, max: 100, notes: ['unknown dimension'] };
    dimensions[id] = { ...result, weight };
    weightedSum += (result.score / 100) * weight;
    weightTotal += weight;
    if (result.notes?.length) allNotes.push(...result.notes.map((n) => `${id}: ${n}`));
  }

  const overallPct = weightTotal ? Math.round((weightedSum / weightTotal) * 100) : 0;
  let verdict = 'needs_work';
  if (overallPct >= 85) verdict = 'investor_ready';
  else if (overallPct >= 70) verdict = 'near_ready';

  return {
    overallPct,
    verdict,
    dimensions,
    notes: [...new Set(allNotes)],
    generatedAt: new Date().toISOString()
  };
}

/**
 * @param {object} pack
 */
export function summarizeDeckGaps(pack) {
  const slides = pack.deckReadiness?.slides || [];
  const blockers = slides
    .filter((s) => s.blockerIfMissing)
    .map((s) => ({ slide: s.n, id: s.id, blocker: s.blockerIfMissing }));
  return {
    slideCount: slides.length,
    targetSlides: pack.deckReadiness?.targetSlides || 14,
    blockers,
    checklist: pack.deckReadiness?.preMeetingChecklist || []
  };
}
