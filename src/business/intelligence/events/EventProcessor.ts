import type {
  BusinessEvent,
  EventIntelligenceResult,
  EventProcessorResult
} from '../models/business-events';
import type {
  BusinessKpiId,
  BusinessKpiSnapshot,
  BusinessKpiValue
} from '../models/business-kpi';
import { createBusinessEvent, synthesizeEventsFromKpiSnapshot } from './BusinessEvent';
import { createEventBus, EventBus } from './EventBus';
import { createDefaultEventRegistry, EventRegistry } from './EventRegistry';
import { createKpiSnapshot } from '../kpi/KPISnapshot';
import { buildKpiTrends } from '../kpi/KPITrend';

export interface EventProcessorOptions {
  bus?: EventBus;
  registry?: EventRegistry;
}

/**
 * Apply optional KPI patches from events that carry `kpiId` + numeric `value`.
 * Observational events (no numeric value) leave the snapshot unchanged.
 */
export function applyEventPatchesToSnapshot(
  snapshot: BusinessKpiSnapshot,
  events: readonly BusinessEvent[]
): EventProcessorResult {
  let appliedUpdates = 0;
  const byId = new Map<BusinessKpiId, BusinessKpiValue>(
    snapshot.kpis.map((k) => [k.id, k])
  );

  for (const event of events) {
    if (!event.kpiId) continue;
    const raw = event.payload.value;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const existing = byId.get(event.kpiId);
    if (!existing) continue;
    if (existing.numericValue === raw) continue;

    const patched: BusinessKpiValue = Object.freeze({
      ...existing,
      numericValue: raw,
      displayValue:
        existing.unit === 'percent'
          ? `${raw > 0 ? '+' : ''}${raw.toFixed(1)}%`
          : existing.unit === 'days'
            ? `${raw}g`
            : String(raw)
    });
    byId.set(event.kpiId, patched);
    appliedUpdates += 1;
  }

  if (appliedUpdates === 0) {
    return Object.freeze({
      events,
      kpiSnapshot: snapshot,
      appliedUpdates: 0
    });
  }

  const kpis = Object.freeze([...byId.values()]);
  const trends = buildKpiTrends(
    kpis,
    Object.fromEntries(snapshot.kpis.map((k) => [k.id, k.numericValue]))
  );

  const kpiSnapshot = createKpiSnapshot({
    health: snapshot.health,
    analytics: snapshot.analytics,
    kpis,
    previousById: Object.fromEntries(snapshot.kpis.map((k) => [k.id, k.numericValue]))
  });

  // Preserve recomputed trends from patch baseline.
  const withTrends: BusinessKpiSnapshot = Object.freeze({
    ...kpiSnapshot,
    trends
  });

  return Object.freeze({
    events,
    kpiSnapshot: withTrends,
    appliedUpdates
  });
}

/**
 * EventProcessor — transforms business events into KPI updates via EventBus.
 */
export class EventProcessor {
  private readonly bus: EventBus;
  private readonly registry: EventRegistry;
  private lastResult: EventProcessorResult | null = null;

  constructor(options: EventProcessorOptions = {}) {
    this.bus = options.bus ?? createEventBus();
    this.registry = options.registry ?? createDefaultEventRegistry();
  }

  /**
   * Process events against a KPI snapshot (publish + optional KPI patches).
   */
  process(
    snapshot: BusinessKpiSnapshot,
    events: readonly BusinessEvent[]
  ): EventProcessorResult {
    const knownEvents = events.filter((e) => this.registry.has(e.type));
    this.bus.publishAll(knownEvents);
    const result = applyEventPatchesToSnapshot(snapshot, knownEvents);
    this.lastResult = result;
    return result;
  }

  /**
   * Default mock path: synthesize observational events, publish, no KPI drift.
   */
  processFromSnapshot(snapshot: BusinessKpiSnapshot): EventProcessorResult {
    const events = synthesizeEventsFromKpiSnapshot({
      asOf: snapshot.asOf,
      healthScore: snapshot.healthScore,
      cashDropPercent: snapshot.signals.cashDropPercent,
      stockDaysRemaining: snapshot.signals.stockDaysRemaining,
      revenueDelta: snapshot.signals.revenueDelta,
      riskScore: snapshot.signals.riskScore
    });
    return this.process(snapshot, events);
  }

  /**
   * Emit an explicit KPI update event and apply it.
   */
  applyKpiUpdate(
    snapshot: BusinessKpiSnapshot,
    kpiId: BusinessKpiId,
    value: number,
    source = 'EventProcessor'
  ): EventProcessorResult {
    const event = createBusinessEvent({
      type: 'kpi.updated',
      source,
      timestamp: snapshot.asOf,
      kpiId,
      payload: Object.freeze({ value, note: 'explicit-kpi-update' })
    });
    return this.process(snapshot, [event]);
  }

  getLastResult(): EventProcessorResult | null {
    return this.lastResult;
  }

  getBus(): EventBus {
    return this.bus;
  }

  getRegistry(): EventRegistry {
    return this.registry;
  }

  toIntelligenceResult(result: EventProcessorResult): EventIntelligenceResult {
    return Object.freeze({
      events: result.events,
      appliedUpdates: result.appliedUpdates,
      busPublishCount: this.bus.getPublishCount()
    });
  }
}

export function createEventProcessor(
  options: EventProcessorOptions = {}
): EventProcessor {
  return new EventProcessor(options);
}

export default EventProcessor;
