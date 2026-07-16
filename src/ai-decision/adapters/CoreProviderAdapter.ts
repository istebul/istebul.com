import { getAIProvider, type AIProviderCode } from '../../ai-core/index.ts';
import type { DecisionProviderCode } from '../types.ts';

/**
 * Adapter → P8-A AI Core provider factory.
 * P8-F never calls live completion; only validates provider selection (mock default).
 */
export class CoreProviderAdapter {
  resolve(code: DecisionProviderCode = 'mock'): {
    code: DecisionProviderCode;
    remoteCallAttempted: false;
  } {
    const normalized = (code || 'mock').toLowerCase() as AIProviderCode;
    // Touch factory so wiring stays provider-independent; do not call chat/complete.
    getAIProvider(normalized);
    return {
      code: (normalized === 'openai' ||
      normalized === 'groq' ||
      normalized === 'xai'
        ? normalized
        : 'mock') as DecisionProviderCode,
      remoteCallAttempted: false,
    };
  }
}
