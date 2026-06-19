/**
 * Ownership Cost Simulator v1 — barrel export (Sprint-21).
 */

export {
  clearOwnershipCostMemoCache,
  buildOwnershipCostCacheKey,
  buildOwnershipCostInput,
  computeOwnershipCostConfidence,
  runOwnershipCostSimulator
} from './ownership-cost-engine.js';

export { computeVehicleOwnershipCosts } from './vehicle-cost-model.js';
export { computeHousingOwnershipCosts } from './housing-cost-model.js';
export { computeTravelOwnershipCosts } from './travel-cost-model.js';
export { buildCostBreakdown, formatCostTry } from './cost-breakdown.js';
export {
  COST_FORBIDDEN_PHRASES,
  sanitizeCostSummary,
  buildCostRiskLabel,
  classifyCostRiskLevel,
  buildCostAssumptions,
  buildCostWarnings,
  buildCostSummaryText
} from './cost-summary.js';
