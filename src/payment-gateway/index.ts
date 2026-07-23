/**
 * GarsonAI — P8-E Payment Gateway Integration
 *
 * Prepares real payment providers (Stripe / iyzico / PayTR / Mock) via Strategy Pattern.
 * Built additively on P8-A AI Core, P8-B Knowledge Graph, P8-C Concierge, P8-D Action Engine.
 *
 * No live provider API keys required in this phase. Mock executes authorize/capture/release/refund locally.
 */

export type {
  PaymentProviderCode,
  PaymentMode,
  AuthorizationStatus,
  GuaranteeRuleKind,
  MoneyAmount,
  PaymentGatewayConfig,
  GuaranteeRuleInput,
  GuaranteeQuote,
  PaymentAuthorization,
  SettlementRecord,
  ProviderOperationResult,
  WebhookEnvelope,
  WebhookParseResult,
  ProviderEventRecord,
} from './types.ts';

export {
  AUTHORIZATION_STATUSES,
  PAYMENT_PROVIDER_CODES,
} from './types.ts';

export type {
  PaymentGatewayProvider,
  GatewayAuthorizeRequest,
  GatewayCaptureRequest,
  GatewayReleaseRequest,
  GatewayRefundRequest,
} from './providers/types.ts';

export { BasePaymentGatewayProvider } from './providers/BasePaymentGatewayProvider.ts';
export { MockGatewayProvider } from './providers/MockGatewayProvider.ts';
export { StripeGatewayProvider } from './providers/StripeGatewayProvider.ts';
export { IyzicoGatewayProvider } from './providers/IyzicoGatewayProvider.ts';
export { PayTRGatewayProvider } from './providers/PayTRGatewayProvider.ts';
export {
  getPaymentGatewayProvider,
  listPaymentGatewayProviders,
  isPaymentProviderCode,
} from './providers/provider-factory.ts';

export {
  calculateGuaranteeQuote,
  guaranteeRequired,
  type GuaranteeContext,
} from './guarantee/GuaranteeCalculator.ts';

export {
  canTransition,
  assertTransition,
  lifecycleOrder,
} from './lifecycle/PaymentLifecycle.ts';

export { GatewayConfigStore } from './config/GatewayConfigStore.ts';
export { InMemoryAuthorizationStore } from './stores/InMemoryAuthorizationStore.ts';

export {
  createCheckInHold,
  createBillCloseSettlement,
  type CheckInHoldInput,
  type BillCloseInput,
} from './checkin/CheckInSettlement.ts';

export type { ProviderWebhookHandler } from './webhooks/types.ts';
export { ProviderWebhookRouter } from './webhooks/ProviderWebhookRouter.ts';
export { StripeWebhookHandler } from './webhooks/StripeWebhookHandler.ts';
export { IyzicoWebhookHandler } from './webhooks/IyzicoWebhookHandler.ts';
export { PayTRWebhookHandler } from './webhooks/PayTRWebhookHandler.ts';

export { paymentGatewayRealtimeChannel } from './realtime/channels.ts';

export {
  PaymentGatewayService,
  createPaymentGateway,
  type CreatePaymentGatewayOptions,
  type StartAuthorizationInput,
} from './services/PaymentGatewayService.ts';

export {
  ConciergePaymentBridge,
  createConciergePaymentBridge,
  type ConciergePaymentBridgeOptions,
  type ConciergePaymentFlowResult,
} from './services/ConciergePaymentBridge.ts';
