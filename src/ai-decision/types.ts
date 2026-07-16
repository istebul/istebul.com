/**
 * P8-F AI Restaurant Brain — shared decision types.
 * Deterministic / mock scoring only — remoteCallAttempted always false.
 */

export type DecisionKind =
  | 'suggest_table'
  | 'suggest_reservation'
  | 'suggest_menu'
  | 'suggest_campaign'
  | 'suggest_guarantee'
  | 'predict_density'
  | 'predict_wait_time'
  | 'analyze_kitchen_load';

export type DecisionProviderCode = 'mock' | 'openai' | 'groq' | 'xai';

export interface DecisionScore {
  id: string;
  label: string;
  score: number;
  reasons: string[];
  meta?: Record<string, unknown>;
}

export interface DecisionInput {
  restaurantId: string;
  kind: DecisionKind;
  /** ISO date YYYY-MM-DD */
  date?: string;
  time?: string;
  partySize?: number;
  salon?: string;
  quietPreferred?: boolean;
  outdoorPreferred?: boolean;
  menuNeedle?: string;
  campaignNeedle?: string;
  estimatedBill?: number;
  conversationId?: string;
  /** Free-form slots from Concierge / Action layers (duck-typed). */
  extras?: Record<string, string | number | boolean | null | undefined>;
  tags?: string[];
}

export interface DecisionResult {
  ok: boolean;
  kind: DecisionKind;
  restaurantId: string;
  provider: DecisionProviderCode;
  /** Always false in P8-F — no live LLM / network. */
  remoteCallAttempted: false;
  summary: string;
  recommendations: DecisionScore[];
  predictions?: {
    densityPct?: number;
    waitMinutes?: number;
    kitchenLoadPct?: number;
    band?: 'low' | 'medium' | 'high';
  };
  guarantee?: {
    amount: number;
    currency: string;
    required: boolean;
    policyId?: string;
  };
  /** Optional Action Engine hint ids (not executed). */
  actionHints?: string[];
  auditId?: string;
  data?: Record<string, unknown>;
}

/** Duck-typed Concierge turn (P8-C) — no import required at call site. */
export interface ConciergeTurnLike {
  intent: { id: string; slots?: Record<string, unknown>; raw?: string };
  memory: {
    restaurantId: string;
    date?: string;
    time?: string;
    partySize?: number;
    salonPreference?: string;
    tableId?: string;
    preorder?: Array<{ name: string; quantity: number }>;
    campaign?: string;
  };
  conversationId?: string;
  assistantMessage?: { content?: string };
}

export const DECISION_KINDS: DecisionKind[] = [
  'suggest_table',
  'suggest_reservation',
  'suggest_menu',
  'suggest_campaign',
  'suggest_guarantee',
  'predict_density',
  'predict_wait_time',
  'analyze_kitchen_load',
];
