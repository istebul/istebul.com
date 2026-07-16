import type { ProviderOperationResult } from '../types.ts';
import { BasePaymentGatewayProvider } from './BasePaymentGatewayProvider.ts';
import type {
  GatewayAuthorizeRequest,
  GatewayCaptureRequest,
  GatewayRefundRequest,
  GatewayReleaseRequest,
} from './types.ts';

/**
 * Local simulation — deterministic ids, no network, no API keys.
 */
export class MockGatewayProvider extends BasePaymentGatewayProvider {
  readonly code = 'mock' as const;
  readonly displayName = 'Mock';

  override async authorize(request: GatewayAuthorizeRequest): Promise<ProviderOperationResult> {
    const id = `mock_auth_${request.restaurantId.slice(0, 8)}_${Date.now()}`;
    return {
      ok: true,
      provider: this.code,
      status: 'authorized',
      providerTransactionId: id,
      message: 'Mock authorize succeeded locally (no remote call).',
      remoteCallAttempted: false,
      raw: { amount: request.amount, reservationId: request.reservationId },
    };
  }

  override async capture(request: GatewayCaptureRequest): Promise<ProviderOperationResult> {
    return {
      ok: true,
      provider: this.code,
      status: 'captured',
      providerTransactionId: request.providerTransactionId,
      message: 'Mock capture succeeded locally (no remote call).',
      remoteCallAttempted: false,
      raw: { amount: request.amount },
    };
  }

  override async release(request: GatewayReleaseRequest): Promise<ProviderOperationResult> {
    return {
      ok: true,
      provider: this.code,
      status: 'released',
      providerTransactionId: request.providerTransactionId,
      message: 'Mock release succeeded locally (no remote call).',
      remoteCallAttempted: false,
    };
  }

  override async refund(request: GatewayRefundRequest): Promise<ProviderOperationResult> {
    return {
      ok: true,
      provider: this.code,
      status: 'refunded',
      providerTransactionId: request.providerTransactionId,
      message: 'Mock refund succeeded locally (no remote call).',
      remoteCallAttempted: false,
      raw: { amount: request.amount, reason: request.reason },
    };
  }
}
