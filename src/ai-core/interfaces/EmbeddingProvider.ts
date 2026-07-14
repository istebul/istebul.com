import type {
  AIProviderCode,
  EmbeddingRequest,
  EmbeddingResult,
} from '../types/common.ts';

/**
 * Strategy contract for embedding providers.
 * P8-A: stub implementations only.
 */
export interface EmbeddingProvider {
  readonly code: AIProviderCode;
  readonly displayName: string;
  embed(request: EmbeddingRequest): Promise<EmbeddingResult>;
}
