import {
  createAICore,
  type AIOrchestrator,
  type AIProviderCode,
} from '../../ai-core/index.ts';
import {
  createRestaurantKnowledge,
  type KnowledgeResolver,
  type KnowledgeService,
} from '../../restaurant-knowledge/index.ts';
import { IntentParser, defaultIntentParser } from '../intents/IntentParser.ts';
import { ConciergeMemory } from '../memory/ConciergeMemory.ts';
import {
  ConciergePromptBuilder,
  defaultConciergePromptBuilder,
} from '../prompts/ConciergePromptBuilder.ts';
import {
  ConciergeMockResponder,
  defaultConciergeMockResponder,
} from './ConciergeMockResponder.ts';
import type {
  ConciergeChatMessage,
  ConciergeTurnResult,
} from '../types.ts';
import { CONCIERGE_OPENING } from '../types.ts';

export interface CreateAIConciergeOptions {
  restaurantSlug: string;
  /** Knowledge / orchestrator restaurant id (defaults to slug). */
  restaurantId?: string;
  restaurantName?: string;
  /**
   * Provider strategy switch — same codes as P8-A AI Core.
   * Default: 'mock' (no live LLM keys required).
   * Flip to 'openai' | 'groq' | 'xai' when live adapters are enabled.
   */
  provider?: AIProviderCode;
  conversationId?: string;
  seedDemo?: boolean;
  intentParser?: IntentParser;
  promptBuilder?: ConciergePromptBuilder;
  mockResponder?: ConciergeMockResponder;
  /** Inject prebuilt knowledge / AI for tests. */
  knowledgeService?: KnowledgeService;
  knowledgeResolver?: KnowledgeResolver;
  ai?: AIOrchestrator;
}

export interface AIConcierge {
  readonly restaurantSlug: string;
  readonly restaurantId: string;
  readonly conversationId: string;
  readonly provider: AIProviderCode;
  readonly ai: AIOrchestrator;
  readonly knowledge: KnowledgeService;
  readonly resolver: KnowledgeResolver;
  getMemory(): ReturnType<ConciergeMemory['getState']>;
  getMessages(): ConciergeChatMessage[];
  getOpeningMessage(): ConciergeChatMessage;
  chat(userMessage: string): Promise<ConciergeTurnResult>;
  /** One-line provider switch without rebuilding knowledge/memory. */
  withProvider(code: AIProviderCode): AIConcierge;
}

let conversationSeq = 0;

function nextId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * P8-C AI Concierge orchestrator:
 * Intent → Memory → Knowledge Snapshot/Resolver → PromptBuilder → AI Core → Provider
 */
export class ConciergeService implements AIConcierge {
  readonly restaurantSlug: string;
  readonly restaurantId: string;
  readonly conversationId: string;
  readonly provider: AIProviderCode;
  readonly ai: AIOrchestrator;
  readonly knowledge: KnowledgeService;
  readonly resolver: KnowledgeResolver;

  private readonly memory: ConciergeMemory;
  private readonly intentParser: IntentParser;
  private readonly promptBuilder: ConciergePromptBuilder;
  private readonly mockResponder: ConciergeMockResponder;
  private readonly messages: ConciergeChatMessage[] = [];
  private readonly restaurantName: string;

  constructor(options: CreateAIConciergeOptions) {
    this.restaurantSlug = options.restaurantSlug;
    this.restaurantId = options.restaurantId || options.restaurantSlug;
    this.restaurantName = options.restaurantName || 'Restoran';
    this.provider = options.provider || 'mock';
    this.conversationId =
      options.conversationId || `concierge_${this.restaurantSlug}_${++conversationSeq}`;
    this.intentParser = options.intentParser || defaultIntentParser;
    this.promptBuilder = options.promptBuilder || defaultConciergePromptBuilder;
    this.mockResponder = options.mockResponder || defaultConciergeMockResponder;

    if (options.knowledgeService && options.knowledgeResolver) {
      this.knowledge = options.knowledgeService;
      this.resolver = options.knowledgeResolver;
    } else {
      const created = createRestaurantKnowledge({
        seedDemo: options.seedDemo !== false,
        restaurantId: this.restaurantId,
        service: options.knowledgeService,
      });
      this.knowledge = created.service;
      this.resolver = options.knowledgeResolver || created.resolver;
    }

    this.ai =
      options.ai ||
      createAICore(
        { provider: this.provider },
        { knowledgeResolver: this.resolver },
      );

    this.memory = new ConciergeMemory(this.restaurantSlug, this.restaurantId, {
      restaurantName: this.restaurantName,
    });

    const opening = this.getOpeningMessage();
    this.messages.push(opening);
  }

  getMemory() {
    return this.memory.getState();
  }

  getMessages(): ConciergeChatMessage[] {
    return this.messages.map((m) => ({
      ...m,
      suggestionCards: m.suggestionCards ? [...m.suggestionCards] : undefined,
    }));
  }

