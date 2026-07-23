import type {
  BusinessEvent,
  BusinessEventHandler,
  BusinessEventType
} from '../models/business-events';

/**
 * EventBus — publish/subscribe architecture for business events.
 */
export class EventBus {
  private readonly handlers = new Map<BusinessEventType | '*', Set<BusinessEventHandler>>();
  private publishCount = 0;
  private readonly history: BusinessEvent[] = [];

  subscribe(type: BusinessEventType | '*', handler: BusinessEventHandler): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  publish(event: BusinessEvent): void {
    this.publishCount += 1;
    this.history.push(event);
    const specific = this.handlers.get(event.type);
    const wildcard = this.handlers.get('*');
    if (specific) {
      for (const handler of specific) handler(event);
    }
    if (wildcard) {
      for (const handler of wildcard) handler(event);
    }
  }

  publishAll(events: readonly BusinessEvent[]): void {
    for (const event of events) this.publish(event);
  }

  getPublishCount(): number {
    return this.publishCount;
  }

  getHistory(): readonly BusinessEvent[] {
    return Object.freeze([...this.history]);
  }

  clearHistory(): void {
    this.history.length = 0;
  }
}

export function createEventBus(): EventBus {
  return new EventBus();
}

export default EventBus;
