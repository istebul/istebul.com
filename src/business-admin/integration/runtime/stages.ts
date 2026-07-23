/**
 * İSTEBUL Business Admin — pipeline aşama kimlikleri (PR-202F).
 */

import type { StageOutcome } from '../../../core/execution/index';

/**
 * End-to-end Business Admin pipeline aşamaları.
 */
export type BusinessAdminPipelineStage =
  | 'business-validation'
  | 'foundation'
  | 'dashboard'
  | 'reports'
  | 'exports'
  | 'settings'
  | 'summary';

/**
 * Sabit aşama sırası.
 */
export const BUSINESS_ADMIN_PIPELINE_STAGES: readonly BusinessAdminPipelineStage[] =
  Object.freeze([
    'business-validation',
    'foundation',
    'dashboard',
    'reports',
    'exports',
    'settings',
    'summary'
  ]);

/**
 * Validation başarısızsa atlanan aşamalar (summary hariç).
 */
export const BUSINESS_ADMIN_SKIP_ON_VALIDATION_FAILURE: readonly BusinessAdminPipelineStage[] =
  Object.freeze([
    'foundation',
    'dashboard',
    'reports',
    'exports',
    'settings'
  ]);

/**
 * Aşama görünen adları.
 */
export const BUSINESS_ADMIN_STAGE_LABELS: Readonly<
  Record<BusinessAdminPipelineStage, string>
> = Object.freeze({
  'business-validation': 'Business Validation',
  foundation: 'Foundation',
  dashboard: 'Dashboard Workspace',
  reports: 'Reports Workspace',
  exports: 'Export Workspace',
  settings: 'Business Settings Workspace',
  summary: 'Summary'
});

/**
 * Aşama sonucu — shared {@link StageOutcome} (PR-901A).
 */
export type BusinessAdminStageOutcome = StageOutcome;
