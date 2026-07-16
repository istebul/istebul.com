/**
 * P8-C AI Concierge — shared types.
 */

export type ConciergeIntentId =
  | 'create_reservation'
  | 'suggest_table'
  | 'change_party_size'
  | 'suggest_datetime'
  | 'suggest_menu'
  | 'create_preorder'
  | 'suggest_campaign'
  | 'show_reservation_summary'
  | 'general';

export interface ConciergeIntent {
  id: ConciergeIntentId;
  confidence: number;
  /** Extracted slots from the user utterance. */
  slots: {
    partySize?: number;
    date?: string;
    time?: string;
    salon?: string;
    tablePreference?: string;
    menuNeedle?: string;
    campaignNeedle?: string;
  };
  raw: string;
}

/** Session memory retained for the Concierge conversation. */
export interface ConciergeMemoryState {
  restaurantSlug: string;
  restaurantId: string;
  restaurantName?: string;
  date?: string;
  time?: string;
  partySize?: number;
  salonPreference?: string;
  tablePreference?: string;
  tableId?: string;
  tableName?: string;
  preorder?: Array<{ name: string; quantity: number }>;
  campaign?: string;
  reservationDraftReady?: boolean;
  updatedAt: string;
}

export interface ConciergeSuggestionCard {
  id: string;
  title: string;
  description: string;
  /** Pre-filled user message when the card is tapped. */
  prompt: string;
  kind: 'table' | 'menu' | 'campaign' | 'reservation' | 'summary';
}

export interface ConciergeQuickPick {
  id: string;
  label: string;
  prompt: string;
}

export interface ConciergeChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  createdAt: string;
  intentId?: ConciergeIntentId;
  suggestionCards?: ConciergeSuggestionCard[];
}

export interface ConciergeTurnResult {
  ok: boolean;
  intent: ConciergeIntent;
  memory: ConciergeMemoryState;
  messages: ConciergeChatMessage[];
  assistantMessage: ConciergeChatMessage;
  suggestionCards: ConciergeSuggestionCard[];
  /** Always false while mock / stub providers are in use. */
  remoteCallAttempted: false;
  provider: 'openai' | 'groq' | 'xai' | 'mock';
  model: string;
  conversationId: string;
  promptPreview?: string;
  knowledgeSummary?: string;
}

export const CONCIERGE_QUICK_PICKS: ConciergeQuickPick[] = [
  {
    id: 'today-reservation',
    label: 'Bugün rezervasyon',
    prompt: 'Bugün için rezervasyon oluşturmak istiyorum',
  },
  {
    id: 'menu-suggest',
    label: 'Menü öner',
    prompt: 'Bana menüden bir şey önerir misin?',
  },
  {
    id: 'campaigns',
    label: 'Kampanyalar',
    prompt: 'Aktif kampanyaları gösterir misin?',
  },
  {
    id: 'romantic-table',
    label: 'Romantik masa',
    prompt: 'İki kişilik romantik ve sessiz bir masa öner',
  },
  {
    id: 'family-table',
    label: 'Aile masası',
    prompt: 'Dört kişilik aile masası öner',
  },
];

export const CONCIERGE_OPENING =
  'Merhaba! Ben GarsonAI Concierge.\nRezervasyon, masa, menü veya kampanya için yardımcı olabilirim.';
