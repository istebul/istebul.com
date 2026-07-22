/**
 * İSTEBUL Identity — SupabaseTenantProvider (EPIC-302B).
 *
 * Tenant Adapter Foundation üzerine ilk gerçek provider.
 * Architecture Freeze — Tenant Isolation Runtime / Identity Runtime
 * değiştirilmez. TenantAdapter interface değiştirilmez.
 * Supabase client dependency injection ile alınır; singleton yoktur.
 * Business Context / RLS / Middleware / API / Dashboard yok.
 */

import type { TenantProvider } from '../../adapters/TenantProvider';
import type { TenantProviderKind } from '../../adapters/TenantProvider';
import type { TenantProviderContext } from '../../adapters/TenantProviderContext';
import type { TenantProviderOperation } from '../../adapters/TenantProviderContext';
import type { TenantProviderResult } from '../../adapters/TenantProviderResult';
import { endStageTimer, startStageTimer } from '../../../runtime/timing';
import {
  AccessDenied,
  MembershipNotFound,
  TenantError,
  TenantNotFound
} from './TenantError';
import { SUPABASE_TENANT_PROVIDER_ID } from './constants';
import {
  assertSupabaseTenantClient,
  type SupabaseAccessCheckLike,
  type SupabaseMembershipRowLike,
  type SupabaseTenantClientLike,
  type SupabaseTenantRowLike
} from './SupabaseTenantClient';
import {
  fromTenantProviderContext,
  validateSupabaseAccessKeys,
  validateSupabaseMembershipLookup,
  validateSupabaseResolveTenantKeys,
  validateSupabaseTenantId,
  type SupabaseTenantContext
} from './SupabaseTenantContext';
import {
  createSupabaseTenantResult,
  statusFromTenantErrorCode,
  toTenantProviderResult,
  type SupabaseMembershipRecord,
  type SupabaseTenantRecord,
  type SupabaseTenantResult
} from './SupabaseTenantResult';
import {
  mapSupabaseTenantError,
  mapUnknownTenantProviderError
} from './supabaseTenantErrorMapping';

/**
 * Provider bağımlılıkları — client DI; singleton yok.
 */
export interface SupabaseTenantProviderDependencies {
  /** Enjekte edilen Supabase Tenant client */
  client: SupabaseTenantClientLike;
  /** Opsiyonel provider kimliği */
  providerId?: string;
  /** Opsiyonel kind (varsayılan registry) */
  kind?: TenantProviderKind;
}

/**
 * Supabase Tenant Provider — TenantProvider port implementasyonu.
 */
export class SupabaseTenantProvider implements TenantProvider {
  readonly id: string;
  readonly kind: TenantProviderKind;
  private readonly client: SupabaseTenantClientLike;

  constructor(deps: SupabaseTenantProviderDependencies) {
    assertSupabaseTenantClient(deps.client);
    this.client = deps.client;
    this.id = deps.providerId ?? SUPABASE_TENANT_PROVIDER_ID;
    this.kind = deps.kind ?? 'registry';
  }

  getClient(): SupabaseTenantClientLike {
    return this.client;
  }

  resolveTenant(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.run('resolveTenant', context, (supabaseContext) =>
      this.executeResolveTenant(supabaseContext)
    );
  }

  getTenant(context: TenantProviderContext): Promise<TenantProviderResult> {
    return this.run('getTenant', context, (supabaseContext) =>
      this.executeGetTenant(supabaseContext)
    );
  }

  listMemberships(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.run('listMemberships', context, (supabaseContext) =>
      this.executeListMemberships(supabaseContext)
    );
  }

  validateAccess(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.run('validateAccess', context, (supabaseContext) =>
      this.executeValidateAccess(supabaseContext)
    );
  }

  refreshTenant(
    context: TenantProviderContext
  ): Promise<TenantProviderResult> {
    return this.run('refreshTenant', context, (supabaseContext) =>
      this.executeRefreshTenant(supabaseContext)
    );
  }

  /**
   * Provider-özel bağlam ile resolve — test / entegrasyon kolaylığı.
   */
  async resolveTenantWithSupabaseContext(
    context: SupabaseTenantContext
  ): Promise<SupabaseTenantResult> {
    return this.executeWithTelemetry('resolveTenant', async () =>
      this.executeResolveTenant(context)
    );
  }

