/**
 * Subscription Management Runtime — dışa aktarımlar (PR-201D).
 */

export type {
  SubscriptionStatus,
  SubscriptionPlanId,
  SubscriptionBillingCycle,
  SubscriptionUsageLimits,
  SubscriptionIdentity,
  SubscriptionTenantReference,
  SubscriptionDefinition,
  SubscriptionProjection
} from './Subscription';
export { toSubscriptionProjection } from './Subscription';

export type { SubscriptionManagementContext } from './SubscriptionManagementContext';
export { createSubscriptionManagementContext } from './SubscriptionManagementContext';

export type {
  SubscriptionSummary,
  SubscriptionSummaryItem
} from './SubscriptionSummary';
export {
  buildSubscriptionSummary,
  buildSubscriptionSummaryItems
} from './SubscriptionSummary';

export type {
  SubscriptionManagementValidationIssue,
  SubscriptionManagementTelemetry,
  SubscriptionManagementResult
} from './SubscriptionManagementResult';
export { PIPELINE_BAG_SUBSCRIPTION_MANAGEMENT_RESULT_KEY } from './SubscriptionManagementResult';

export {
  SubscriptionRegistryRuntime,
  createSubscriptionRegistryRuntime
} from './SubscriptionRegistryRuntime';

export {
  SubscriptionManagementRuntime,
  createSubscriptionManagementRuntime
} from './SubscriptionManagementRuntime';

export {
  BUILTIN_SUBSCRIPTION_DEFINITIONS,
  BUILTIN_SUBSCRIPTION_DEFINITION_COUNT,
  getBuiltinSubscriptionDefinition
} from './builtinSubscriptions';

export {
  validateSubscriptionManagementContext,
  resolveRequestedSubscriptions
} from './subscriptionValidation';
