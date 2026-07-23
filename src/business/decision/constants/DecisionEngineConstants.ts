/**
 * Architecture Freeze v1.0 — Decision Engine sabitleri.
 */

import type { DecisionStage } from '../models/DecisionStage';

export const DECISION_ENGINE_SCHEMA_VERSION = '1.0.0';

export const DECISION_ENGINE_NAME = 'İSTEBUL Business Decision Engine';

export const DECISION_ENGINE_DEFAULT_LOCALE = 'tr' as const;

export const DECISION_PIPELINE_STAGE_IDS: readonly DecisionStage[] =
  Object.freeze([
    'analiz-sonuc-dogrulama',
    'risk-degerlendirme',
    'firsat-degerlendirme',
    'oneri-olusturma',
    'oncelik-hesaplama',
    'karar-derleme'
  ]);

export const DECISION_REGISTRY_KIND = Object.freeze({
  decision: 'decision',
  recommendation: 'recommendation',
  risk: 'risk',
  strategy: 'strategy'
} as const);

export type DecisionRegistryKind =
  (typeof DECISION_REGISTRY_KIND)[keyof typeof DECISION_REGISTRY_KIND];
