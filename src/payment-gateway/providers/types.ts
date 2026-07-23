import type {
  MoneyAmount,
  PaymentProviderCode,
  ProviderOperationResult,
} from '../types.ts';

export interface GatewayAuthorizeRequest {
  restaurantId: string;
  reservationId?: string;
  amount: MoneyAmount;
  metadata?: Record<string, unknown>;
}

export interface GatewayCaptureRequest {
  restaurantId: string;
  providerTransactionId: string;
  amount?: MoneyAmount;
  metadata?: Record<string, unknown>;
}

export interface GatewayReleaseRequest {
  restaurantId: string;
  providerTransactionId: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayRefundRequest {
  restaurantId: string;
  providerTransactionId: string;
  amount: MoneyAmount;
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Strategy contract for payment providers.
 * Implementations must not require real API keys in P8-E.
 */
export interface PaymentGatewayProvider {
  readonly code: PaymentProviderCode;
  readonly displayName: string;
  authorize(request: GatewayAuthorizeRequest): Promise<ProviderOperationResult>;
  capture(request: GatewayCaptureRequest): Promise<ProviderOperationResult>;
  release(request: GatewayReleaseRequest): Promise<ProviderOperationResult>;
  refund(request: GatewayRefundRequest): Promise<ProviderOperationResult>;
}
