/**
 * @deprecated Prefer `src/business/services/InsightEngine.ts` (EPIC-520).
 * Compatibility shim for EPIC-510 import paths.
 */
export {
  InsightEngine,
  computeBusinessInsights
} from '../../services/InsightEngine';
export type { InsightEngineResult } from '../../services/InsightEngine';
export { computeBusinessInsights as default } from '../../services/InsightEngine';
