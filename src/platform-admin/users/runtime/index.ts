/**
 * User Management Runtime — dışa aktarımlar (PR-201C).
 */

export type {
  UserStatus,
  UserRole,
  UserIdentity,
  UserTenantReference,
  UserDefinition,
  UserProjection
} from './User';
export { toUserProjection } from './User';

export type { UserManagementContext } from './UserManagementContext';
export { createUserManagementContext } from './UserManagementContext';

export type { UserSummary, UserSummaryItem } from './UserSummary';
export { buildUserSummary, buildUserSummaryItems } from './UserSummary';

export type {
  UserManagementValidationIssue,
  UserManagementTelemetry,
  UserManagementResult
} from './UserManagementResult';
export { PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY } from './UserManagementResult';

export {
  UserRegistryRuntime,
  createUserRegistryRuntime
} from './UserRegistryRuntime';

export {
  UserManagementRuntime,
  createUserManagementRuntime
} from './UserManagementRuntime';

export {
  BUILTIN_USER_DEFINITIONS,
  BUILTIN_USER_DEFINITION_COUNT,
  getBuiltinUserDefinition
} from './builtinUsers';

export {
  validateUserManagementContext,
  resolveRequestedUsers
} from './userValidation';
