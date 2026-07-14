import { BaseLLMProvider } from './BaseLLMProvider.ts';

/**
 * Groq provider stub — Strategy Pattern concrete strategy.
 * No SDK import, no network.
 */
export class GroqProvider extends BaseLLMProvider {
  readonly code = 'groq' as const;
  readonly displayName = 'Groq';

  override async complete(request: Parameters<BaseLLMProvider['complete']>[0]) {
    return this.stubComplete(request, 'llama-3.1-8b-instant-stub');
  }

  override async embed(request: Parameters<BaseLLMProvider['embed']>[0]) {
    return this.stubEmbed(request, 'groq-embed-stub');
  }

  override async moderate(request: Parameters<BaseLLMProvider['moderate']>[0]) {
    return this.stubModerate(request, 'groq-moderate-stub');
  }
}
