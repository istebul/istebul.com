/**
 * Executive Decision Engine — client re-exports (Sprint-8).
 */

export {
  runExecutiveEngine,
  computeExecutiveScore,
  buildExplainability,
  buildExecutiveTags,
  parseExecutiveTagString,
  parseExecutiveFromTags
} from '../../../supabase/functions/_shared/ai-listings/executive/executive-engine.js';

export {
  getExecutiveLabel,
  buildExecutiveStrengths,
  buildExecutiveRisks,
  buildExecutiveRecommendations,
  containsForbiddenExecutivePhrase,
  findForbiddenExecutivePhrases,
  FORBIDDEN_EXECUTIVE_PHRASES,
  ALLOWED_EXECUTIVE_PHRASES
} from '../../../supabase/functions/_shared/ai-listings/executive/executive-recommendation.js';

export { computeExecutiveConfidence } from '../../../supabase/functions/_shared/ai-listings/executive/decision-confidence.js';
export { buildExecutiveSummary } from '../../../supabase/functions/_shared/ai-listings/executive/executive-summary.js';
