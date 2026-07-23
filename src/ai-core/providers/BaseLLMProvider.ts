import type { EmbeddingProvider } from '../interfaces/EmbeddingProvider.ts';
import type { LLMProvider } from '../interfaces/LLMProvider.ts';
import type { ModerationProvider } from '../interfaces/ModerationProvider.ts';
import type {
  AIProviderCode,
  EmbeddingRequest,
  EmbeddingResult,
  LLMCompletionRequest,
  LLMCompletionResult,
  ModerationRequest,
  ModerationResult,
  TokenUsage,
} from '../types/common.ts';

function emptyUsage(): TokenUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimated: true,
  };
}

/**
 * Shared stub behavior — never performs HTTP/SDK calls to LLM networks.
 */
export abstract class BaseLLMProvider
  implements LLMProvider, EmbeddingProvider, ModerationProvider
{
  abstract readonly code: AIProviderCode;
  abstract readonly displayName: string;

  protected stubComplete(
    request: LLMCompletionRequest,
    modelFallback: string,
  ): LLMCompletionResult {
    const model = request.model || modelFallback;
    return {
      ok: true,
      provider: this.code,
      model,
      message: {
        role: 'assistant',
        content: `[${this.displayName} stub] LLM complete() hazır; gerçek API çağrısı P8-A kapsamında yapılmaz.`,
        createdAt: new Date().toISOString(),
      },
      usage: emptyUsage(),
      remoteCallAttempted: false,
      latencyMs: 0,
      raw: {
        foundation: 'P8-A',
        note: 'Provider interface only — no live LLM traffic.',
        messageCount: request.messages.length,
      },
    };
  }

  protected stubEmbed(
    request: EmbeddingRequest,
    modelFallback: string,
  ): EmbeddingResult {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return {
      ok: true,
      provider: this.code,
      model: request.model || modelFallback,
      embeddings: inputs.map(() => []),
      usage: emptyUsage(),
      remoteCallAttempted: false,
      latencyMs: 0,
    };
  }

  protected stubModerate(
    request: ModerationRequest,
    modelFallback: string,
  ): ModerationResult {
    return {
      ok: true,
      provider: this.code,
      model: request.model || modelFallback,
      flagged: false,
      categories: {},
      remoteCallAttempted: false,
      latencyMs: 0,
    };
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResult> {
    return this.stubComplete(request, 'stub-chat');
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    return this.stubEmbed(request, 'stub-embed');
  }

  async moderate(request: ModerationRequest): Promise<ModerationResult> {
    return this.stubModerate(request, 'stub-moderate');
  }
}
