import type { BusinessDataProvider } from '../../types/business-provider';
import { getDefaultBusinessDataProvider } from '../../providers/ProviderFactory';
import type {
  BusinessAnalyticsModuleResult,
  BusinessAnalyticsSnapshot
} from '../models/analytics';
import {
  AnalyticsRegistry,
  createDefaultAnalyticsRegistry
} from './AnalyticsRegistry';

export interface AnalyticsEngineOptions {
  provider?: BusinessDataProvider;
  registry?: AnalyticsRegistry;
}

function asNumber(value: number | string | null | undefined, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function asStringOrNull(value: number | string | null | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

function mergeModuleResults(
  asOf: string,
  moduleResults: readonly BusinessAnalyticsModuleResult[]
): BusinessAnalyticsSnapshot {
  const byId = new Map(moduleResults.map((r) => [r.moduleId, r.values]));

  const revenue = byId.get('revenue');
  const growth = byId.get('growth');
  const customer = byId.get('customer');
  const inventory = byId.get('inventory');
  const cashFlow = byId.get('cash-flow');
  const risk = byId.get('risk');
  const opportunity = byId.get('opportunity');

  return Object.freeze({
    asOf,
    revenueDelta: asNumber(revenue?.revenueDelta),
    costDelta: asNumber(revenue?.costDelta),
    growth: asNumber(growth?.growth ?? customer?.growth),
    customerHealth: asNumber(customer?.customerHealth),
    churnRatePercent: asNumber(customer?.churnRatePercent),
    stockDaysRemaining: asNumber(inventory?.stockDaysRemaining),
    cashDropPercent: asNumber(cashFlow?.cashDropPercent),
    cashDelta: asNumber(cashFlow?.cashDelta),
    riskScore: asNumber(risk?.riskScore),
    topMarginCategory: asStringOrNull(opportunity?.topMarginCategory ?? null),
    topMarginPercent:
      typeof opportunity?.topMarginPercent === 'number'
        ? opportunity.topMarginPercent
        : null,
    moduleResults: Object.freeze([...moduleResults])
  });
}

/**
 * AnalyticsEngine — orchestrates registered analytics modules against provider data.
 */
export class AnalyticsEngine {
  private readonly provider: BusinessDataProvider;
  private readonly registry: AnalyticsRegistry;
  private lastSnapshot: BusinessAnalyticsSnapshot | null = null;

  constructor(options: AnalyticsEngineOptions = {}) {
    this.provider = options.provider ?? getDefaultBusinessDataProvider();
    this.registry = options.registry ?? createDefaultAnalyticsRegistry();
  }

  compute(): BusinessAnalyticsSnapshot {
    const raw = this.provider.getSnapshot();
    const moduleResults = this.registry.list().map((module) => module.analyze(raw));
    this.lastSnapshot = mergeModuleResults(raw.asOf, moduleResults);
    return this.lastSnapshot;
  }

  getLastSnapshot(): BusinessAnalyticsSnapshot | null {
    return this.lastSnapshot;
  }

  getRegistry(): AnalyticsRegistry {
    return this.registry;
  }
}

export function createAnalyticsEngine(
  options: AnalyticsEngineOptions = {}
): AnalyticsEngine {
  return new AnalyticsEngine(options);
}

export default AnalyticsEngine;
