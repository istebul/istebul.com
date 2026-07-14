import type {
  AIProviderCode,
  LLMCompletionRequest,
  LLMCompletionResult,
} from '../types/common.ts';

/**
 * Strategy contract for chat / completion providers.
 * P8-A: stub implementations only — no OpenAI/Groq/xAI network calls.
 */
export interface LLMProvider {
  readonly code: AIProviderCode;
  readonly displayName: string;
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResult>;
}