  private async run(
    operation: TenantProviderOperation,
    context: TenantProviderContext,
    executor: (
      supabaseContext: SupabaseTenantContext
    ) => Promise<
      Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'> & {
        telemetry?: SupabaseTenantResult['telemetry'];
      }
    >
  ): Promise<TenantProviderResult> {
    const supabaseContext = fromTenantProviderContext(context);
    const result = await this.executeWithTelemetry(operation, () =>
      executor(supabaseContext)
    );
    return toTenantProviderResult(result);
  }

  private async executeWithTelemetry(
    operation: TenantProviderOperation,
    executor: () => Promise<
      Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'> & {
        telemetry?: SupabaseTenantResult['telemetry'];
      }
    >
  ): Promise<SupabaseTenantResult> {
    const timer = startStageTimer();
    try {
      const partial = await executor();
      const { endedAt, durationMs } = endStageTimer(timer);
      return createSupabaseTenantResult({
        ...partial,
        operation,
        providerId: this.id,
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          operation,
          providerId: this.id
        }
      });
    } catch (error) {
      const mapped = mapUnknownTenantProviderError(error);
      const { endedAt, durationMs } = endStageTimer(timer);
      return createSupabaseTenantResult({
        success: false,
        status: statusFromTenantErrorCode(mapped.code),
        operation,
        providerId: this.id,
        error: { code: mapped.code, message: mapped.message },
        validationIssues: [
          {
            code: mapped.code,
            message: mapped.message,
            severity: 'error'
          }
        ],
        telemetry: {
          durationMs,
          startedAt: timer.startedAt,
          endedAt,
          operation,
          providerId: this.id
        }
      });
    }
  }

  private async executeResolveTenant(
    context: SupabaseTenantContext
  ): Promise<
    Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseResolveTenantKeys(context);
    if (validationMessage) {
      throw new TenantNotFound(validationMessage);
    }

    let row: SupabaseTenantRowLike | null = null;

    try {
      if (context.tenantId) {
        const response = await this.client.tenants.getById(context.tenantId);
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        row = response.data;
      } else if (context.tenantSlug) {
        const response = await this.client.tenants.getBySlug(context.tenantSlug);
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        row = response.data;
      } else if (context.domain) {
        const response = await this.client.tenants.getByDomain(context.domain);
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        row = response.data;
      } else if (context.headerValue) {
        const response = await this.client.tenants.getById(context.headerValue);
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        row = response.data;
      } else if (context.claimValue) {
        const response = await this.client.tenants.getById(context.claimValue);
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        row = response.data;
      } else if (context.membershipId) {
        const membershipResponse = await this.client.memberships.getById(
          context.membershipId
        );
        if (membershipResponse.error) {
          throw mapSupabaseTenantError(membershipResponse.error);
        }
        if (!membershipResponse.data) {
          throw new MembershipNotFound();
        }
        const membership = toSupabaseMembershipRecord(membershipResponse.data);
        const tenantResponse = await this.client.tenants.getById(
          membership.tenantId
        );
        if (tenantResponse.error) {
          throw mapSupabaseTenantError(tenantResponse.error);
        }
        row = tenantResponse.data;
      }
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      throw mapUnknownTenantProviderError(error);
    }

    if (!row) {
      throw new TenantNotFound();
    }

    const tenant = toSupabaseTenantRecord(row);

    return {
      success: true,
      status: 'resolved',
      tenant,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'tenantId', label: 'Tenant ID', value: tenant.id }
      ],
      bag: context.bag
    };
  }

  private async executeGetTenant(
    context: SupabaseTenantContext
  ): Promise<
    Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseTenantId(context);
    if (validationMessage) {
      throw new TenantNotFound(validationMessage);
    }

    let response;
    try {
      response = await this.client.tenants.getById(context.tenantId!);
    } catch (error) {
      throw mapUnknownTenantProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseTenantError(response.error);
    }
    if (!response.data) {
      throw new TenantNotFound();
    }

    const tenant = toSupabaseTenantRecord(response.data);

    return {
      success: true,
      status: 'resolved',
      tenant,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'tenantId', label: 'Tenant ID', value: tenant.id }
      ],
      bag: context.bag
    };
  }

  private async executeListMemberships(
    context: SupabaseTenantContext
  ): Promise<
    Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseMembershipLookup(context);
    if (validationMessage) {
      throw new MembershipNotFound(validationMessage);
    }

    let memberships: SupabaseMembershipRecord[] = [];
    let tenant: SupabaseTenantRecord | undefined;

    try {
      if (context.membershipId) {
        const response = await this.client.memberships.getById(
          context.membershipId
        );
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        if (!response.data) {
          throw new MembershipNotFound();
        }
        memberships = [toSupabaseMembershipRecord(response.data)];
      } else if (context.identityId) {
        const response = await this.client.memberships.listByIdentity(
          context.identityId
        );
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        memberships = (response.data ?? []).map(toSupabaseMembershipRecord);
      } else if (context.tenantId) {
        const response = await this.client.memberships.listByTenant(
          context.tenantId
        );
        if (response.error) {
          throw mapSupabaseTenantError(response.error);
        }
        memberships = (response.data ?? []).map(toSupabaseMembershipRecord);
        const tenantResponse = await this.client.tenants.getById(
          context.tenantId
        );
        if (!tenantResponse.error && tenantResponse.data) {
          tenant = toSupabaseTenantRecord(tenantResponse.data);
        }
      }
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      throw mapUnknownTenantProviderError(error);
    }

    if (memberships.length === 0) {
      throw new MembershipNotFound();
    }

    return {
      success: true,
      status: 'resolved',
      tenant,
      memberships,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        {
          key: 'membershipCount',
          label: 'Membership Count',
          value: memberships.length
        }
      ],
      bag: context.bag
    };
  }

  private async executeValidateAccess(
    context: SupabaseTenantContext
  ): Promise<
    Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseAccessKeys(context);
    if (validationMessage) {
      throw new AccessDenied(validationMessage);
    }

    let response;
    try {
      response = await this.client.memberships.validateAccess({
        identityId: context.identityId!,
        tenantId: context.tenantId!,
        resourceId: context.resourceId
      });
    } catch (error) {
      throw mapUnknownTenantProviderError(error);
    }

    if (response.error) {
      throw mapSupabaseTenantError(response.error);
    }
    if (!response.data) {
      throw new AccessDenied('Erişim doğrulama sonucu yok.');
    }

    const check = response.data;
    const outcome = resolveAccessOutcome(check);
    if (!check.allowed || outcome === 'deny') {
      throw new AccessDenied();
    }

    let tenant: SupabaseTenantRecord | undefined;
    try {
      const tenantResponse = await this.client.tenants.getById(
        context.tenantId!
      );
      if (!tenantResponse.error && tenantResponse.data) {
        tenant = toSupabaseTenantRecord(tenantResponse.data);
      }
    } catch {
      // Tenant fetch is best-effort for access validation success path.
    }

    const allowedTenantIds =
      check.allowedTenantIds ??
      check.allowed_tenant_ids ??
      (context.tenantId ? [context.tenantId] : []);

    return {
      success: true,
      status: 'resolved',
      tenant,
      accessOutcome: outcome,
      accessScope: {
        accessScopeId: `scope-supabase-${context.identityId}-${context.tenantId}`,
        allowedTenantIds: Object.freeze([...allowedTenantIds]),
        crossTenantAllowed: Boolean(
          check.crossTenantAllowed ?? check.cross_tenant_allowed ?? false
        )
      },
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'accessOutcome', label: 'Access Outcome', value: outcome }
      ],
      bag: context.bag
    };
  }

  private async executeRefreshTenant(
    context: SupabaseTenantContext
  ): Promise<
    Omit<SupabaseTenantResult, 'telemetry' | 'operation' | 'providerId'>
  > {
    const validationMessage = validateSupabaseTenantId(context);
    if (validationMessage) {
      throw new TenantNotFound(validationMessage);
    }

    let tenantResponse;
    try {
      tenantResponse = await this.client.tenants.getById(context.tenantId!);
    } catch (error) {
      throw mapUnknownTenantProviderError(error);
    }

    if (tenantResponse.error) {
      throw mapSupabaseTenantError(tenantResponse.error);
    }
    if (!tenantResponse.data) {
      throw new TenantNotFound();
    }

    const tenant = toSupabaseTenantRecord(tenantResponse.data);
    let memberships: SupabaseMembershipRecord[] = [];

    try {
      const membershipResponse = context.identityId
        ? await this.client.memberships.listByIdentity(context.identityId)
        : await this.client.memberships.listByTenant(tenant.id);
      if (membershipResponse.error) {
        throw mapSupabaseTenantError(membershipResponse.error);
      }
      memberships = (membershipResponse.data ?? []).map(
        toSupabaseMembershipRecord
      );
    } catch (error) {
      if (error instanceof TenantError) {
        throw error;
      }
      throw mapUnknownTenantProviderError(error);
    }

    return {
      success: true,
      status: 'resolved',
      tenant,
      memberships,
      validationIssues: [],
      summaryItems: [
        { key: 'provider', label: 'Provider', value: 'supabase' },
        { key: 'refreshed', label: 'Refreshed', value: true },
        { key: 'tenantId', label: 'Tenant ID', value: tenant.id }
      ],
      bag: context.bag
    };
  }
}

