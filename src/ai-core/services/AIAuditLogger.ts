import type {
  AIAuditDecision,
  AIAuditEntry,
  AIModuleId,
  AIProviderCode,
  TokenUsage,
} from '../types/common.ts';
import type { AIAuditStore } from '../storage/audit-store.interface.ts';
import { InMemoryAuditStore } from '../storage/in-memory-stores.ts';

export interface AIAuditLoggerOptions {
  store?: AIAuditStore;
  defaultProvider?: AIProviderCode;
}

export interface LogDecisionInput {
  decision: AIAuditDecision;
  provider?: AIProviderCode;
  moduleId?: AIModuleId;
  conversationId?: string;
  restaurantId?: string;
  customerId?: string;
  requestId?: string;
  usage?: TokenUsage;
  tags?: string[];
}

/**
 * AI decision audit logger — preparation layer (no Supabase tables yet).
 */
export class AIAuditLogger {
  private readonly store: AIAuditStore;
  private readonly defaultProvider: AIProviderCode;

  constructor(options: AIAuditLoggerOptions = {}) {
    this.store = options.store || new InMemoryAuditStore();
    this.defaultProvider = options.defaultProvider || 'mock';
  }

  async logDecision(input: LogDecisionInput): Promise<AIAuditEntry> {
    const entry: AIAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      provider: input.provider || this.defaultProvider,
      moduleId: input.moduleId,
      conversationId: input.conversationId,
      restaurantId: input.restaurantId,
      customerId: input.customerId,
      requestId: input.requestId,
      decision: input.decision,
      usage: input.usage,
      tags: input.tags,
    };
    await this.store.append(entry);
    return entry;
  }

  async list(options?: {
    restaurantId?: string;
    conversationId?: string;
    limit?: number;
  }): Promise<AIAuditEntry[]> {
    return this.store.list(options);
  }
}
