/**
 * İSTEBUL Platform Admin — pipeline aşama kimlikleri (PR-201F).
 */

import type { StageOutcome } from '../../../core/execution/index';

/**
 * End-to-end Platform Admin pipeline aşamaları.
 */
export type PlatformAdminPipelineStage =
  | 'platform-validation'
  | 'foundation'
  | 'tenant'
  | 'users'
  | 'subscriptions'
  | 'system-monitoring'
  | 'summary';

/**
 * Sabit aşama sırası.
 */
export const PLATFORM_ADMIN_PIPELINE_STAGES: readonly PlatformAdminPipelineStage[] =
  Object.freeze([
    'platform-validation',
    'foundation',
    'tenant',
    'users',
    'subscriptions',
    'system-monitoring',
    'summary'
  ]);

/**
 * Validation başarısızsa atlanan aşamalar (summary hariç).
 */
export const PLATFORM_ADMIN_SKIP_ON_VALIDATION_FAILURE: readonly PlatformAdminPipelineStage[] =
  Object.freeze([
    'foundation',
    'tenant',
    'users',
    'subscriptions',
    'system-monitoring'
  ]);

/**
 * Aşama görünen adları.
 */
export const PLATFORM_ADMIN_STAGE_LABELS: Readonly<
  Record<PlatformAdminPipelineStage, string>
> = Object.freeze({
  'platform-validation': 'Platform Validation',
  foundation: 'Foundation',
  tenant: 'Tenant Management',
  users: 'User Management',
  subscriptions: 'Subscription Management',
  'system-monitoring': 'System Monitoring',
  summary: 'Summary'
});

/**
 * Aşama sonucu — shared {@link StageOutcome} (PR-901A).
 */
export type PlatformAdminStageOutcome = StageOutcome;
