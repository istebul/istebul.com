import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';
import { clampScore, roundDelta } from '../utils/analytics-score';

/** Customer health from churn + growth balance. */
export const CustomerAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'customer',
  label: 'Customer Analytics',
  analyze(raw: RawBusinessData) {
    const growth =
      raw.previousCustomerCount === 0
        ? 0
        : ((raw.customerCount - raw.previousCustomerCount) / raw.previousCustomerCount) *
          100;
    const customerHealth = clampScore(
      Math.round(100 - raw.churnRatePercent * 8 + Math.max(-10, Math.min(15, growth * 2))),
      0,
      100
    );
    return Object.freeze({
      moduleId: 'customer' as const,
      values: Object.freeze({
        customerHealth,
        churnRatePercent: roundDelta(raw.churnRatePercent),
        growth: roundDelta(growth)
      })
    });
  }
});

export default CustomerAnalytics;
