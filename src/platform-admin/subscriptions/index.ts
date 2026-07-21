/**
 * İSTEBUL Platform Admin — Subscription Management (PR-201D).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * PR-201A / PR-201B / PR-201C değiştirilmez.
 * Yalnızca projeksiyon; Payment, Billing, API, veritabanı yok.
 */

export type {
  SubscriptionStatus,
  SubscriptionPlanId,
  SubscriptionBillingCycle,
  SubscriptionUsageLimits,
  SubscriptionIdentity,
  SubscriptionTenantReference,
  SubscriptionDefinition,
  SubscriptionProjection,
  SubscriptionManagementContext,
  SubscriptionSummary,
  SubscriptionSummaryItem,
  SubscriptionManagementValidationIssue,
  SubscriptionManagementTelemetry,
  SubscriptionManagementResult
} from './runtime/index';

export {
  toSubscriptionProjection,
  createSubscriptionManagementContext,
  buildSubscriptionSummary,
  buildSubscriptionSummaryItems,
  PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY,
  SubscriptionRegistryRuntime,
  createSubscriptionRegistryRuntime,
  SubscriptionManagementRuntime,
  createSubscriptionManagementRuntime,
  BUILTIN_SUBSCRIPTION_DEFINITIONS,
  BUILTIN_SUBSCRIPTION_DEFINITION_COUNT,
  getBuiltinSubscriptionDefinition,
  validateSubscriptionManagementContext,
  resolveRequestedSubscriptions
} from './runtime/index';
