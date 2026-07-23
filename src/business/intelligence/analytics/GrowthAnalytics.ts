import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';
import { roundDelta } from '../utils/analytics-score';

/** Customer-base growth rate. */
export const GrowthAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'growth',
  label: 'Growth Analytics',
  analyze(raw: RawBusinessData) {
    const growth =
      raw.previousCustomerCount === 0
        ? 0
        : roundDelta(
            ((raw.customerCount - raw.previousCustomerCount) / raw.previousCustomerCount) *
              100
          );
    return Object.freeze({
      moduleId: 'growth' as const,
      values: Object.freeze({ growth })
    });
  }
});

export default GrowthAnalytics;
