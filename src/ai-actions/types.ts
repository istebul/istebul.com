/**
 * P8-D AI Action Engine — shared types.
 */

export type ActionFamily =
  | 'reservation'
  | 'table_assignment'
  | 'preorder'
  | 'guarantee'
  | 'payment'
  | 'campaign'
  | 'summary';

/** Concrete operations supported in P8-D (action layer only — no live payment). */
export type ActionId =
  | 'create_reservation'
  | 'update_reservation'
  | 'assign_table'
  | 'change_table'
  | 'create_preorder'
  | 'update_preorder'
  | 'apply_guarantee'
  | 'create_reservation_summary'
  /** Registered but not executed for live charge — stub only. */
  | 'prepare_payment'
  | 'apply_campaign';

export type ActionStatus =
  | 'ok'
  | 'failed'
  | 'rejected'
  | 'rolled_back'
  | 'skipped';

export interface ActionPayload {
  restaurantId: string;
  restaurantSlug?: string;
  reservationId?: string;
  date?: string;
  time?: string;
  partySize?: number;
  salon?: string;
  tableId?: string;
  tableName?: string;
  previousTableId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  preorder?: Array<{ name: string; quantity: number; menuItemId?: string }>;
  campaign?: string;
  guaranteePolicyId?: string;
  guaranteeAmount?: number;
  /** Free-form slots from intent / AI parse. */
  extras?: Record<string, string | number | boolean | null | undefined>;
}

export interface ActionRequest {
  actionId: ActionId;
  payload: ActionPayload;
  conversationId?: string;
  intentId?: string;
  /** Raw assistant / user text used for parsing. */
  sourceText?: string;
  tags?: string[];
  /** When true, executor will attempt compensating rollback on failure mid-flight. */
  enableRollback?: boolean;
}

export interface ActionResult {
  ok: boolean;
  status: ActionStatus;
  actionId: ActionId;
  family: ActionFamily;
  message: string;
  reservationId?: string;
  data?: Record<string, unknown>;
  errorCode?: string;
  auditId?: string;
  rolledBack?: boolean;
  validationErrors?: string[];
}

export interface ActionContext {
  restaurantId: string;
  conversationId?: string;
  requestId: string;
}

/** Snapshot of state needed to compensate an action. */
export interface ActionCompensation {
  actionId: ActionId;
  reservationId?: string;
  previous?: Record<string, unknown>;
}

export interface ConciergeTurnLike {
  intent: { id: string; slots?: Record<string, unknown>; raw?: string };
  memory: {
    restaurantId: string;
    restaurantSlug?: string;
    date?: string;
    time?: string;
    partySize?: number;
    salonPreference?: string;
    tableId?: string;
    tableName?: string;
    preorder?: Array<{ name: string; quantity: number }>;
    campaign?: string;
    reservationDraftReady?: boolean;
  };
  assistantMessage?: { content?: string };
  conversationId?: string;
}
