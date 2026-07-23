import type { PaymentProviderCode, PaymentStatus } from '@/lib/payment-status';

/**
 * Payment provider strategy contract.
 * P7-I: interface + stubs only — no network, no card data, no real authorize/capture.
 */
export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface ProviderAuthorizeRequest {
  restaurantId: string;
  reservationId?: string;
  customerName?: string;
  customerPhone?: string;
  amount: MoneyAmount;
  metadata?: Record<string, unknown>;
}

export interface ProviderCaptureRequest {
  restaurantId: string;
  providerTransactionId: string;
  amount?: MoneyAmount;
  metadata?: Record<string, unknown>;
}

export interface ProviderReleaseRequest {
  restaurantId: string;
  providerTransactionId: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderRefundRequest {
  restaurantId: string;
  providerTransactionId: string;
  amount: MoneyAmount;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResult {
  ok: boolean;
  provider: PaymentProviderCode;
  status: PaymentStatus;
  providerTransactionId: string | null;
  message: string;
  /** Always false in P7-I — marks that no remote provider was contacted. */
  remoteCallAttempted: false;
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly code: PaymentProviderCode;
  readonly displayName: string;
  authorize(request: ProviderAuthorizeRequest): Promise<ProviderResult>;
  capture(request: ProviderCaptureRequest): Promise<ProviderResult>;
  release(request: ProviderReleaseRequest): Promise<ProviderResult>;
  refund(request: ProviderRefundRequest): Promise<ProviderResult>;
}

export interface SettlementPreview {
  totalBill: number | null;
  guaranteeOffset: number | null;
  remainingCollection: number | null;
  refund: number | null;
  currency: string;
  calculated: false;
  note: string;
}
