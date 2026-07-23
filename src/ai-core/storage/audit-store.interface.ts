import type { AIAuditEntry } from '../types/common.ts';

/**
 * Persistence abstraction for AI decision audit logs.
 * P8-A: interface only — Supabase table wiring is deferred.
 */
export interface AIAuditStore {
  append(entry: AIAuditEntry): Promise<void>;
  list(options?: {
    restaurantId?: string;
    conversationId?: string;
    limit?: number;
  }): Promise<AIAuditEntry[]>;
}
