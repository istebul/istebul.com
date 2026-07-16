import type { PaymentProviderCode, ProviderOperationResult } from '../types.ts';
import type {
  GatewayAuthorizeRequest,
  GatewayCaptureRequest,
  GatewayRefundRequest,
  GatewayReleaseRequest,
  PaymentGatewayProvider,
} from './types.ts';

/**
 * Shared stub behavior for real providers — architecture only, no HTTP/SDK.
 */
export abstract class BasePaymentGatewayProvider implements PaymentGatewayProvider {
  abstract readonly code: PaymentProviderCode;
  abstract readonly displayName: string;

  protected stub(
    status: ProviderOperationResult['status'],
    message: string,
    providerTransactionId: string | null = null,
  ): ProviderOperationResult {
    return {
      ok: false,
      provider: this.code,
      status,
      providerTransactionId,
      message,
      remoteCallAttempted: false,
      raw: {
        foundation: 'P8-E',
        note: 'Provider strategy ready — no live payment traffic / API keys required.',
      },
    };
  }

  async authorize(_request: GatewayAuthorizeRequest): Promise<ProviderOperationResult> {
    return this.stub(
      'pending',
      `${this.displayName} authorize() hazır; gerçek API anahtarı / ağ çağrısı P8-E kapsamında yapılmaz.`,
    );
  }

  async capture(_request: GatewayCaptureRequest): Promise<ProviderOperationResult> {
    return this.stub(
      'authorized',
      `${this.displayName} capture() hazır; gerçek API anahtarı / ağ çağrısı P8-E kapsamında yapılmaz.`,
    );
  }

  async release(_request: GatewayReleaseRequest): Promise<ProviderOperationResult> {
    return this.stub(
      'authorized',
      `${this.displayName} release() hazır; gerçek API anahtarı / ağ çağrısı P8-E kapsamında yapılmaz.`,
    );
  }

  async refund(_request: GatewayRefundRequest): Promise<ProviderOperationResult> {
    return this.stub(
      'captured',
      `${this.displayName} refund() hazır; gerçek API anahtarı / ağ çağrısı P8-E kapsamında yapılmaz.`,
    );
  }
}
