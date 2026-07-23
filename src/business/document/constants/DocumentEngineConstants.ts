/**
 * Document Engine sabitleri — Architecture Freeze v1.0.
 */

import type { DocumentStage } from '../models/DocumentStage';

export const DOCUMENT_ENGINE_SCHEMA_VERSION = '1.0.0';

export const DOCUMENT_ENGINE_NAME = 'İSTEBUL Business Document Engine';

export const DOCUMENT_ENGINE_DEFAULT_LOCALE = 'tr' as const;

export const DOCUMENT_PIPELINE_STAGE_IDS: readonly DocumentStage[] =
  Object.freeze([
    'rapor-dogrulama',
    'yerlesim-derleme',
    'bolum-formatlama',
    'stil-cozumu',
    'dokuman-birlestirme',
    'dokuman-derleme'
  ]);

export const DOCUMENT_REGISTRY_KIND = Object.freeze({
  document: 'document',
  layout: 'layout',
  style: 'style',
  theme: 'theme'
} as const);

export type DocumentRegistryKind =
  (typeof DOCUMENT_REGISTRY_KIND)[keyof typeof DOCUMENT_REGISTRY_KIND];
