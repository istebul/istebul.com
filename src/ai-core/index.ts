/**
 * GarsonAI — P8-A AI Core Platform
 *
 * All AI modules should call through this package — never OpenAI/Groq/xAI directly.
 * P8-A: stubs + memory + registry only. No live LLM traffic. Additive to P6/P7.
 */

export type {
  AIProviderCode,
  AIModuleId,
  ChatRole,
  ChatMessage,
  TokenUsage,
  AIRequestMeta,
  LLMCompletionRequest,
  LLMCompletionResult,
  EmbeddingRequest,
  EmbeddingResult,
  ModerationRequest,
  ModerationResult,
  AIAuditDecision,
  AIAuditEntry,
} from './types/common.ts';

export type { AICoreConfig } from './types/config.ts';
export { DEFAULT_AI_CORE_CONFIG } from './types/config.ts';

export type {
  LLMProvider,
  EmbeddingProvider,
  ModerationProvider,
} from './interfaces/index.ts';

export {
  BaseLLMProvider,
  OpenAIProvider,
  GroqProvider,
  XAIProvider,
  MockProvider,
  getAIProvider,
  listAIProviders,
  isAIProviderCode,
  type AIProviderBundle,
} from './providers/index.ts';

export {
  PromptBuilder,
  PromptRegistry,
  TokenCounter,
  ConversationMemory,
  AIAuditLogger,
  AIOrchestrator,
  createAICore,
  type AIOrchestratorOptions,
  type OrchestrateInput,
  type OrchestrateResult,
  type LogDecisionInput,
} from './services/index.ts';

export {
  BUILTIN_PROMPTS,
  reservationPrompt,
  menuPrompt,
  crmPrompt,
  kitchenPrompt,
  waiterPrompt,
  paymentsPrompt,
  customerPrompt,
  inventoryPrompt,
  type PromptTemplate,
  type PromptRenderInput,
} from './prompts/index.ts';

export {
  type ConversationState,
  createConversationState,
  appendConversationMessage,
  conversationToPromptMessages,
  type RestaurantContext,
  type RestaurantHours,
  createEmptyRestaurantContext,
  restaurantContextToPromptBlock,
  type CustomerContext,
  type CustomerPreference,
  createEmptyCustomerContext,
  customerContextToPromptBlock,
} from './memory/index.ts';

export type {
  AIAuditStore,
  TokenUsageStore,
  TokenUsageRecord,
  MemoryStore,
  ConversationRecord,
} from './storage/index.ts';

export {
  InMemoryAuditStore,
  InMemoryTokenUsageStore,
  InMemoryMemoryStore,
} from './storage/index.ts';
