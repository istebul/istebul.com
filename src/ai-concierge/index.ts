/**
 * GarsonAI — P8-C AI Concierge
 *
 * First real guest AI module. Built on P8-A AI Core + P8-B Restaurant Knowledge Graph.
 * Default provider: mock (smart Knowledge-backed replies, remoteCallAttempted = false).
 * Switch to openai | groq | xai with one line when live adapters are enabled.
 *
 * Additive: does not modify P6 production or P7 journey ConciergeStep placeholder.
 */

export type {
  ConciergeIntentId,
  ConciergeIntent,
  ConciergeMemoryState,
  ConciergeSuggestionCard,
  ConciergeQuickPick,
  ConciergeChatMessage,
  ConciergeTurnResult,
} from './types.ts';

export {
  CONCIERGE_QUICK_PICKS,
  CONCIERGE_OPENING,
} from './types.ts';

export { IntentParser, defaultIntentParser } from './intents/IntentParser.ts';

export {
  ConciergeMemory,
  createEmptyConciergeMemory,
} from './memory/ConciergeMemory.ts';

export {
  ConciergePromptBuilder,
  defaultConciergePromptBuilder,
  type ConciergePromptParts,
} from './prompts/ConciergePromptBuilder.ts';

export {
  ConciergeMockResponder,
  defaultConciergeMockResponder,
  type ConciergeMockResponse,
} from './services/ConciergeMockResponder.ts';

export {
  ConciergeService,
  createAIConcierge,
  type CreateAIConciergeOptions,
  type AIConcierge,
} from './services/ConciergeService.ts';
