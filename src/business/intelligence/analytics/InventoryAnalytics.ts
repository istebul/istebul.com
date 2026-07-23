import type { BusinessAnalyticsModule } from '../models/analytics';
import type { RawBusinessData } from '../types/raw-business-data';

/** Inventory coverage / stock days remaining. */
export const InventoryAnalytics: BusinessAnalyticsModule = Object.freeze({
  id: 'inventory',
  label: 'Inventory Analytics',
  analyze(raw: RawBusinessData) {
    return Object.freeze({
      moduleId: 'inventory' as const,
      values: Object.freeze({
        stockDaysRemaining: raw.stockDaysRemaining
      })
    });
  }
});

export default InventoryAnalytics;
