import {
  createAIActionEngine,
  type AIActionEngine,
  type ConciergeTurnLike,
} from '../../ai-actions/index.ts';
import type { GuaranteeRuleInput, PaymentAuthorization, PaymentProviderCode } from '../types.ts';
import {
  createPaymentGateway,
  type PaymentGatewayService,
} from './PaymentGatewayService.ts';

export interface ConciergePaymentBridgeOptions {
  restaurantId: string;
  gateway?: PaymentGatewayService;
  actionEngine?: AIActionEngine;
  /** Default guarantee rules when KG policy is unavailable. */
  defaultGuaranteeRules?: GuaranteeRuleInput | GuaranteeRuleInput[];
  defaultProvider?: PaymentProviderCode;
}

export interface ConciergePaymentFlowResult {
  guaranteeRequired: boolean;
  guaranteeAmount: number;
  currency: string;
  provider: PaymentProviderCode;
  authorization: PaymentAuthorization | null;
  conversationMessage: string;
  actionResultOk: boolean | null;
  providerMessage: string;
}

function defaultRules(): GuaranteeRuleInput[] {
  return [
    { kind: 'fixed', fixedAmount: 200, currency: 'TRY' },
    { kind: 'per_guest', perGuestAmount: 100, currency: 'TRY' },
    { kind: 'weekend', weekendAmount: 300, currency: 'TRY' },
  ];
}

/**
 * AI Concierge → Guarantee? → Provider select → Authorize → conversation message.
 * Additive: does not mutate P8-C Concierge or change P8-D prepare_payment (still skipped).
 */
export class ConciergePaymentBridge {
  readonly restaurantId: string;
  readonly gateway: PaymentGatewayService;
  readonly actions: AIActionEngine;
  private readonly defaultGuaranteeRules: GuaranteeRuleInput | GuaranteeRuleInput[];
  private readonly defaultProvider: PaymentProviderCode;

  constructor(options: ConciergePaymentBridgeOptions) {
    this.restaurantId = options.restaurantId;
    this.gateway = options.gateway || createPaymentGateway();
    this.actions =
      options.actionEngine ||
      createAIActionEngine({ restaurantId: options.restaurantId });
    this.defaultGuaranteeRules = options.defaultGuaranteeRules || defaultRules();
    this.defaultProvider = options.defaultProvider || 'mock';
    this.gateway.setConfig(this.restaurantId, {
      activeProvider: this.defaultProvider,
      mode: 'test',
    });
  }

  /**
   * Run after a Concierge turn. Uses Action Engine apply_guarantee when reservation exists,
   * then Mock (or configured) provider authorize.
   */
  async runFromTurn(
    turn: ConciergeTurnLike,
    overrides: {
      reservationId?: string;
      provider?: PaymentProviderCode;
      reservationDate?: string;
      partySize?: number;
      estimatedBill?: number;
    } = {},
  ): Promise<ConciergePaymentFlowResult> {
    const partySize = overrides.partySize || turn.memory.partySize || 2;
    const reservationDate =
      overrides.reservationDate || turn.memory.date || new Date().toISOString().slice(0, 10);
    const provider =
      overrides.provider ||
      this.gateway.getConfig(this.restaurantId).activeProvider ||
      this.defaultProvider;

    const quote = this.gateway.quoteGuarantee(this.defaultGuaranteeRules, {
      partySize,
      reservationDate,
      estimatedBill: overrides.estimatedBill,
    });

    if (!quote.required) {
      return {
        guaranteeRequired: false,
        guaranteeAmount: 0,
        currency: quote.currency,
        provider,
        authorization: null,
        conversationMessage: 'Garanti / provizyon gerekmiyor — rezervasyon devam edebilir.',
        actionResultOk: null,
        providerMessage: 'skipped',
      };
    }

    let actionResultOk: boolean | null = null;
    let reservationId = overrides.reservationId;

    if (reservationId) {
      const action = await this.actions.execute({
        actionId: 'apply_guarantee',
        payload: {
          restaurantId: this.restaurantId,
          reservationId,
          guaranteeAmount: quote.amount,
          partySize,
          date: reservationDate,
        },
        sourceText: turn.assistantMessage?.content || turn.intent.raw,
        tags: ['p8e', 'payment-gateway'],
      });
      actionResultOk = action.ok;
      reservationId = action.reservationId || reservationId;
    }

    const authResult = await this.gateway.authorize({
      restaurantId: this.restaurantId,
      reservationId,
      provider,
      amount: { amount: quote.amount, currency: quote.currency },
      guaranteeRules: this.defaultGuaranteeRules,
      guaranteeContext: {
        partySize,
        reservationDate,
        estimatedBill: overrides.estimatedBill,
      },
      metadata: {
        intentId: turn.intent.id,
        conversationId: turn.conversationId,
        source: 'concierge-payment-bridge',
      },
    });

    const authorization = authResult.authorizationId
      ? this.gateway.store.getAuthorization(authResult.authorizationId)
      : null;

    const conversationMessage = authResult.ok
      ? `Provizyon başlatıldı (${provider}, ${quote.amount} ${quote.currency}). Durum: ${authResult.status}. Rezervasyon onayı için yetkilendirme tamamlandı.`
      : `Provizyon başlatılamadı: ${authResult.message}`;

    return {
      guaranteeRequired: true,
      guaranteeAmount: quote.amount,
      currency: quote.currency,
      provider,
      authorization,
      conversationMessage,
      actionResultOk,
      providerMessage: authResult.message,
    };
  }
}

export function createConciergePaymentBridge(
  options: ConciergePaymentBridgeOptions,
): ConciergePaymentBridge {
  return new ConciergePaymentBridge(options);
}
