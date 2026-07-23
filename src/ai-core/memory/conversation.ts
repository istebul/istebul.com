import type { ChatMessage } from '../types/common.ts';

/**
 * Conversation turn buffer used by ConversationMemory service.
 */
export interface ConversationState {
  id: string;
  restaurantId?: string;
  customerId?: string;
  moduleId?: string;
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function createConversationState(
  id: string,
  partial: Partial<Omit<ConversationState, 'id' | 'messages' | 'createdAt' | 'updatedAt'>> & {
    messages?: ChatMessage[];
  } = {},
): ConversationState {
  const now = new Date().toISOString();
  return {
    id,
    restaurantId: partial.restaurantId,
    customerId: partial.customerId,
    moduleId: partial.moduleId,
    messages: partial.messages ? [...partial.messages] : [],
    metadata: partial.metadata || {},
    createdAt: now,
    updatedAt: now,
  };
}

export function appendConversationMessage(
  state: ConversationState,
  message: ChatMessage,
): ConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      {
        ...message,
        createdAt: message.createdAt || new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function conversationToPromptMessages(
  state: ConversationState,
  maxMessages = 40,
): ChatMessage[] {
  if (state.messages.length <= maxMessages) {
    return [...state.messages];
  }
  return state.messages.slice(-maxMessages);
}
