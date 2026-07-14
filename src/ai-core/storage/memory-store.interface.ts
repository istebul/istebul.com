import type { ChatMessage } from '../types/common.ts';
import type { CustomerContext } from '../memory/customer-context.ts';
import type { RestaurantContext } from '../memory/restaurant-context.ts';

export interface ConversationRecord {
  id: string;
  restaurantId?: string;
  customerId?: string;
  moduleId?: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

/**
 * Persistence abstraction for conversation + context memory.
 * P8-A: interface only — Supabase table wiring is deferred.
 */
export interface MemoryStore {
  getConversation(id: string): Promise<ConversationRecord | null>;
  saveConversation(record: ConversationRecord): Promise<void>;
  getRestaurantContext(restaurantId: string): Promise<RestaurantContext | null>;
  saveRestaurantContext(context: RestaurantContext): Promise<void>;
  getCustomerContext(customerId: string): Promise<CustomerContext | null>;
  saveCustomerContext(context: CustomerContext): Promise<void>;
}
