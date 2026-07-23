import type { BusinessKpiId, BusinessKpiSnapshot } from './business-kpi';

/** Supported business event types for Event Intelligence. */
export type BusinessEventType =
  | 'kpi.updated'
  | 'health.changed'
  | 'metric.threshold'
  | 'anomaly.detected'
  | 'trend.shifted';

/** Immutable business event record. */
export interface BusinessEvent {
  id: string;
  type: BusinessEventType;
  source: string;
  timestamp: string;
  /** Optional KPI target when the event patches a KPI value. */
  kpiId?: BusinessKpiId;
  payload: Readonly<Record<string, number | string | boolean | null>>;
}

export type BusinessEventHandler = (event: BusinessEvent) => void;

/** Event type registration metadata. */
export interface BusinessEventTypeDefinition {
  readonly type: BusinessEventType;
  readonly label: string;
  readonly description: string;
}

/** Result of EventProcessor applying events onto a KPI snapshot. */
export interface EventProcessorResult {
  events: readonly BusinessEvent[];
  kpiSnapshot: BusinessKpiSnapshot;
  /** Number of KPI value patches applied (0 when events are observational). */
  appliedUpdates: number;
}

/** Aggregate Event Intelligence output attached to MetricsEngine. */
export interface EventIntelligenceResult {
  events: readonly BusinessEvent[];
  appliedUpdates: number;
  busPublishCount: number;
}
