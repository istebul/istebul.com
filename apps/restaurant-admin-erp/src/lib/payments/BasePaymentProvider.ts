import type { PaymentProviderCode, PaymentStatus } from '@/lib/payment-status';
import type {
  PaymentProvider,
  ProviderAuthorizeRequest,
  ProviderCaptureRequest,
  ProviderRefundRequest,
  ProviderReleaseRequest,
  ProviderResult,
} from '@/lib/payments/types';

/**
 * Shared stub behavior — never performs HTTP/SDK calls to payment networks.
 */
export abstract class BasePaymentProvider implements PaymentProvider {
  abstract readonly code: PaymentProviderCode;
  abstract readonly displayName: string;

  protected stubResult(
    status: PaymentStatus,
    message: string,
    providerTransactionId: string | null = null,
  ): ProviderResult {
    return {
      ok: false,
      provider: this.code,
      status,
      providerTransactionId,
      message,
      remoteCallAttempted: false,
      raw: {
        foundation: 'P7-I',
        note: 'Enterprise provider interface only — no live payment traffic.',
      },
    };
  }

  async authorize(_request: ProviderAuthorizeRequest): Promise<ProviderResult> {
    return this.stubResult(
      'pending',
      `${this.displayName} authorize() hazır; gerçek API çağrısı P7-I kapsamında yapılmaz.`,
    );
  }

  async capture(_request: ProviderCaptureRequest): Promise<ProviderResult> {
    return this.stubResult(
      'authorized',
      `${this.displayName} capture() hazır; gerçek API çağrısı P7-I kapsamında yapılmaz.`,
    );
  }

  async release(_request: ProviderReleaseRequest): Promise<ProviderResult> {
    return this.stubResult(
      'authorized',
      `${this.displayName} release() hazır; gerçek API çağrısı P7-I kapsamında yapılmaz.`,
    );
  }

  async refund(_request: ProviderRefundRequest): Promise<ProviderResult> {
    return this.stubResult(
      'captured',
      `${this.displayName} refund() hazır; gerçek API çağrısı P7-I kapsamında yapılmaz.`,
    );
  }
}
