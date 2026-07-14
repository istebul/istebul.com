import { BaseLLMProvider } from './BaseLLMProvider.ts';

/**
 * OpenAI provider stub — Strategy Pattern concrete strategy.
 * No SDK import, no network.
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly code = 'openai' as const;
  readonly displayName = 'OpenAI';

  override async complete(request: Parameters<BaseLLMProvider['complete']>[0]) {
    return this.stubComplete(request, 'gpt-4o-mini-stub');
  }

  override async embed(request: Parameters<BaseLLMProvider['embed']>[0]) {
    return this.stubEmbed(request, 'text-embedding-3-small-stub');
  }

  override async moderate(request: Parameters<BaseLLMProvider['moderate']>[0]) {
    return this.stubModerate(request, 'omni-moderation-latest-stub');
  }
}
