import type {
  BusinessKpiId,
  BusinessKpiTrend,
  BusinessKpiValue
} from '../models/business-kpi';
import { calculateTrend } from '../utils/trend-calculator';
import { detectChange } from '../utils/change-detector';

/**
 * Build KPI trend metadata from a KPI value (and optional previous numeric).
 */
export function buildKpiTrend(
  kpi: BusinessKpiValue,
  previousNumeric?: number
): BusinessKpiTrend {
  const delta =
    typeof previousNumeric === 'number'
      ? kpi.numericValue - previousNumeric
      : kpi.numericValue;
  const calc = calculateTrend(delta, 0.5, kpi.label);
  const changeDetected =
    typeof previousNumeric === 'number'
      ? detectChange(previousNumeric, kpi.numericValue)
      : Math.abs(kpi.numericValue) >= 0.5;

  return Object.freeze({
    id: kpi.id,
    direction: calc.direction,
    delta: calc.delta,
    changeDetected,
    label: calc.label
  });
}

/**
 * Build trends for a list of KPI values.
 */
export function buildKpiTrends(
  kpis: readonly BusinessKpiValue[],
  previousById: Readonly<Partial<Record<BusinessKpiId, number>>> = {}
): readonly BusinessKpiTrend[] {
  return Object.freeze(kpis.map((kpi) => buildKpiTrend(kpi, previousById[kpi.id])));
}

export default buildKpiTrend;
