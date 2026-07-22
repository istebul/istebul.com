import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';
import { roundDelta, seriesChangePercent } from '../utils/analytics-score';

/** Revenue + cost series trends (financial top-line). */
export const RevenueAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'revenue',
  label: 'Revenue Analytics',
  analyze(raw: RawBusinessData) {
    const revenueDelta = roundDelta(seriesChangePercent(raw.revenueSeries));
    const costDelta = roundDelta(seriesChangePercent(raw.costSeries));
    return Object.freeze({
      moduleId: 'revenue' as const,
      values: Object.freeze({
        revenueDelta,
        costDelta
      })
    });
  }
});

export default RevenueAnalytics;
