import { BaseLLMProvider } from './BaseLLMProvider.ts';

/**
 * xAI (Grok) provider stub — Strategy Pattern concrete strategy.
 * No SDK import, no network.
 */
export class XAIProvider extends BaseLLMProvider {
  readonly code = 'xai' as const;
  readonly displayName = 'xAI';

  override async complete(request: Parameters<BaseLLMProvider['complete']>[0]) {
    return this.stubComplete(request, 'grok-stub');
  }

  override async embed(request: Parameters<BaseLLMProvider['embed']>[0]) {
    return this.stubEmbed(request, 'xai-embed-stub');
  }

  override async moderate(request: Parameters<BaseLLMProvider['moderate']>[0]) {
    return this.stubModerate(request, 'xai-moderate-stub');
  }
}
