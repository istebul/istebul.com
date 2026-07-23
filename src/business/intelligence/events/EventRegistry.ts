import type {
  BusinessEventType,
  BusinessEventTypeDefinition
} from '../models/business-events';

const BUILTIN_EVENT_TYPES: readonly BusinessEventTypeDefinition[] = Object.freeze([
  Object.freeze({
    type: 'kpi.updated' as const,
    label: 'KPI Updated',
    description: 'A KPI value was patched by EventProcessor.'
  }),
  Object.freeze({
    type: 'health.changed' as const,
    label: 'Health Changed',
    description: 'Business health score observation.'
  }),
  Object.freeze({
    type: 'metric.threshold' as const,
    label: 'Metric Threshold',
    description: 'A metric crossed a watched threshold.'
  }),
  Object.freeze({
    type: 'anomaly.detected' as const,
    label: 'Anomaly Detected',
    description: 'An anomaly signal was observed.'
  }),
  Object.freeze({
    type: 'trend.shifted' as const,
    label: 'Trend Shifted',
    description: 'A KPI trend direction observation.'
  })
]);

/**
 * EventRegistry — catalogs supported event types for Event Intelligence.
 */
export class EventRegistry {
  private readonly types = new Map<BusinessEventType, BusinessEventTypeDefinition>();

  constructor(seedBuiltins = true) {
    if (seedBuiltins) {
      for (const def of BUILTIN_EVENT_TYPES) {
        this.types.set(def.type, def);
      }
    }
  }

  register(definition: BusinessEventTypeDefinition): void {
    this.types.set(definition.type, definition);
  }

  unregister(type: BusinessEventType): boolean {
    return this.types.delete(type);
  }

  get(type: BusinessEventType): BusinessEventTypeDefinition | undefined {
    return this.types.get(type);
  }

  list(): readonly BusinessEventTypeDefinition[] {
    return Object.freeze([...this.types.values()]);
  }

  count(): number {
    return this.types.size;
  }

  has(type: BusinessEventType): boolean {
    return this.types.has(type);
  }
}

export function createDefaultEventRegistry(): EventRegistry {
  return new EventRegistry(true);
}

export default EventRegistry;
