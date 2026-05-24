import { estimateAnnualCost } from './auto-cost-engine.js?v=cost2';
import {
  scoreVehicleMatch,
  computeConfidenceMeta,
  buildExpertReasons,
  buildExpertRisks,
  explainRankGap,
  buildMethodologyPanel,
  buildRankIntelligence,
  buildScoringTransparency
} from '../engines/decision-consultant.js';

export { buildMethodologyPanel, explainRankGap, buildRankIntelligence };

function filterCandidates(sourceVehicles, form) {
  const requestedFuel = form.fuel || 'any';
  const requestedBody = form.body || '';

  const strictMatches = sourceVehicles.filter(
    (vehicle) =>
      (!requestedBody || vehicle.body === requestedBody) &&
      (requestedFuel === 'any' || vehicle.fuel === requestedFuel)
  );

  const bodyMatches = sourceVehicles.filter(
    (vehicle) => !requestedBody || vehicle.body === requestedBody
  );

  const fuelMatches = sourceVehicles.filter(
    (vehicle) => requestedFuel === 'any' || vehicle.fuel === requestedFuel
  );

  if (strictMatches.length >= 3) return { pool: strictMatches, matchTier: 'strict' };
  if (bodyMatches.length >= 3) return { pool: bodyMatches, matchTier: 'body' };
  if (fuelMatches.length >= 3) return { pool: fuelMatches, matchTier: 'fuel' };
  return { pool: sourceVehicles, matchTier: 'broad' };
}

export function recommendVehicles(form, catalog = []) {
  const budget = Number(form.budget || 0);
  const sourceVehicles = Array.isArray(catalog) ? catalog : [];
  const { pool, matchTier } = filterCandidates(sourceVehicles, form);

  const scored = pool
    .map((vehicle) => {
      const { score, scoreBreakdown } = scoreVehicleMatch(vehicle, form);
      const costs = estimateAnnualCost(vehicle, form);
      const costSource = costs.source === 'truth' ? 'truth' : 'estimate';

      const confidenceMeta = computeConfidenceMeta({
        score,
        scoreBreakdown,
        catalogSize: sourceVehicles.length,
        strictMatchCount: matchTier === 'strict' ? pool.length : 0,
        costSource,
        budget,
        vehiclePrice: vehicle.price
      });

      return {
        ...vehicle,
        score,
        scoreBreakdown,
        confidence: confidenceMeta.score,
        confidenceMeta,
        reasons: buildExpertReasons(vehicle, form, budget, scoreBreakdown),
        risks: buildExpertRisks(vehicle, form, budget, scoreBreakdown),
        costs,
        matchTier,
        methodology: buildMethodologyPanel()
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, 3);

  const rankIntelligence = buildRankIntelligence(top, form);
  if (rankIntelligence) {
    top[0].rankIntelligence = rankIntelligence;
    top[0].scoringTransparency = rankIntelligence.transparency;
    top.forEach((vehicle, idx) => {
      if (idx > 0 && rankIntelligence.runners?.[idx - 1]) {
        vehicle.runnerContrast = rankIntelligence.runners[idx - 1];
      }
    });
  }

  if (top.length >= 2) {
    top[0].rankExplanation = explainRankGap(top[0], top[1]);
  }

  for (const vehicle of top) {
    vehicle.scoringTransparency =
      vehicle.scoringTransparency || buildScoringTransparency(vehicle.score, vehicle.scoreBreakdown);
  }

  return top;
}
