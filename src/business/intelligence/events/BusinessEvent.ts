import type {
  BusinessEvent,
  BusinessEventType
} from '../models/business-events';
import type { BusinessKpiId } from '../models/business-kpi';

let eventSeq = 0;

export interface CreateBusinessEventInput {
  type: BusinessEventType;
  source: string;
  timestamp: string;
  kpiId?: BusinessKpiId;
  payload?: Readonly<Record<string, number | string | boolean | null>>;
  id?: string;
}

/**
 * Factory for immutable BusinessEvent records.
 */
export function createBusinessEvent(input: CreateBusinessEventInput): BusinessEvent {
  eventSeq += 1;
  return Object.freeze({
    id: input.id ?? `evt-${input.type}-${eventSeq}`,
    type: input.type,
    source: input.source,
    timestamp: input.timestamp,
    kpiId: input.kpiId,
    payload: Object.freeze({ ...(input.payload ?? {}) })
  });
}

/**
 * Synthesize observational events from a KPI snapshot without mutating KPI values.
 * Used by the default mock pipeline so Event Intelligence runs without regressions.
 */
export function synthesizeEventsFromKpiSnapshot(params: {
  asOf: string;
  healthScore: number;
  cashDropPercent: number;
  stockDaysRemaining: number;
  revenueDelta: number;
  riskScore: number;
}): readonly BusinessEvent[] {
  const { asOf } = params;
  const events: BusinessEvent[] = [
    createBusinessEvent({
      type: 'health.changed',
      source: 'BusinessHealthEngine',
      timestamp: asOf,
      kpiId: 'business-health',
      payload: Object.freeze({
        overallScore: params.healthScore,
        note: 'health-snapshot'
      })
    }),
    createBusinessEvent({
      type: 'trend.shifted',
      source: 'KPIEngine',
      timestamp: asOf,
      kpiId: 'revenue-trend',
      payload: Object.freeze({
        revenueDelta: params.revenueDelta,
        note: 'revenue-trend-observation'
      })
    })
  ];

  if (params.cashDropPercent > 10) {
    events.push(
      createBusinessEvent({
        type: 'metric.threshold',
        source: 'EventIntelligence',
        timestamp: asOf,
        kpiId: 'cash-flow',
        payload: Object.freeze({
          cashDropPercent: params.cashDropPercent,
          threshold: 10,
          note: 'cash-drop-threshold'
        })
      })
    );
  }

  if (params.stockDaysRemaining < 14) {
    events.push(
      createBusinessEvent({
        type: 'anomaly.detected',
        source: 'EventIntelligence',
        timestamp: asOf,
        kpiId: 'inventory',
        payload: Object.freeze({
          stockDaysRemaining: params.stockDaysRemaining,
          threshold: 14,
          note: 'stock-anomaly'
        })
      })
    );
  }

  if (params.riskScore >= 50) {
    events.push(
      createBusinessEvent({
        type: 'metric.threshold',
        source: 'EventIntelligence',
        timestamp: asOf,
        kpiId: 'risk-score',
        payload: Object.freeze({
          riskScore: params.riskScore,
          threshold: 50,
          note: 'risk-threshold'
        })
      })
    );
  }

  return Object.freeze(events);
}

export default createBusinessEvent;
