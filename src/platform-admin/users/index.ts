/**
 * İSTEBUL Platform Admin — User Management (PR-201C).
 *
 * Architecture Freeze v1.0 — additive runtime.
 * PR-201A / PR-201B değiştirilmez.
 * Yalnızca projeksiyon; CRUD, Auth, API, veritabanı yok.
 */

export type {
  UserStatus,
  UserRole,
  UserIdentity,
  UserTenantReference,
  UserDefinition,
  UserProjection,
  UserManagementContext,
  UserSummary,
  UserSummaryItem,
  UserManagementValidationIssue,
  UserManagementTelemetry,
  UserManagementResult
} from './runtime/index';

export {
  toUserProjection,
  createUserManagementContext,
  buildUserSummary,
  buildUserSummaryItems,
  PIPELINE_BAG_USER_MANAGEMENT_RESULT_KEY,
  UserRegistryRuntime,
  createUserRegistryRuntime,
  UserManagementRuntime,
  createUserManagementRuntime,
  BUILTIN_USER_DEFINITIONS,
  BUILTIN_USER_DEFINITION_COUNT,
  getBuiltinUserDefinition,
  validateUserManagementContext,
  resolveRequestedUsers
} from './runtime/index';
