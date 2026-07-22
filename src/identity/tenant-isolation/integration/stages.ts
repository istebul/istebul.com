/**
 * İSTEBUL Identity — Tenant Integration pipeline stages (EPIC-302E).
 */

import type { StageOutcome } from '../../../core/execution/index';

/**
 * End-to-end Tenant Integration pipeline aşamaları.
 */
export type TenantIntegrationPipelineStage =
  | 'validation'
  | 'tenant-adapter'
  | 'supabase-provider'
  | 'session-bridge'
  | 'business-context-bridge'
  | 'summary';

/**
 * Sabit aşama sırası.
 */
export const TENANT_INTEGRATION_PIPELINE_STAGES: readonly TenantIntegrationPipelineStage[] =
  Object.freeze([
    'validation',
    'tenant-adapter',
    'supabase-provider',
    'session-bridge',
    'business-context-bridge',
    'summary'
  ]);

/**
 * Validation başarısızsa atlanan aşamalar (summary hariç).
 */
export const TENANT_INTEGRATION_SKIP_ON_VALIDATION_FAILURE: readonly TenantIntegrationPipelineStage[] =
  Object.freeze([
    'tenant-adapter',
    'supabase-provider',
    'session-bridge',
    'business-context-bridge'
  ]);

/**
 * Aşama görünen adları.
 */
export const TENANT_INTEGRATION_STAGE_LABELS: Readonly<
  Record<TenantIntegrationPipelineStage, string>
> = Object.freeze({
  validation: 'Validation',
  'tenant-adapter': 'Tenant Adapter',
  'supabase-provider': 'Supabase Tenant Provider',
  'session-bridge': 'Tenant Session Bridge',
  'business-context-bridge': 'Business Context Bridge',
  summary: 'Summary'
});

/**
 * Aşama sonucu — shared {@link StageOutcome} (PR-901A).
 */
export type TenantIntegrationStageOutcome = StageOutcome;
