/**
 * İSTEBUL Identity — tenant isolation doğrulama (PR-203E).
 *
 * Pipeline aşaması 1: Validation.
 * Yalnızca bağlam doğrulaması — Supabase RLS / DB / API / Middleware yok.
 */

import type { TenantIsolationContext } from './TenantIsolationContext';
import type { TenantIsolationValidationIssue } from './TenantIsolationResult';
import type { TenantIsolationModule } from './TenantIsolationModule';
import type { TenantIsolationRegistry } from './TenantIsolationRegistry';
import type { IdentityProjection } from '../../runtime/IdentityModule';
import type { AuthenticationProjection } from '../../authentication/runtime/AuthenticationModule';
import type { SessionProjection } from '../../session/runtime/SessionModule';
import type { AuthorizationProjection } from '../../authorization/runtime/AuthorizationModule';

const VALID_LOCALES = new Set<string>(['tr', 'en']);
const VALID_OUTCOMES = new Set<string>(['allow', 'deny', 'restrict']);

/**
 * Tenant Isolation bağlamını doğrular.
 */
export function validateTenantIsolationContext(
  context: TenantIsolationContext,
  registry: TenantIsolationRegistry
): readonly TenantIsolationValidationIssue[] {
  const issues: TenantIsolationValidationIssue[] = [];

  if (!VALID_LOCALES.has(context.locale)) {
    issues.push({
      code: 'INVALID_LOCALE',
      message: `Geçersiz locale: ${String(context.locale)}`,
      severity: 'error'
    });
  }

  if (context.identityResult !== undefined) {
    const identity = context.identityResult;
    if (!identity.summary || typeof identity.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_IDENTITY_RESULT',
        message: 'identityResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!identity.summary.success) {
      issues.push({
        code: 'IDENTITY_NOT_SUCCESS',
        message:
          'Upstream IdentityResult başarısız; tenant isolation projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(identity.identities)) {
      issues.push({
        code: 'INVALID_IDENTITY_PROJECTIONS',
        message: 'identityResult.identities bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.authenticationResult !== undefined) {
    const authentication = context.authenticationResult;
    if (
      !authentication.summary ||
      typeof authentication.summary.success !== 'boolean'
    ) {
      issues.push({
        code: 'INVALID_AUTHENTICATION_RESULT',
        message: 'authenticationResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!authentication.summary.success) {
      issues.push({
        code: 'AUTHENTICATION_NOT_SUCCESS',
        message:
          'Upstream AuthenticationResult başarısız; tenant isolation projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(authentication.authentications)) {
      issues.push({
        code: 'INVALID_AUTHENTICATION_PROJECTIONS',
        message: 'authenticationResult.authentications bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.sessionResult !== undefined) {
    const session = context.sessionResult;
    if (!session.summary || typeof session.summary.success !== 'boolean') {
      issues.push({
        code: 'INVALID_SESSION_RESULT',
        message: 'sessionResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!session.summary.success) {
      issues.push({
        code: 'SESSION_NOT_SUCCESS',
        message:
          'Upstream SessionResult başarısız; tenant isolation projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(session.sessions)) {
      issues.push({
        code: 'INVALID_SESSION_PROJECTIONS',
        message: 'sessionResult.sessions bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.authorizationResult !== undefined) {
    const authorization = context.authorizationResult;
    if (
      !authorization.summary ||
      typeof authorization.summary.success !== 'boolean'
    ) {
      issues.push({
        code: 'INVALID_AUTHORIZATION_RESULT',
        message: 'authorizationResult.summary.success zorunludur.',
        severity: 'error'
      });
    } else if (!authorization.summary.success) {
      issues.push({
        code: 'AUTHORIZATION_NOT_SUCCESS',
        message:
          'Upstream AuthorizationResult başarısız; tenant isolation projection devam eder.',
        severity: 'warning'
      });
    }
    if (!Array.isArray(authorization.authorizations)) {
      issues.push({
        code: 'INVALID_AUTHORIZATION_PROJECTIONS',
        message: 'authorizationResult.authorizations bir dizi olmalıdır.',
        severity: 'error'
      });
    }
  }

  if (context.isolationIds !== undefined) {
    if (!Array.isArray(context.isolationIds)) {
      issues.push({
        code: 'INVALID_ISOLATION_IDS',
        message: 'isolationIds bir dizi olmalıdır.',
        severity: 'error'
      });
    } else if (context.isolationIds.length === 0) {
      issues.push({
        code: 'EMPTY_ISOLATION_IDS',
        message:
          'isolationIds boş olamaz; tüm kayıtlar için undefined kullanın.',
        severity: 'warning'
      });
    } else {
      const seen = new Set<string>();
      for (const isolationId of context.isolationIds) {
        if (typeof isolationId !== 'string' || isolationId.trim() === '') {
          issues.push({
            code: 'INVALID_ISOLATION_ID',
            message: 'Geçersiz isolation kimliği.',
            severity: 'error'
          });
          continue;
        }
        if (seen.has(isolationId)) {
          issues.push({
            code: 'DUPLICATE_ISOLATION_ID',
            message: `Yinelenen isolation kimliği: ${isolationId}`,
            severity: 'warning'
          });
        }
        seen.add(isolationId);
        if (!registry.getById(isolationId)) {
          issues.push({
            code: 'UNKNOWN_ISOLATION_ID',
            message: `Kayıtlı olmayan isolation: ${isolationId}`,
            severity: 'warning'
          });
        }
      }
    }
  }

  if (context.tenantId !== undefined) {
    if (
      typeof context.tenantId !== 'string' ||
      context.tenantId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_TENANT_ID',
        message: 'tenantId boş string olamaz.',
        severity: 'error'
      });
    } else if (registry.getByTenantId(context.tenantId).length === 0) {
      issues.push({
        code: 'UNKNOWN_TENANT_ID',
        message: `Kayıtlı isolation’ı olmayan tenant: ${context.tenantId}`,
        severity: 'warning'
      });
    }
  }

  if (context.identityId !== undefined) {
    if (
      typeof context.identityId !== 'string' ||
      context.identityId.trim() === ''
    ) {
      issues.push({
        code: 'EMPTY_IDENTITY_ID',
        message: 'identityId boş string olamaz.',
        severity: 'error'
      });
    } else if (registry.getByIdentityId(context.identityId).length === 0) {
      issues.push({
        code: 'UNKNOWN_IDENTITY_ID',
        message: `Kayıtlı isolation’ı olmayan identity: ${context.identityId}`,
        severity: 'warning'
      });
    }
  }

  if (
    context.decisionOutcome !== undefined &&
    !VALID_OUTCOMES.has(context.decisionOutcome)
  ) {
    issues.push({
      code: 'INVALID_DECISION_OUTCOME',
      message: `Geçersiz decision outcome: ${String(context.decisionOutcome)}`,
      severity: 'error'
    });
  }

  if (context.actorId !== undefined && context.actorId.trim() === '') {
    issues.push({
      code: 'EMPTY_ACTOR_ID',
      message: 'actorId boş string olamaz.',
      severity: 'warning'
    });
  }

  return Object.freeze(issues);
}

export function resolveTenantIsolationIdentityProjections(
  context: TenantIsolationContext
): readonly IdentityProjection[] {
  if (!context.identityResult?.identities) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.identityResult.identities]);
}

export function resolveTenantIsolationAuthenticationProjections(
  context: TenantIsolationContext
): readonly AuthenticationProjection[] {
  if (!context.authenticationResult?.authentications) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.authenticationResult.authentications]);
}

export function resolveTenantIsolationSessionProjections(
  context: TenantIsolationContext
): readonly SessionProjection[] {
  if (!context.sessionResult?.sessions) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.sessionResult.sessions]);
}

export function resolveTenantIsolationAuthorizationProjections(
  context: TenantIsolationContext
): readonly AuthorizationProjection[] {
  if (!context.authorizationResult?.authorizations) {
    return Object.freeze([]);
  }
  return Object.freeze([...context.authorizationResult.authorizations]);
}

/**
 * İstenen isolation kimliklerini kayıtlı kayıtlarla eşleştirir.
 */
export function resolveRequestedIsolations(
  context: TenantIsolationContext,
  registry: TenantIsolationRegistry
): {
  isolations: readonly TenantIsolationModule[];
  requestedCount: number;
  unavailableCount: number;
} {
  let pool = registry.getAll();

  if (context.tenantId && context.tenantId.trim() !== '') {
    pool = registry.getByTenantId(context.tenantId);
  }

  if (context.identityId && context.identityId.trim() !== '') {
    pool = Object.freeze(
      pool.filter(
        (item) =>
          item.primaryIdentityId === context.identityId ||
          item.memberships.some((m) => m.identityId === context.identityId)
      )
    );
  }

  if (context.decisionOutcome) {
    pool = Object.freeze(
      pool.filter((item) =>
        item.decisions.some(
          (decision) => decision.outcome === context.decisionOutcome
        )
      )
    );
  }

  if (
    context.identityResult?.identities &&
    context.identityResult.identities.length > 0 &&
    !context.isolationIds
  ) {
    const allowed = new Set(
      context.identityResult.identities.map((item) => item.identityId)
    );
    pool = Object.freeze(
      pool.filter(
        (item) =>
          (item.primaryIdentityId !== undefined &&
            allowed.has(item.primaryIdentityId)) ||
          item.memberships.some((m) => allowed.has(m.identityId))
      )
    );
  }

  if (
    context.authorizationResult?.authorizations &&
    context.authorizationResult.authorizations.length > 0 &&
    !context.isolationIds
  ) {
    const allowed = new Set(
      context.authorizationResult.authorizations.map(
        (item) => item.authorizationId
      )
    );
    pool = Object.freeze(
      pool.filter(
        (item) =>
          item.authorizationId !== undefined &&
          allowed.has(item.authorizationId)
      )
    );
  }

  if (
    context.sessionResult?.sessions &&
    context.sessionResult.sessions.length > 0 &&
    !context.isolationIds
  ) {
    const allowed = new Set(
      context.sessionResult.sessions.map((item) => item.sessionId)
    );
    pool = Object.freeze(
      pool.filter(
        (item) => item.sessionId !== undefined && allowed.has(item.sessionId)
      )
    );
  }

  if (!context.isolationIds || context.isolationIds.length === 0) {
    return {
      isolations: pool,
      requestedCount: pool.length,
      unavailableCount: 0
    };
  }

  const requestedIds = context.isolationIds;
  const resolved = requestedIds
    .map((id) => registry.getById(id))
    .filter((item): item is TenantIsolationModule => item !== undefined)
    .filter((item) => {
      if (
        context.tenantId &&
        item.tenantIdentity.tenantId !== context.tenantId
      ) {
        return false;
      }
      if (
        context.identityId &&
        item.primaryIdentityId !== context.identityId &&
        !item.memberships.some((m) => m.identityId === context.identityId)
      ) {
        return false;
      }
      if (
        context.decisionOutcome &&
        !item.decisions.some(
          (decision) => decision.outcome === context.decisionOutcome
        )
      ) {
        return false;
      }
      return true;
    });

  return {
    isolations: Object.freeze(resolved),
    requestedCount: requestedIds.length,
    unavailableCount: requestedIds.length - resolved.length
  };
}
