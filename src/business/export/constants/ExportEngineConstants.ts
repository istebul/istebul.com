/**
 * Export Engine sabitleri — Architecture Freeze v1.0.
 */

import type { ExportStage } from '../models/ExportStatus';

export const EXPORT_ENGINE_SCHEMA_VERSION = '1.0.0';

export const EXPORT_ENGINE_NAME = 'İSTEBUL Business Export Engine';

export const EXPORT_ENGINE_DEFAULT_LOCALE = 'tr' as const;

export const EXPORT_PIPELINE_STAGE_IDS: readonly ExportStage[] = Object.freeze([
  'export-dogrulama',
  'format-cozumu',
  'sablon-cozumu',
  'export-birlestirme',
  'artifact-derleme',
  'export-sonuc'
]);

export const EXPORT_REGISTRY_KIND = Object.freeze({
  export: 'export',
  format: 'format',
  template: 'template',
  artifact: 'artifact'
} as const);

export type ExportRegistryKind =
  (typeof EXPORT_REGISTRY_KIND)[keyof typeof EXPORT_REGISTRY_KIND];
