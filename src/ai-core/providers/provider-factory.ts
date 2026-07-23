import type { EmbeddingProvider } from '../interfaces/EmbeddingProvider.ts';
import type { LLMProvider } from '../interfaces/LLMProvider.ts';
import type { ModerationProvider } from '../interfaces/ModerationProvider.ts';
import type { AIProviderCode } from '../types/common.ts';
import { GroqProvider } from './groq-provider.ts';
import { MockProvider } from './mock-provider.ts';
import { OpenAIProvider } from './openai-provider.ts';
import { XAIProvider } from './xai-provider.ts';

/**
 * Unified provider surface — one Strategy instance covers chat, embed, moderate.
 */
export type AIProviderBundle = LLMProvider & EmbeddingProvider & ModerationProvider;

const PROVIDER_REGISTRY: Record<AIProviderCode, () => AIProviderBundle> = {
  openai: () => new OpenAIProvider(),
  groq: () => new GroqProvider(),
  xai: () => new XAIProvider(),
  mock: () => new MockProvider(),
};

/**
 * Strategy factory — select provider in one line:
 *   const provider = getAIProvider('groq');
 */
export function getAIProvider(code: AIProviderCode | string = 'mock'): AIProviderBundle {
  const normalized = (code || 'mock').toLowerCase() as AIProviderCode;
  const factory = PROVIDER_REGISTRY[normalized] || PROVIDER_REGISTRY.mock;
  return factory();
}

export function listAIProviders(): AIProviderBundle[] {
  return (Object.keys(PROVIDER_REGISTRY) as AIProviderCode[]).map((code) =>
    PROVIDER_REGISTRY[code](),
  );
}

export function isAIProviderCode(value: string): value is AIProviderCode {
  return Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, value);
}
