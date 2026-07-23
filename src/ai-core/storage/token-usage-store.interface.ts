import type { AIModuleId, AIProviderCode, TokenUsage } from '../types/common.ts';

export interface TokenUsageRecord {
  id: string;
  timestamp: string;
  provider: AIProviderCode;
  moduleId?: AIModuleId;
  restaurantId?: string;
  conversationId?: string;
  requestId?: string;
  model: string;
  usage: TokenUsage;
  operation: 'complete' | 'embed' | 'moderate' | 'orchestrate';
}

/**
 * Persistence abstraction for token usage metering.
 * P8-A: interface only — Supabase table wiring is deferred.
 */
export interface TokenUsageStore {
  append(record: TokenUsageRecord): Promise<void>;
  list(options?: {
    restaurantId?: string;
    moduleId?: AIModuleId;
    limit?: number;
  }): Promise<TokenUsageRecord[]>;
}
