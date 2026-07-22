/**
 * İSTEBUL Core — shared E2E summary item prefix (PR-901B).
 *
 * Domain helpers append domain-specific count/flag items after this prefix.
 */

import type { ExecutionSummaryItem } from '../../execution/index';

/**
 * Builds locale + stage-count summary items (admin / identity-access style keys).
 */
export function buildStageCountSummaryItems(
  stageExecutions: readonly { outcome: string }[],
  locale: 'tr' | 'en'
): ExecutionSummaryItem[] {
  const succeeded = stageExecutions.filter(
    (s) => s.outcome === 'succeeded'
  ).length;
  const skipped = stageExecutions.filter((s) => s.outcome === 'skipped').length;
  const failed = stageExecutions.filter((s) => s.outcome === 'failed').length;

  return [
    { key: 'locale', label: 'Locale', value: locale },
    { key: 'stages-succeeded', label: 'Stages Succeeded', value: succeeded },
    { key: 'stages-skipped', label: 'Stages Skipped', value: skipped },
    { key: 'stages-failed', label: 'Stages Failed', value: failed }
  ];
}

/**
 * Builds success + stage-count summary items (auth / tenant integration style keys).
 */
export function buildIntegrationStageSummaryItems(
  pipelineSummary: {
    success: boolean;
    stagesSucceeded: number;
    stagesSkipped: number;
    stagesFailed: number;
  },
  overallSuccess: boolean
): ExecutionSummaryItem[] {
  return [
    {
      key: 'success',
      label: 'Success',
      value: pipelineSummary.success && overallSuccess
    },
    {
      key: 'stagesSucceeded',
      label: 'Stages Succeeded',
      value: pipelineSummary.stagesSucceeded
    },
    {
      key: 'stagesSkipped',
      label: 'Stages Skipped',
      value: pipelineSummary.stagesSkipped
    },
    {
      key: 'stagesFailed',
      label: 'Stages Failed',
      value: pipelineSummary.stagesFailed
    }
  ];
}
