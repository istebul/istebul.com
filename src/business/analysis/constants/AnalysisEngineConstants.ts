/**
 * Architecture Freeze v1.0 — Analysis Engine sabitleri.
 */

import type { AnalysisStage } from '../models/AnalysisStage';

export const ANALYSIS_ENGINE_SCHEMA_VERSION = '1.0.0';

export const ANALYSIS_ENGINE_NAME = 'İSTEBUL Business Analysis Engine';

export const ANALYSIS_ENGINE_DEFAULT_LOCALE = 'tr' as const;

/**
 * Pipeline aşama kimlikleri — merkezi sıra (AnalysisPipeline ile uyumlu).
 */
export const ANALYSIS_PIPELINE_STAGE_IDS: readonly AnalysisStage[] =
  Object.freeze([
    'dataset-dogrulama',
    'kpi-hesaplama',
    'kural-degerlendirme',
    'bulgu-uretimi',
    'ozet-uretimi',
    'sonuc-derleme'
  ]);

export const ANALYSIS_REGISTRY_KIND = Object.freeze({
  analysis: 'analysis',
  rule: 'rule',
  finding: 'finding'
} as const);

export type AnalysisRegistryKind =
  (typeof ANALYSIS_REGISTRY_KIND)[keyof typeof ANALYSIS_REGISTRY_KIND];
