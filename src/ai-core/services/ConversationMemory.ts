import {
  appendConversationMessage,
  conversationToPromptMessages,
  createConversationState,
  type ConversationState,
} from '../memory/conversation.ts';
import type { ChatMessage } from '../types/common.ts';
import type { MemoryStore } from '../storage/memory-store.interface.ts';
import { InMemoryMemoryStore } from '../storage/in-memory-stores.ts';

export interface ConversationMemoryOptions {
  store?: MemoryStore;
  maxMessages?: number;
}

/**
 * Conversation memory service — ready for module use.
 * Backed by MemoryStore abstraction (in-memory default; Supabase later).
 */
export class ConversationMemory {
  private readonly store: MemoryStore;
  private readonly maxMessages: number;

  constructor(options: ConversationMemoryOptions = {}) {
    this.store = options.store || new InMemoryMemoryStore();
    this.maxMessages = options.maxMessages ?? 40;
  }

  async getOrCreate(
    conversationId: string,
    seed: Partial<Omit<ConversationState, 'id' | 'messages' | 'createdAt' | 'updatedAt'>> = {},
  ): Promise<ConversationState> {
    const existing = await this.store.getConversation(conversationId);
    if (existing) {
      return {
        id: existing.id,
        restaurantId: existing.restaurantId,
        customerId: existing.customerId,
        moduleId: existing.moduleId,
        messages: [...existing.messages],
        metadata: existing.metadata,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt,
      };
    }
    const created = createConversationState(conversationId, seed);
    await this.persist(created);
    return created;
  }

  async append(conversationId: string, message: ChatMessage): Promise<ConversationState> {
    const state = await this.getOrCreate(conversationId);
    const next = appendConversationMessage(state, message);
    await this.persist(next);
    return next;
  }

  async getPromptMessages(conversationId: string): Promise<ChatMessage[]> {
    const state = await this.getOrCreate(conversationId);
    return conversationToPromptMessages(state, this.maxMessages);
  }

  async clear(conversationId: string): Promise<ConversationState> {
    const state = await this.getOrCreate(conversationId);
    const cleared: ConversationState = {
      ...state,
      messages: [],
      updatedAt: new Date().toISOString(),
    };
    await this.persist(cleared);
    return cleared;
  }

  private async persist(state: ConversationState): Promise<void> {
    await this.store.saveConversation({
      id: state.id,
      restaurantId: state.restaurantId,
      customerId: state.customerId,
      moduleId: state.moduleId,
      messages: state.messages,
      metadata: state.metadata,
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
    });
  }
}