function toSupabaseTenantRecord(
  row: SupabaseTenantRowLike
): SupabaseTenantRecord {
  const displayName =
    (typeof row.display_name === 'string' && row.display_name) ||
    (typeof row.displayName === 'string' && row.displayName) ||
    (typeof row.name === 'string' && row.name) ||
    row.slug;

  return {
    id: row.id,
    slug: row.slug,
    displayName,
    domain: row.domain ?? undefined,
    status: row.status ?? undefined
  };
}

function toSupabaseMembershipRecord(
  row: SupabaseMembershipRowLike
): SupabaseMembershipRecord {
  const identityId =
    row.identity_id || row.identityId || row.user_id || '';
  const tenantId = row.tenant_id || row.tenantId || '';
  const roleLabel =
    (typeof row.role_label === 'string' && row.role_label) ||
    (typeof row.roleLabel === 'string' && row.roleLabel) ||
    (typeof row.role === 'string' && row.role) ||
    undefined;

  return {
    id: row.id,
    identityId,
    tenantId,
    roleLabel,
    active: row.active !== false
  };
}

function resolveAccessOutcome(
  check: SupabaseAccessCheckLike
): 'allow' | 'deny' | 'restrict' {
  if (check.outcome === 'allow' || check.outcome === 'deny' || check.outcome === 'restrict') {
    return check.outcome;
  }
  return check.allowed ? 'allow' : 'deny';
}

export function createSupabaseTenantProvider(
  deps: SupabaseTenantProviderDependencies
): SupabaseTenantProvider {
  return new SupabaseTenantProvider(deps);
}

export default SupabaseTenantProvider;
