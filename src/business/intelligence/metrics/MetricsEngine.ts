/**
 * @deprecated Prefer `src/business/services/MetricsEngine.ts` (EPIC-520).
 * Compatibility shim for EPIC-510 import paths.
 */
export {
  MetricsEngine,
  computeBusinessMetrics
} from '../../services/MetricsEngine';
export type { BusinessMetricSignals, MetricsEngineResult } from '../../services/MetricsEngine';
export { computeBusinessMetrics as default } from '../../services/MetricsEngine';
