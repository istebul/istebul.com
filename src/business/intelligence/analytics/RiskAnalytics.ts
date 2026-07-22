import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';
import { clampScore, seriesChangePercent } from '../utils/analytics-score';

/**
 * Composite risk score from cost, cash, churn, inventory, and revenue signals.
 * Formula preserved from EPIC-510/520 MetricsEngine.
 */
export const RiskAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'risk',
  label: 'Risk Analytics',
  analyze(raw: RawBusinessData) {
    const revenueDelta = seriesChangePercent(raw.revenueSeries);
    const costDelta = seriesChangePercent(raw.costSeries);
    const cashDelta = seriesChangePercent(raw.cashFlowSeries);
    const riskScore = clampScore(
      Math.round(
        35 +
          Math.max(0, costDelta) * 1.4 +
          Math.max(0, -cashDelta) * 1.8 +
          raw.churnRatePercent * 4 +
          (raw.stockDaysRemaining < 14 ? (14 - raw.stockDaysRemaining) * 2 : 0) -
          Math.max(0, revenueDelta) * 0.8
      ),
      0,
      100
    );
    return Object.freeze({
      moduleId: 'risk' as const,
      values: Object.freeze({ riskScore })
    });
  }
});

export default RiskAnalytics;
