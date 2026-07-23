import type {
  BusinessKpiDefinition,
  BusinessKpiId,
  BusinessKpiPlugin,
  BusinessKpiValue,
  KpiComputeInput
} from '../models/business-kpi';
import {
  directionFromDelta,
  formatPercentDelta
} from '../utils/analytics-score';

/** Built-in KPI definitions (plug-in registry seed). */
export const BUILTIN_KPI_DEFINITIONS: readonly BusinessKpiDefinition[] = Object.freeze([
  Object.freeze({
    id: 'revenue-trend' as const,
    label: 'Revenue Trend',
    unit: 'percent' as const,
    periodLabel: 'Son 7 gün',
    description: 'Gelir serisinin dönem başı–sonu değişimi.'
  }),
  Object.freeze({
    id: 'cost-trend' as const,
    label: 'Cost Trend',
    unit: 'percent' as const,
    periodLabel: 'Son 7 gün',
    description: 'Operasyonel maliyet trendi.'
  }),
  Object.freeze({
    id: 'growth' as const,
    label: 'Growth',
    unit: 'percent' as const,
    periodLabel: 'Müşteri tabanı',
    description: 'Aktif müşteri sayısındaki büyüme.'
  }),
  Object.freeze({
    id: 'risk-score' as const,
    label: 'Risk Score',
    unit: 'score' as const,
    periodLabel: '0–100',
    description: 'Maliyet, nakit, churn ve stok sinyallerinden türetilen risk skoru.'
  }),
  Object.freeze({
    id: 'customer-health' as const,
    label: 'Customer Health',
    unit: 'score' as const,
    periodLabel: '0–100',
    description: 'Churn ve büyüme dengesi üzerinden müşteri sağlığı.'
  }),
  Object.freeze({
    id: 'business-health' as const,
    label: 'Business Health',
    unit: 'score' as const,
    periodLabel: '0–100',
    description: 'Weighted overall business health score.'
  }),
  Object.freeze({
    id: 'cash-flow' as const,
    label: 'Cash Flow',
    unit: 'percent' as const,
    periodLabel: 'Nakit serisi',
    description: 'Nakit düşüş yüzdesi.'
  }),
  Object.freeze({
    id: 'inventory' as const,
    label: 'Inventory',
    unit: 'days' as const,
    periodLabel: 'Stok kapsamı',
    description: 'Kalan stok günü.'
  })
]);

function makePercentPlugin(
  definition: BusinessKpiDefinition,
  read: (input: KpiComputeInput) => number
): BusinessKpiPlugin {
  return Object.freeze({
    id: definition.id,
    definition,
    compute(input: KpiComputeInput): BusinessKpiValue {
      const numericValue = read(input);
      return Object.freeze({
        id: definition.id,
        label: definition.label,
        numericValue,
        displayValue: formatPercentDelta(numericValue),
        unit: definition.unit,
        direction: directionFromDelta(numericValue),
        periodLabel: definition.periodLabel,
        description: definition.description
      });
    }
  });
}

function makeScorePlugin(
  definition: BusinessKpiDefinition,
  read: (input: KpiComputeInput) => number,
  directionOf: (value: number) => BusinessKpiValue['direction']
): BusinessKpiPlugin {
  return Object.freeze({
    id: definition.id,
    definition,
    compute(input: KpiComputeInput): BusinessKpiValue {
      const numericValue = read(input);
      return Object.freeze({
        id: definition.id,
        label: definition.label,
        numericValue,
        displayValue: String(numericValue),
        unit: definition.unit,
        direction: directionOf(numericValue),
        periodLabel: definition.periodLabel,
        description: definition.description
      });
    }
  });
}

function def(id: BusinessKpiId): BusinessKpiDefinition {
  const found = BUILTIN_KPI_DEFINITIONS.find((d) => d.id === id);
  if (!found) throw new Error(`Missing KPI definition: ${id}`);
  return found;
}

/** Built-in KPI plug-ins seeded into KPIRegistry. */
export const BUILTIN_KPI_PLUGINS: readonly BusinessKpiPlugin[] = Object.freeze([
  makePercentPlugin(def('revenue-trend'), (i) => i.analytics.revenueDelta),
  makePercentPlugin(def('cost-trend'), (i) => i.analytics.costDelta),
  makePercentPlugin(def('growth'), (i) => i.analytics.growth),
  makeScorePlugin(
    def('risk-score'),
    (i) => i.analytics.riskScore,
    (v) => (v >= 60 ? 'up' : v <= 35 ? 'down' : 'flat')
  ),
  makeScorePlugin(
    def('customer-health'),
    (i) => i.analytics.customerHealth,
    (v) => (v >= 70 ? 'up' : v <= 45 ? 'down' : 'flat')
  ),
  makeScorePlugin(
    def('business-health'),
    (i) => i.health.overallScore,
    (v) => (v >= 75 ? 'up' : v <= 40 ? 'down' : 'flat')
  ),
  Object.freeze({
    id: 'cash-flow' as const,
    definition: def('cash-flow'),
    compute(input: KpiComputeInput): BusinessKpiValue {
      const numericValue = input.analytics.cashDropPercent;
      return Object.freeze({
        id: 'cash-flow' as const,
        label: def('cash-flow').label,
        numericValue,
        displayValue: formatPercentDelta(-numericValue),
        unit: 'percent' as const,
        direction: directionFromDelta(-numericValue),
        periodLabel: def('cash-flow').periodLabel,
        description: def('cash-flow').description
      });
    }
  }),
  Object.freeze({
    id: 'inventory' as const,
    definition: def('inventory'),
    compute(input: KpiComputeInput): BusinessKpiValue {
      const numericValue = input.analytics.stockDaysRemaining;
      return Object.freeze({
        id: 'inventory' as const,
        label: def('inventory').label,
        numericValue,
        displayValue: `${numericValue}g`,
        unit: 'days' as const,
        direction: numericValue < 14 ? 'down' : numericValue > 30 ? 'up' : 'flat',
        periodLabel: def('inventory').periodLabel,
        description: def('inventory').description
      });
    }
  })
]);

/**
 * KPIRegistry — plug-in registry for future KPI modules.
 */
export class KPIRegistry {
  private readonly plugins = new Map<BusinessKpiId, BusinessKpiPlugin>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const plugin of BUILTIN_KPI_PLUGINS) {
        this.plugins.set(plugin.id, plugin);
      }
    }
  }

  register(plugin: BusinessKpiPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  unregister(id: BusinessKpiId): boolean {
    return this.plugins.delete(id);
  }

  get(id: BusinessKpiId): BusinessKpiPlugin | undefined {
    return this.plugins.get(id);
  }

  list(): readonly BusinessKpiPlugin[] {
    return Object.freeze([...this.plugins.values()]);
  }

  count(): number {
    return this.plugins.size;
  }
}

export function createDefaultKPIRegistry(): KPIRegistry {
  return new KPIRegistry(true);
}

export default KPIRegistry;
