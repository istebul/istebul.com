import type {
  EmbeddingRequest,
  EmbeddingResult,
  LLMCompletionRequest,
  LLMCompletionResult,
  ModerationRequest,
  ModerationResult,
} from '../types/common.ts';
import { BaseLLMProvider } from './BaseLLMProvider.ts';

/**
 * Local mock provider — deterministic stub responses for tests and local wiring.
 * Still no network.
 */
export class MockProvider extends BaseLLMProvider {
  readonly code = 'mock' as const;
  readonly displayName = 'Mock';

  override async complete(request: LLMCompletionRequest): Promise<LLMCompletionResult> {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
    const echo = lastUser?.content?.slice(0, 120) || '';
    return {
      ok: true,
      provider: this.code,
      model: request.model || 'mock-chat',
      message: {
        role: 'assistant',
        content: echo
          ? `[mock] Echo: ${echo}`
          : '[mock] Ready — no remote LLM call.',
        createdAt: new Date().toISOString(),
      },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimated: true,
      },
      remoteCallAttempted: false,
      latencyMs: 0,
      raw: { foundation: 'P8-A', mock: true },
    };
  }

  override async embed(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    return {
      ok: true,
      provider: this.code,
      model: request.model || 'mock-embed',
      // Deterministic tiny vectors for tests (not semantic).
      embeddings: inputs.map((text) => [text.length % 31, text.length % 17]),
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimated: true,
      },
      remoteCallAttempted: false,
      latencyMs: 0,
    };
  }

  override async moderate(request: ModerationRequest): Promise<ModerationResult> {
    return {
      ok: true,
      provider: this.code,
      model: request.model || 'mock-moderate',
      flagged: false,
      categories: { hate: false, violence: false, self_harm: false },
      remoteCallAttempted: false,
      latencyMs: 0,
    };
  }
}
