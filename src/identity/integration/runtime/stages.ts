/**
 * İSTEBUL Identity — pipeline aşama kimlikleri (PR-203F).
 */

/**
 * End-to-end Identity & Access pipeline aşamaları.
 */
export type IdentityAccessPipelineStage =
  | 'validation'
  | 'identity'
  | 'authentication'
  | 'session'
  | 'authorization'
  | 'tenant-isolation'
  | 'summary';

/**
 * Sabit aşama sırası.
 */
export const IDENTITY_ACCESS_PIPELINE_STAGES: readonly IdentityAccessPipelineStage[] =
  Object.freeze([
    'validation',
    'identity',
    'authentication',
    'session',
    'authorization',
    'tenant-isolation',
    'summary'
  ]);

/**
 * Validation başarısızsa atlanan aşamalar (summary hariç).
 */
export const IDENTITY_ACCESS_SKIP_ON_VALIDATION_FAILURE: readonly IdentityAccessPipelineStage[] =
  Object.freeze([
    'identity',
    'authentication',
    'session',
    'authorization',
    'tenant-isolation'
  ]);

/**
 * Aşama görünen adları.
 */
export const IDENTITY_ACCESS_STAGE_LABELS: Readonly<
  Record<IdentityAccessPipelineStage, string>
> = Object.freeze({
  validation: 'Validation',
  identity: 'Identity Projection',
  authentication: 'Authentication Projection',
  session: 'Session Projection',
  authorization: 'Authorization Projection',
  'tenant-isolation': 'Tenant Isolation Projection',
  summary: 'Summary'
});

/**
 * Aşama sonucu.
 */
export type IdentityAccessStageOutcome =
  | 'succeeded'
  | 'failed'
  | 'skipped';
