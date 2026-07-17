/**
 * Dashboard Engine sabitleri — Architecture Freeze v1.0.
 */

import type { DashboardStage } from '../models/DashboardStage';

export const DASHBOARD_ENGINE_SCHEMA_VERSION = '1.0.0';

export const DASHBOARD_ENGINE_NAME = 'İSTEBUL Business Dashboard Engine';

export const DASHBOARD_ENGINE_DEFAULT_LOCALE = 'tr' as const;

export const DASHBOARD_PIPELINE_STAGE_IDS: readonly DashboardStage[] =
  Object.freeze([
    'dashboard-dogrulama',
    'widget-derleme',
    'yerlesim-cozumu',
    'filtre-cozumu',
    'dashboard-birlestirme',
    'dashboard-derleme'
  ]);

export const DASHBOARD_REGISTRY_KIND = Object.freeze({
  dashboard: 'dashboard',
  widget: 'widget',
  layout: 'layout',
  theme: 'theme'
} as const);

export type DashboardRegistryKind =
  (typeof DASHBOARD_REGISTRY_KIND)[keyof typeof DASHBOARD_REGISTRY_KIND];
