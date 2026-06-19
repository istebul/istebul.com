/**
 * P7 — Deck / diligence readiness scoring.
 */

const DIMENSION_CHECKS = {
  investor_narrative: (pack) => {
    const n = pack.investorNarrative || {};
    let score = 0;
    if ((n.elevator || []).length >= 2) score += 25;
    if (n.problem?.painPoints?.length >= 2) score += 25;
    if ((n.solution?.pillars || []).length >= 3) score += 25;
    if ((n.whyNow || []).length >= 2) score += 25;
    return { score: Math.min(100, score), max: 100, notes: [] };
  },
  kpi_story: (pack) => {
    const k = pack.kpiStory || {};
    const chapters = k.chapters || [];
    const board = k.boardCadence || {};
    let score = chapters.length >= 3 ? 50 : chapters.length * 15;
    if (k.northStar?.primary) score += 25;
    if (board.weekly?.length >= 2) score += 25;
    return {
      score: Math.min(100, score),
      max: 100,
      notes: pack.metricsStory?.slides?.length ? [] : ['metrics-story bindings required']
    };
  },
  market_sizing: (pack) => {
    const m = pack.marketSizing || {};
    let score = 0;
    if (m.tam?.segments?.length >= 2) score += 35;
    if (m.sam?.illustrativeSamTry > 0) score += 35;
    if (m.som?.illustrativeSomTry > 0) score += 20;
    if (m.disclaimer) score += 10;
    const verified = m.verifiedAt && !JSON.stringify(m).includes('FOUNDER_VERIFY');
    if (verified) score = Math.min(100, score + 10);
    return {
      score: Math.min(100, score),
      max: 100,
      notes: verified ? [] : ['Market sizing uses public citations — refresh quarterly']
    };
  },
  monetization_story: (pack) => {
    const ms = pack.monetizationStory || {};
    const live = (ms.streams || []).filter((s) => s.status === 'live');
    let score = Math.min(50, live.length * 20);
    if (ms.blendedFormula) score += 25;
    if ((ms.diligenceProof || []).length >= 2) score += 25;
    return { score: Math.min(100, score), max: 100, notes: [] };
  },
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
  fundraising_assets: (pack) => {
    const fr = pack.fundraisingReadiness || {};
    const manifest = fr.assetManifest || [];
    const ready = manifest.filter((a) => a.status === 'ready').length;
    const gaps = manifest.filter((a) => a.status === 'gap').length;
    let score = Math.min(70, ready * 5);
    if (manifest.some((a) => a.id === 'investor_deck')) score += 10;
    if (manifest.some((a) => a.id === 'cap_table')) score += 10;
    if (manifest.some((a) => a.id === 'loi_template')) score += 10;
    return {
      score: Math.min(100, score),
      max: 100,
      notes: gaps ? [`${gaps} offline assets remain (LOI signed, Stripe PNG)`] : []
    };
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
  const weights =
    pack.fundraisingReadiness?.diligenceScorecardExtended ||
    pack.deckReadiness?.diligenceScorecard || [
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

  const thresholds = pack.fundraisingReadiness?.verdictThresholds || {
    investor_ready: 85,
    near_ready: 70
  };
  const overallPct = weightTotal ? Math.round((weightedSum / weightTotal) * 100) : 0;
  let verdict = 'needs_work';
  if (overallPct >= thresholds.investor_ready) verdict = 'investor_ready';
  else if (overallPct >= thresholds.near_ready) verdict = 'near_ready';

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
/**
 * @param {object} pack
 */
export function summarizeFundraisingGaps(pack) {
  const manifest = pack.fundraisingReadiness?.assetManifest || [];
  const ready = manifest.filter((a) => a.status === 'ready');
  const gaps = manifest.filter((a) => a.status === 'gap');
  const exportsNeeded = manifest.filter((a) => a.status === 'export');
  return {
    readyCount: ready.length,
    gapCount: gaps.length,
    exportCount: exportsNeeded.length,
    gaps: gaps.map((g) => ({ id: g.id, path: g.path, owner: g.owner })),
    exportCommands: exportsNeeded.map((e) => e.command).filter(Boolean)
  };
}

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
