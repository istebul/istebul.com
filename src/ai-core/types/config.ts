import type { AIProviderCode } from './common.ts';

/**
 * AI Core runtime configuration.
 * Switching provider is intentionally one field.
 */
export interface AICoreConfig {
  /** Strategy selection — change this one line to swap providers. */
  provider: AIProviderCode;
  /** Default chat model label (provider-specific; unused until live wiring). */
  defaultModel?: string;
  /** Default embedding model label. */
  embeddingModel?: string;
  /** Default moderation model label. */
  moderationModel?: string;
  /** Optional namespace for audit / token log correlation. */
  namespace?: string;
}

export const DEFAULT_AI_CORE_CONFIG: AICoreConfig = {
  provider: 'mock',
  defaultModel: 'stub-chat',
  embeddingModel: 'stub-embed',
  moderationModel: 'stub-moderate',
  namespace: 'garson-ai-core',
};
