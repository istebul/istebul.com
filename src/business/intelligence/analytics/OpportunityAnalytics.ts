import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';

/** Margin opportunity — highest-margin category. */
export const OpportunityAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'opportunity',
  label: 'Opportunity Analytics',
  analyze(raw: RawBusinessData) {
    const topMargin = [...raw.categoryMargins].sort(
      (a, b) => b.marginPercent - a.marginPercent
    )[0];
    return Object.freeze({
      moduleId: 'opportunity' as const,
      values: Object.freeze({
        topMarginCategory: topMargin?.category ?? null,
        topMarginPercent: topMargin ? topMargin.marginPercent : null
      })
    });
  }
});

export default OpportunityAnalytics;
