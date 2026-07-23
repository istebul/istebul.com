/**
 * @deprecated Prefer `src/business/services/RecommendationEngine.ts` (EPIC-520).
 * Compatibility shim for EPIC-510 import paths.
 */
export {
  RecommendationEngine,
  computeBusinessRecommendations
} from '../../services/RecommendationEngine';
export { computeBusinessRecommendations as default } from '../../services/RecommendationEngine';
