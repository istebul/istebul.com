import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';
import { roundDelta, seriesChangePercent } from '../utils/analytics-score';

/** Cash-flow trend and drop percentage. */
export const CashFlowAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'cash-flow',
  label: 'Cash Flow Analytics',
  analyze(raw: RawBusinessData) {
    const cashDelta = roundDelta(seriesChangePercent(raw.cashFlowSeries));
    const cashFirst = raw.cashFlowSeries[0]?.value ?? 0;
    const cashLast = raw.cashFlowSeries[raw.cashFlowSeries.length - 1]?.value ?? 0;
    const cashDropPercent =
      cashFirst > 0 ? roundDelta(((cashFirst - cashLast) / cashFirst) * 100) : 0;
    return Object.freeze({
      moduleId: 'cash-flow' as const,
      values: Object.freeze({
        cashDelta,
        cashDropPercent
      })
    });
  }
});

export default CashFlowAnalytics;
