import {
  createEmptyCustomerContext,
  customerContextToPromptBlock,
  type CustomerContext,
} from '../memory/customer-context.ts';
import {
  createEmptyRestaurantContext,
  restaurantContextToPromptBlock,
  type RestaurantContext,
} from '../memory/restaurant-context.ts';
import type { MemoryStore } from '../storage/memory-store.interface.ts';
import type { TokenUsageStore, TokenUsageRecord } from '../storage/token-usage-store.interface.ts';
import {
  InMemoryMemoryStore,
  InMemoryTokenUsageStore,
} from '../storage/in-memory-stores.ts';
import type { RestaurantKnowledgeResolverPort } from '../interfaces/RestaurantKnowledgeResolverPort.ts';
import type { AIProviderBundle } from '../providers/provider-factory.ts';
import { getAIProvider } from '../providers/provider-factory.ts';
import type {
  AIModuleId,
  AIRequestMeta,
  ChatMessage,
  LLMCompletionResult,
  TokenUsage,
} from '../types/common.ts';
import type { AICoreConfig } from '../types/config.ts';
import { DEFAULT_AI_CORE_CONFIG } from '../types/config.ts';
import { AIAuditLogger } from './AIAuditLogger.ts';
import { ConversationMemory } from './ConversationMemory.ts';
import { PromptBuilder } from './PromptBuilder.ts';
import { PromptRegistry } from './PromptRegistry.ts';
import { TokenCounter } from './TokenCounter.ts';

export interface AIOrchestratorOptions {
  /** One-line provider switch: { provider: 'groq' } */
  config?: Partial<AICoreConfig>;
  provider?: AIProviderBundle;
  promptRegistry?: PromptRegistry;
  promptBuilder?: PromptBuilder;
  tokenCounter?: TokenCounter;
  conversationMemory?: ConversationMemory;
  auditLogger?: AIAuditLogger;
  memoryStore?: MemoryStore;
  tokenUsageStore?: TokenUsageStore;
  /**
   * Optional P8-B Restaurant Knowledge Graph resolver.
   * When omitted, orchestrate() behaves exactly as P8-A.
   */
  knowledgeResolver?: RestaurantKnowledgeResolverPort;
}

export interface OrchestrateInput {
  moduleId: AIModuleId;
  userMessage: string;
  variables?: Record<string, string | number | boolean | null | undefined>;
  conversationId?: string;
  restaurantId?: string;
  customerId?: string;
  restaurantContext?: Partial<RestaurantContext>;
  customerContext?: Partial<CustomerContext>;
  extraMessages?: ChatMessage[];
  tags?: string[];
}

export interface OrchestrateResult {
  ok: boolean;
  provider: LLMCompletionResult['provider'];
  model: string;
  moduleId: AIModuleId;
  messages: ChatMessage[];
  assistantMessage: ChatMessage;
  usage: TokenUsage;
  remoteCallAttempted: false;
  conversationId?: string;
  auditId?: string;
  promptId?: string;
}

/**
 * Central entry point for all GarsonAI AI modules.
 * Modules must call orchestrator — never providers directly.
 */
export class AIOrchestrator {
  readonly config: AICoreConfig;
  readonly provider: AIProviderBundle;
  readonly prompts: PromptRegistry;
  readonly builder: PromptBuilder;
  readonly tokens: TokenCounter;
  readonly memory: ConversationMemory;
  readonly audit: AIAuditLogger;
  readonly contextStore: MemoryStore;
  readonly tokenUsage: TokenUsageStore;
  readonly knowledgeResolver?: RestaurantKnowledgeResolverPort;

  constructor(options: AIOrchestratorOptions = {}) {
    this.config = { ...DEFAULT_AI_CORE_CONFIG, ...options.config };
    this.provider = options.provider || getAIProvider(this.config.provider);
    this.prompts = options.promptRegistry || new PromptRegistry();
    this.builder = options.promptBuilder || new PromptBuilder();
    this.tokens = options.tokenCounter || new TokenCounter();
    this.contextStore = options.memoryStore || new InMemoryMemoryStore();
    this.memory =
      options.conversationMemory ||
      new ConversationMemory({ store: this.contextStore });
    this.audit =
      options.auditLogger ||
      new AIAuditLogger({ defaultProvider: this.provider.code });
    this.tokenUsage = options.tokenUsageStore || new InMemoryTokenUsageStore();
    this.knowledgeResolver = options.knowledgeResolver;
  }

  /** Convenience: swap strategy without reconstructing the whole graph. */
  withProvider(code: AICoreConfig['provider']): AIOrchestrator {
    return new AIOrchestrator({
      config: { ...this.config, provider: code },
      promptRegistry: this.prompts,
      promptBuilder: this.builder,
      tokenCounter: this.tokens,
      conversationMemory: this.memory,
      auditLogger: this.audit,
      memoryStore: this.contextStore,
      tokenUsageStore: this.tokenUsage,
      knowledgeResolver: this.knowledgeResolver,
    });
  }

  async upsertRestaurantContext(
    restaurantId: string,
    partial: Partial<Omit<RestaurantContext, 'restaurantId' | 'updatedAt'>> = {},
  ): Promise<RestaurantContext> {
    const existing = await this.contextStore.getRestaurantContext(restaurantId);
    const next = createEmptyRestaurantContext(restaurantId, {
      ...(existing || {}),
      ...partial,
      name: partial.name || existing?.name || 'Restaurant',
    });
    await this.contextStore.saveRestaurantContext(next);
    return next;
  }

