import type { AIAuditEntry } from '../types/common.ts';
import type { CustomerContext } from '../memory/customer-context.ts';
import type { RestaurantContext } from '../memory/restaurant-context.ts';
import type { AIAuditStore } from './audit-store.interface.ts';
import type { ConversationRecord, MemoryStore } from './memory-store.interface.ts';
import type { TokenUsageRecord, TokenUsageStore } from './token-usage-store.interface.ts';

/**
 * Local in-memory stores — stand-in until Supabase repositories are attached.
 * Never touches remote databases.
 */
export class InMemoryAuditStore implements AIAuditStore {
  private readonly entries: AIAuditEntry[] = [];

  async append(entry: AIAuditEntry): Promise<void> {
    this.entries.push(entry);
  }

  async list(options: {
    restaurantId?: string;
    conversationId?: string;
    limit?: number;
  } = {}): Promise<AIAuditEntry[]> {
    let rows = this.entries;
    if (options.restaurantId) {
      rows = rows.filter((e) => e.restaurantId === options.restaurantId);
    }
    if (options.conversationId) {
      rows = rows.filter((e) => e.conversationId === options.conversationId);
    }
    const limit = options.limit ?? rows.length;
    return rows.slice(Math.max(0, rows.length - limit));
  }
}

export class InMemoryTokenUsageStore implements TokenUsageStore {
  private readonly records: TokenUsageRecord[] = [];

  async append(record: TokenUsageRecord): Promise<void> {
    this.records.push(record);
  }

  async list(options: {
    restaurantId?: string;
    moduleId?: TokenUsageRecord['moduleId'];
    limit?: number;
  } = {}): Promise<TokenUsageRecord[]> {
    let rows = this.records;
    if (options.restaurantId) {
      rows = rows.filter((r) => r.restaurantId === options.restaurantId);
    }
    if (options.moduleId) {
      rows = rows.filter((r) => r.moduleId === options.moduleId);
    }
    const limit = options.limit ?? rows.length;
    return rows.slice(Math.max(0, rows.length - limit));
  }
}

export class InMemoryMemoryStore implements MemoryStore {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly restaurants = new Map<string, RestaurantContext>();
  private readonly customers = new Map<string, CustomerContext>();

  async getConversation(id: string): Promise<ConversationRecord | null> {
    return this.conversations.get(id) ?? null;
  }

  async saveConversation(record: ConversationRecord): Promise<void> {
    this.conversations.set(record.id, record);
  }

  async getRestaurantContext(restaurantId: string): Promise<RestaurantContext | null> {
    return this.restaurants.get(restaurantId) ?? null;
  }

  async saveRestaurantContext(context: RestaurantContext): Promise<void> {
    this.restaurants.set(context.restaurantId, context);
  }

  async getCustomerContext(customerId: string): Promise<CustomerContext | null> {
    return this.customers.get(customerId) ?? null;
  }

  async saveCustomerContext(context: CustomerContext): Promise<void> {
    this.customers.set(context.customerId, context);
  }
}
