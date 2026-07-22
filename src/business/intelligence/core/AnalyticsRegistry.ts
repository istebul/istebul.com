import { CashFlowAnalytics } from '../analytics/CashFlowAnalytics';
import { CustomerAnalytics } from '../analytics/CustomerAnalytics';
import { GrowthAnalytics } from '../analytics/GrowthAnalytics';
import { InventoryAnalytics } from '../analytics/InventoryAnalytics';
import { OpportunityAnalytics } from '../analytics/OpportunityAnalytics';
import { RevenueAnalytics } from '../analytics/RevenueAnalytics';
import { RiskAnalytics } from '../analytics/RiskAnalytics';
import type {
  BusinessAnalyticsModule,
  BusinessAnalyticsModuleId
} from '../models/analytics';

const BUILTIN_MODULES: readonly BusinessAnalyticsModule[] = Object.freeze([
  RevenueAnalytics,
  GrowthAnalytics,
  CustomerAnalytics,
  InventoryAnalytics,
  CashFlowAnalytics,
  RiskAnalytics,
  OpportunityAnalytics
]);

/**
 * AnalyticsRegistry — plug-in registry for Business Analytics modules.
 */
export class AnalyticsRegistry {
  private readonly modules = new Map<BusinessAnalyticsModuleId, BusinessAnalyticsModule>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const module of BUILTIN_MODULES) {
        this.modules.set(module.id, module);
      }
    }
  }

  register(module: BusinessAnalyticsModule): void {
    this.modules.set(module.id, module);
  }

  unregister(id: BusinessAnalyticsModuleId): boolean {
    return this.modules.delete(id);
  }

  get(id: BusinessAnalyticsModuleId): BusinessAnalyticsModule | undefined {
    return this.modules.get(id);
  }

  list(): readonly BusinessAnalyticsModule[] {
    return Object.freeze([...this.modules.values()]);
  }

  count(): number {
    return this.modules.size;
  }
}

export function createDefaultAnalyticsRegistry(): AnalyticsRegistry {
  return new AnalyticsRegistry(true);
}

export default AnalyticsRegistry;