  async upsertCustomerContext(
    customerId: string,
    partial: Partial<Omit<CustomerContext, 'customerId' | 'updatedAt'>> = {},
  ): Promise<CustomerContext> {
    const existing = await this.contextStore.getCustomerContext(customerId);
    const next = createEmptyCustomerContext(customerId, {
      ...(existing || {}),
      ...partial,
    });
    await this.contextStore.saveCustomerContext(next);
    return next;
  }

  async orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
    const template = this.prompts.getForModule(input.moduleId);
    if (!template) {
      throw new Error(`No prompt registered for module: ${input.moduleId}`);
    }

    const restaurantCtx = input.restaurantId
      ? await this.resolveRestaurantContext(input.restaurantId, input.restaurantContext)
      : null;
    const customerCtx = input.customerId
      ? await this.resolveCustomerContext(input.customerId, input.customerContext)
      : null;

    const variables = {
      restaurant_name: restaurantCtx?.name || 'Restaurant',
      ...input.variables,
    };
    const built = this.builder.buildMessages(template, { variables });

    const systemParts = [built.system];
    if (restaurantCtx) {
      systemParts.push(restaurantContextToPromptBlock(restaurantCtx));
    }
    if (customerCtx) {
      systemParts.push(customerContextToPromptBlock(customerCtx));
    }

    if (this.knowledgeResolver && input.restaurantId) {
      const knowledge = await this.knowledgeResolver.resolveForOrchestrate({
        restaurantId: input.restaurantId,
        userMessage: input.userMessage,
        moduleId: input.moduleId,
        tags: input.tags,
      });
      if (knowledge?.promptBlock) {
        systemParts.push(knowledge.promptBlock);
      }
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemParts.filter(Boolean).join('\n\n') },
    ];

    if (input.conversationId) {
      const history = await this.memory.getPromptMessages(input.conversationId);
      messages.push(...history.filter((m) => m.role !== 'system'));
    }

    if (input.extraMessages?.length) {
      messages.push(...input.extraMessages);
    }

    if (built.user) {
      messages.push({ role: 'user', content: built.user });
    }
    messages.push({ role: 'user', content: input.userMessage });

    const meta: AIRequestMeta = {
      restaurantId: input.restaurantId,
      customerId: input.customerId,
      conversationId: input.conversationId,
      moduleId: input.moduleId,
      requestId: `req_${Date.now()}`,
      tags: input.tags,
    };

    const result = await this.provider.complete({
      messages,
      model: this.config.defaultModel,
      meta,
    });

    const usage =
      result.usage.totalTokens > 0
        ? result.usage
        : this.tokens.estimateUsage(messages, result.message.content);

    await this.recordTokenUsage({
      id: `tok_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      provider: result.provider,
      moduleId: input.moduleId,
      restaurantId: input.restaurantId,
      conversationId: input.conversationId,
      requestId: meta.requestId,
      model: result.model,
      usage,
      operation: 'orchestrate',
    });

    if (input.conversationId) {
      await this.memory.append(input.conversationId, {
        role: 'user',
        content: input.userMessage,
      });
      await this.memory.append(input.conversationId, result.message);
    }

    const audit = await this.audit.logDecision({
      provider: result.provider,
      moduleId: input.moduleId,
      conversationId: input.conversationId,
      restaurantId: input.restaurantId,
      customerId: input.customerId,
      requestId: meta.requestId,
      usage,
      tags: input.tags,
      decision: {
        decisionType: `${input.moduleId}.orchestrate`,
        summary: result.message.content.slice(0, 280),
        confidence: result.ok ? 0.5 : 0,
        inputs: { variables, userMessage: input.userMessage },
        outputs: { content: result.message.content },
      },
    });

    return {
      ok: result.ok,
      provider: result.provider,
      model: result.model,
      moduleId: input.moduleId,
      messages,
      assistantMessage: result.message,
      usage,
      remoteCallAttempted: false,
      conversationId: input.conversationId,
      auditId: audit.id,
      promptId: template.id,
    };
  }

  private async resolveRestaurantContext(
    restaurantId: string,
    partial?: Partial<RestaurantContext>,
  ): Promise<RestaurantContext> {
    if (partial) {
      return this.upsertRestaurantContext(restaurantId, partial);
    }
    const existing = await this.contextStore.getRestaurantContext(restaurantId);
    return existing || createEmptyRestaurantContext(restaurantId);
  }

  private async resolveCustomerContext(
    customerId: string,
    partial?: Partial<CustomerContext>,
  ): Promise<CustomerContext> {
    if (partial) {
      return this.upsertCustomerContext(customerId, partial);
    }
    const existing = await this.contextStore.getCustomerContext(customerId);
    return existing || createEmptyCustomerContext(customerId);
  }

  private async recordTokenUsage(record: TokenUsageRecord): Promise<void> {
    await this.tokenUsage.append(record);
  }
}

/**
 * One-line bootstrap:
 *   const ai = createAICore({ provider: 'mock' });
 */
export function createAICore(
  config: Partial<AICoreConfig> = {},
  options: Omit<AIOrchestratorOptions, 'config'> = {},
): AIOrchestrator {
  return new AIOrchestrator({ ...options, config });
}
