/**
 * İSTEBUL Identity — Authentication Integration pipeline stages (EPIC-301E).
 */

import type { StageOutcome } from '../../../core/execution/index';

/**
 * End-to-end Authentication Integration pipeline aşamaları.
 */
export type AuthenticationIntegrationPipelineStage =
  | 'validation'
  | 'authentication-adapter'
  | 'supabase-provider'
  | 'session-bridge'
  | 'identity-bridge'
  | 'summary';

/**
 * Sabit aşama sırası.
 */
export const AUTHENTICATION_INTEGRATION_PIPELINE_STAGES: readonly AuthenticationIntegrationPipelineStage[] =
  Object.freeze([
    'validation',
    'authentication-adapter',
    'supabase-provider',
    'session-bridge',
    'identity-bridge',
    'summary'
  ]);

/**
 * Validation başarısızsa atlanan aşamalar (summary hariç).
 */
export const AUTHENTICATION_INTEGRATION_SKIP_ON_VALIDATION_FAILURE: readonly AuthenticationIntegrationPipelineStage[] =
  Object.freeze([
    'authentication-adapter',
    'supabase-provider',
    'session-bridge',
    'identity-bridge'
  ]);

/**
 * Aşama görünen adları.
 */
export const AUTHENTICATION_INTEGRATION_STAGE_LABELS: Readonly<
  Record<AuthenticationIntegrationPipelineStage, string>
> = Object.freeze({
  validation: 'Validation',
  'authentication-adapter': 'Authentication Adapter',
  'supabase-provider': 'Supabase Provider',
  'session-bridge': 'Session Bridge',
  'identity-bridge': 'Identity Bridge',
  summary: 'Summary'
});

/**
 * Aşama sonucu — shared {@link StageOutcome} (PR-901A).
 */
export type AuthenticationIntegrationStageOutcome = StageOutcome;
