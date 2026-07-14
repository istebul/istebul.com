import type { ChatMessage, TokenUsage } from '../types/common.ts';

/**
 * Lightweight heuristic token counter — preparation for live usage metering.
 * Not a tokenizer; estimates ~4 chars/token for Latin/Turkish mixed text.
 */
export class TokenCounter {
  private readonly charsPerToken: number;

  constructor(charsPerToken = 4) {
    this.charsPerToken = Math.max(1, charsPerToken);
  }

  countText(text: string): number {
    if (!text) {
      return 0;
    }
    return Math.ceil(text.length / this.charsPerToken);
  }

  countMessages(messages: ChatMessage[]): number {
    return messages.reduce((sum, msg) => sum + this.countText(msg.content || ''), 0);
  }

  estimateUsage(promptMessages: ChatMessage[], completionText = ''): TokenUsage {
    const promptTokens = this.countMessages(promptMessages);
    const completionTokens = this.countText(completionText);
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      estimated: true,
    };
  }
}
