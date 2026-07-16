import { createBillCloseSettlement, createCheckInHold } from '../checkin/CheckInSettlement.ts';
import { GatewayConfigStore } from '../config/GatewayConfigStore.ts';
import {
  calculateGuaranteeQuote,
  type GuaranteeContext,
} from '../guarantee/GuaranteeCalculator.ts';
import { assertTransition } from '../lifecycle/PaymentLifecycle.ts';
import { getPaymentGatewayProvider } from '../providers/provider-factory.ts';
import { InMemoryAuthorizationStore } from '../stores/InMemoryAuthorizationStore.ts';
import type {
  GuaranteeRuleInput,
  MoneyAmount,
  PaymentAuthorization,
  PaymentGatewayConfig,
  PaymentProviderCode,
  ProviderOperationResult,
  SettlementRecord,
  WebhookEnvelope,
  WebhookParseResult,
} from '../types.ts';
import { ProviderWebhookRouter } from '../webhooks/ProviderWebhookRouter.ts';

function newAuthId(): string {
  return `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stamp(): string {
  return new Date().toISOString();
}

export interface CreatePaymentGatewayOptions {
  configStore?: GatewayConfigStore;
  store?: InMemoryAuthorizationStore;
  webhookRouter?: ProviderWebhookRouter;
}

export interface StartAuthorizationInput {
  restaurantId: string;
  reservationId?: string;
  amount?: MoneyAmount;
  provider?: PaymentProviderCode;
  guaranteeRules?: GuaranteeRuleInput | GuaranteeRuleInput[];
  guaranteeContext?: GuaranteeContext;
  metadata?: Record<string, unknown>;
}

/**
 * Orchestrates config → provider strategy → authorization lifecycle.
 * Mock provider executes locally; other providers stay architecture-only stubs.
 */
export class PaymentGatewayService {
  readonly configs: GatewayConfigStore;
  readonly store: InMemoryAuthorizationStore;
  readonly webhooks: ProviderWebhookRouter;

  constructor(options: CreatePaymentGatewayOptions = {}) {
    this.configs = options.configStore || new GatewayConfigStore();
    this.store = options.store || new InMemoryAuthorizationStore();
    this.webhooks = options.webhookRouter || new ProviderWebhookRouter();
  }

  getConfig(restaurantId: string): PaymentGatewayConfig {
    return this.configs.ensureDefault(restaurantId);
  }

  setConfig(
    restaurantId: string,
    patch: Partial<{
      activeProvider: PaymentProviderCode;
      mode: PaymentGatewayConfig['mode'];
      webhookSecret: string;
      merchantId: string;
      providerMetadata: Record<string, unknown>;
      enabled: boolean;
    }>,
  ): PaymentGatewayConfig {
    return this.configs.upsert({ restaurantId, ...patch });
  }

  quoteGuarantee(
    rules: GuaranteeRuleInput | GuaranteeRuleInput[],
    context: GuaranteeContext,
  ) {
    return calculateGuaranteeQuote(rules, context);
  }

  async authorize(input: StartAuthorizationInput): Promise<ProviderOperationResult> {
    const config = this.getConfig(input.restaurantId);
    if (!config.enabled) {
      return {
        ok: false,
        provider: config.activeProvider,
        status: 'cancelled',
        providerTransactionId: null,
        message: 'Payment gateway disabled for restaurant',
        remoteCallAttempted: false,
      };
    }

    const providerCode = input.provider || config.activeProvider;
    const quote =
      input.guaranteeRules && input.guaranteeContext
        ? this.quoteGuarantee(input.guaranteeRules, input.guaranteeContext)
        : null;

    const amount: MoneyAmount =
      input.amount ||
      (quote
        ? { amount: quote.amount, currency: quote.currency }
        : { amount: 0, currency: 'TRY' });

    if (amount.amount <= 0) {
      return {
        ok: false,
        provider: providerCode,
        status: 'cancelled',
        providerTransactionId: null,
        message: 'Authorization amount must be > 0 (guarantee not required or amount missing)',
        remoteCallAttempted: false,
      };
    }

    const pending: PaymentAuthorization = {
      id: newAuthId(),
      restaurantId: input.restaurantId,
      reservationId: input.reservationId,
      provider: providerCode,
      mode: config.mode,
      status: 'pending',
      amount,
      providerTransactionId: null,
      guaranteeQuote: quote || undefined,
      metadata: { ...(input.metadata || {}) },
      createdAt: stamp(),
      updatedAt: stamp(),
    };
    this.store.saveAuthorization(pending);

    const provider = getPaymentGatewayProvider(providerCode);
    const result = await provider.authorize({
      restaurantId: input.restaurantId,
      reservationId: input.reservationId,
      amount,
      metadata: input.metadata,
    });

    if (!result.ok) {
      const failed = {
        ...pending,
        status: 'cancelled' as const,
        updatedAt: stamp(),
        cancelledAt: stamp(),
        metadata: { ...pending.metadata, providerMessage: result.message },
      };
      this.store.saveAuthorization(failed);
      return { ...result, authorizationId: pending.id };
    }

    assertTransition('pending', 'authorized');
    const authorized: PaymentAuthorization = {
      ...pending,
      status: 'authorized',
      providerTransactionId: result.providerTransactionId,
      authorizedAt: stamp(),
      updatedAt: stamp(),
    };
    this.store.saveAuthorization(authorized);
    return { ...result, authorizationId: authorized.id, status: 'authorized' };
  }

  async capture(authorizationId: string, amount?: MoneyAmount): Promise<ProviderOperationResult> {
    const auth = this.store.getAuthorization(authorizationId);
    if (!auth) {
      return {
        ok: false,
        provider: 'mock',
        status: 'cancelled',
        providerTransactionId: null,
        message: 'Authorization not found',
        remoteCallAttempted: false,
      };
    }
    assertTransition(auth.status, 'captured');
    if (!auth.providerTransactionId) {
      return {
        ok: false,
        provider: auth.provider,
        status: auth.status,
        providerTransactionId: null,
        message: 'Missing providerTransactionId',
        remoteCallAttempted: false,
        authorizationId,
      };
    }

    const provider = getPaymentGatewayProvider(auth.provider);
    const result = await provider.capture({
      restaurantId: auth.restaurantId,
      providerTransactionId: auth.providerTransactionId,
      amount: amount || auth.amount,
    });
    if (!result.ok) return { ...result, authorizationId };

    const next: PaymentAuthorization = {
      ...auth,
      status: 'captured',
      capturedAt: stamp(),
      updatedAt: stamp(),
    };
    this.store.saveAuthorization(next);
    return { ...result, authorizationId, status: 'captured' };
  }

  async release(authorizationId: string): Promise<ProviderOperationResult> {
    const auth = this.store.getAuthorization(authorizationId);
    if (!auth) {
      return {
        ok: false,
        provider: 'mock',
        status: 'cancelled',
        providerTransactionId: null,
        message: 'Authorization not found',
        remoteCallAttempted: false,
      };
    }
    assertTransition(auth.status, 'released');
    if (!auth.providerTransactionId) {
      return {
        ok: false,
        provider: auth.provider,
        status: auth.status,
        providerTransactionId: null,
        message: 'Missing providerTransactionId',
        remoteCallAttempted: false,
        authorizationId,
      };
    }

    const provider = getPaymentGatewayProvider(auth.provider);
    const result = await provider.release({
      restaurantId: auth.restaurantId,
      providerTransactionId: auth.providerTransactionId,
    });
    if (!result.ok) return { ...result, authorizationId };

    const next: PaymentAuthorization = {
      ...auth,
      status: 'released',
      releasedAt: stamp(),
      updatedAt: stamp(),
    };
    this.store.saveAuthorization(next);
    return { ...result, authorizationId, status: 'released' };
  }

  async refund(authorizationId: string, amount?: MoneyAmount, reason?: string): Promise<ProviderOperationResult> {
    const auth = this.store.getAuthorization(authorizationId);
    if (!auth) {
      return {
        ok: false,
        provider: 'mock',
        status: 'cancelled',
        providerTransactionId: null,
        message: 'Authorization not found',
        remoteCallAttempted: false,
      };
    }
    assertTransition(auth.status, 'refunded');
    if (!auth.providerTransactionId) {
      return {
        ok: false,
        provider: auth.provider,
        status: auth.status,
        providerTransactionId: null,
        message: 'Missing providerTransactionId',
        remoteCallAttempted: false,
        authorizationId,
      };
    }

    const provider = getPaymentGatewayProvider(auth.provider);
    const result = await provider.refund({
      restaurantId: auth.restaurantId,
      providerTransactionId: auth.providerTransactionId,
      amount: amount || auth.amount,
      reason,
    });
    if (!result.ok) return { ...result, authorizationId };

    const next: PaymentAuthorization = {
      ...auth,
      status: 'refunded',
      refundedAt: stamp(),
      updatedAt: stamp(),
    };
    this.store.saveAuthorization(next);
    return { ...result, authorizationId, status: 'refunded' };
  }

  onCheckIn(authorizationId: string): SettlementRecord | null {
    const auth = this.store.getAuthorization(authorizationId);
    if (!auth) return null;
    const hold = createCheckInHold({
      restaurantId: auth.restaurantId,
      authorization: auth,
    });
    return this.store.saveSettlement(hold);
  }

  onBillClose(authorizationId: string, totalBill: number): SettlementRecord | null {
    const auth = this.store.getAuthorization(authorizationId);
    if (!auth) return null;
    const settlement = createBillCloseSettlement({
      restaurantId: auth.restaurantId,
      authorization: auth,
      totalBill,
    });
    return this.store.saveSettlement(settlement);
  }

  parseWebhook(
    restaurantId: string,
    envelope: WebhookEnvelope,
  ): WebhookParseResult {
    const parsed = this.webhooks.route(envelope);
    this.store.recordEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      restaurantId,
      provider: envelope.provider,
      eventType: parsed.eventType,
      eventId: parsed.eventId,
      payload: envelope.payload,
      createdAt: stamp(),
    });
    return parsed;
  }
}

export function createPaymentGateway(
  options: CreatePaymentGatewayOptions = {},
): PaymentGatewayService {
  return new PaymentGatewayService(options);
}
