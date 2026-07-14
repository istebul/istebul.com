import { BasePaymentProvider } from '@/lib/payments/BasePaymentProvider';
import type {
  ProviderAuthorizeRequest,
  ProviderCaptureRequest,
  ProviderRefundRequest,
  ProviderReleaseRequest,
  ProviderResult,
} from '@/lib/payments/types';

/**
 * Local simulation provider — still no network; returns deterministic stub ids.
 */
export class MockProvider extends BasePaymentProvider {
  readonly code = 'mock' as const;
  readonly displayName = 'Mock';

  override async authorize(request: ProviderAuthorizeRequest): Promise<ProviderResult> {
    const id = `mock_auth_${request.restaurantId.slice(0, 8)}_${Date.now()}`;
    return {
      ok: true,
      provider: this.code,
      status: 'authorized',
      providerTransactionId: id,
      message: 'Mock authorize succeeded locally (no remote call).',
      remoteCallAttempted: false,
      raw: { amount: request.amount },
    };
  }

  override async capture(request: ProviderCaptureRequest): Promise<ProviderResult> {
    return {
      ok: true,
      provider: this.code,
      status: 'captured',
      providerTransactionId: request.providerTransactionId,
      message: 'Mock capture succeeded locally (no remote call).',
      remoteCallAttempted: false,
    };
  }

  override async release(request: ProviderReleaseRequest): Promise<ProviderResult> {
    return {
      ok: true,
      provider: this.code,
      status: 'released',
      providerTransactionId: request.providerTransactionId,
      message: 'Mock release succeeded locally (no remote call).',
      remoteCallAttempted: false,
    };
  }

  override async refund(request: ProviderRefundRequest): Promise<ProviderResult> {
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
