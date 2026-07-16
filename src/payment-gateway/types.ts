/**
 * P8-E Payment Gateway — shared types.
 * Architecture ready for real providers; Mock runs locally without API keys.
 */

export type PaymentProviderCode = 'stripe' | 'iyzico' | 'paytr' | 'mock';

export type PaymentMode = 'test' | 'live';

/**
 * Full authorization lifecycle:
 * Pending → Authorize → Captured → Released → Refunded → Expired → Cancelled
 */
export type AuthorizationStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'released'
  | 'refunded'
  | 'expired'
  | 'cancelled';

export type GuaranteeRuleKind =
  | 'fixed'
  | 'per_guest'
  | 'percent'
  | 'weekend'
  | 'special_day';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface PaymentGatewayConfig {
  id: string;
  restaurantId: string;
  activeProvider: PaymentProviderCode;
  mode: PaymentMode;
  webhookSecret: string;
  merchantId: string;
  providerMetadata: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuaranteeRuleInput {
  kind: GuaranteeRuleKind;
  fixedAmount?: number;
  perGuestAmount?: number;
  percent?: number;
  baseAmount?: number;
  weekendAmount?: number;
  specialDayAmount?: number;
  specialDayDates?: string[];
  currency?: string;
}

export interface GuaranteeQuote {
  required: boolean;
  amount: number;
  currency: string;
  appliedRules: GuaranteeRuleKind[];
  summary: string;
}

export interface PaymentAuthorization {
  id: string;
  restaurantId: string;
  reservationId?: string;
  provider: PaymentProviderCode;
  mode: PaymentMode;
  status: AuthorizationStatus;
  amount: MoneyAmount;
  providerTransactionId: string | null;
  guaranteeQuote?: GuaranteeQuote;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  authorizedAt?: string;
  capturedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
}

export interface SettlementRecord {
  id: string;
  restaurantId: string;
  authorizationId: string;
  reservationId?: string;
  totalBill: number;
  guaranteeOffset: number;
  remainingCollection: number;
  refund: number;
  currency: string;
  phase: 'checkin_hold' | 'bill_closed';
  note: string;
  createdAt: string;
}

export interface ProviderOperationResult {
  ok: boolean;
  provider: PaymentProviderCode;
  status: AuthorizationStatus;
  providerTransactionId: string | null;
  message: string;
  /** Always false until live keys are wired in a later phase. */
  remoteCallAttempted: false;
  authorizationId?: string;
  raw?: Record<string, unknown>;
}

export interface WebhookEnvelope {
  provider: PaymentProviderCode;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  signature?: string;
  receivedAt: string;
}

export interface WebhookParseResult {
  ok: boolean;
  provider: PaymentProviderCode;
  eventType: string;
  eventId: string;
  mappedStatus?: AuthorizationStatus;
  providerTransactionId?: string | null;
  message: string;
  /** Parsing only — no provider network call. */
  remoteCallAttempted: false;
  raw: Record<string, unknown>;
}

export interface ProviderEventRecord {
  id: string;
  restaurantId: string;
  provider: PaymentProviderCode;
  eventType: string;
  eventId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export const AUTHORIZATION_STATUSES: AuthorizationStatus[] = [
  'pending',
  'authorized',
  'captured',
  'released',
  'refunded',
  'expired',
  'cancelled',
];

export const PAYMENT_PROVIDER_CODES: PaymentProviderCode[] = [
  'stripe',
  'iyzico',
  'paytr',
  'mock',
];
