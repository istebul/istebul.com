/**
 * Report Engine sabitleri — Architecture Freeze v1.0.
 */

import type { ReportStage } from '../models/ReportStage';

export const REPORT_ENGINE_SCHEMA_VERSION = '1.0.0';

export const REPORT_ENGINE_NAME = 'İSTEBUL Business Report Engine';

export const REPORT_ENGINE_DEFAULT_LOCALE = 'tr' as const;

export const REPORT_PIPELINE_STAGE_IDS: readonly ReportStage[] = Object.freeze([
  'karar-dogrulama',
  'bolum-derleme',
  'kanit-toplama',
  'rapor-birlestirme',
  'rapor-inceleme',
  'rapor-derleme'
]);

export const REPORT_REGISTRY_KIND = Object.freeze({
  report: 'report',
  section: 'section',
  template: 'template',
  reference: 'reference'
} as const);

export type ReportRegistryKind =
  (typeof REPORT_REGISTRY_KIND)[keyof typeof REPORT_REGISTRY_KIND];