  getOpeningMessage(): ConciergeChatMessage {
    return {
      id: 'open',
      role: 'assistant',
      content: CONCIERGE_OPENING,
      createdAt: new Date().toISOString(),
    };
  }

  withProvider(code: AIProviderCode): AIConcierge {
    const next = new ConciergeService({
      restaurantSlug: this.restaurantSlug,
      restaurantId: this.restaurantId,
      restaurantName: this.restaurantName,
      provider: code,
      conversationId: this.conversationId,
      seedDemo: false,
      knowledgeService: this.knowledge,
      knowledgeResolver: this.resolver,
      intentParser: this.intentParser,
      promptBuilder: this.promptBuilder,
      mockResponder: this.mockResponder,
      ai: this.ai.withProvider(code),
    });
    // Preserve prior turns (skip duplicate opening).
    const prior = this.messages.filter((m) => m.id !== 'open');
    next.messages.length = 0;
    next.messages.push(next.getOpeningMessage(), ...prior);
    next.memory.patch(this.memory.getState());
    return next;
  }

  async chat(userMessage: string): Promise<ConciergeTurnResult> {
    const text = (userMessage || '').trim();
    if (!text) {
      throw new Error('Concierge chat requires a non-empty user message');
    }

    const intent = this.intentParser.parse(text);
    this.memory.applyIntent(intent);

    const knowledge = await this.resolver.resolve({
      restaurantId: this.restaurantId,
      query: text,
      moduleId: 'concierge',
      partySize: this.memory.getState().partySize,
      date: this.memory.getState().date,
      tags: ['concierge', 'p8c', intent.id],
    });

    // Enrich query for romantic / family table prefs when resolver heuristics miss.
    if (
      intent.id === 'suggest_table' &&
      intent.slots.tablePreference === 'romantic' &&
      !knowledge.constraints.quietPreferred
    ) {
      const refined = await this.resolver.resolve({
        restaurantId: this.restaurantId,
        query: `${text} sessiz`,
        moduleId: 'concierge',
        partySize: this.memory.getState().partySize || 2,
        date: this.memory.getState().date,
        tags: ['concierge', 'romantic'],
      });
      Object.assign(knowledge, refined);
    }

    const prompt = this.promptBuilder.build({
      restaurantName: this.restaurantName,
      intent,
      memory: this.memory,
      knowledge,
      userMessage: text,
    });

    await this.ai.upsertRestaurantContext(this.restaurantId, {
      name: this.restaurantName,
      city: knowledge.snapshot.restaurant.city,
      cuisine: knowledge.snapshot.restaurant.cuisine,
    });

    const orch = await this.ai.orchestrate({
      moduleId: 'customer',
      restaurantId: this.restaurantId,
      conversationId: this.conversationId,
      userMessage: text,
      tags: ['concierge', 'p8c', intent.id],
      variables: {
        restaurant_name: this.restaurantName,
        channel: 'cx-concierge',
        intent_id: intent.id,
        concierge_prompt: prompt.system.slice(0, 500),
      },
      extraMessages: [
        {
          role: 'system',
          content: prompt.system,
        },
      ],
    });

    let content = orch.assistantMessage.content;
    let suggestionCards = [] as ConciergeTurnResult['suggestionCards'];
    let remoteCallAttempted = false as const;

    if (this.provider === 'mock' || orch.provider === 'mock') {
      const mock = this.mockResponder.respond({
        intent,
        memory: this.memory.getState(),
        knowledge,
      });
      content = mock.content;
      suggestionCards = mock.suggestionCards;
      if (mock.memoryPatch) {
        this.memory.patch(mock.memoryPatch);
      }
      remoteCallAttempted = false;
    }

    // Prefer AI Core flag when present (always false in P8-A stubs).
    if (orch.remoteCallAttempted === false) {
      remoteCallAttempted = false;
    }

    const userMsg: ConciergeChatMessage = {
      id: nextId('u'),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
      intentId: intent.id,
    };
    const assistantMsg: ConciergeChatMessage = {
      id: nextId('a'),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      intentId: intent.id,
      suggestionCards,
    };
    this.messages.push(userMsg, assistantMsg);

    return {
      ok: orch.ok,
      intent,
      memory: this.memory.getState(),
      messages: this.getMessages(),
      assistantMessage: assistantMsg,
      suggestionCards,
      remoteCallAttempted,
      provider: orch.provider,
      model: orch.model,
      conversationId: this.conversationId,
      promptPreview: prompt.system.slice(0, 400),
      knowledgeSummary: knowledge.summary,
    };
  }
}

/**
 * One-line bootstrap:
 *   const concierge = createAIConcierge({ restaurantSlug: 'demo-cafe', provider: 'mock' });
 * Later:
 *   createAIConcierge({ restaurantSlug: 'demo-cafe', provider: 'openai' });
 */
export function createAIConcierge(options: CreateAIConciergeOptions): AIConcierge {
  return new ConciergeService(options);
}
