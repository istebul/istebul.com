/**
 * İSTEBUL Business Admin — Dashboard Workspace widget modeli (PR-202B).
 *
 * Projection-only iskelet. CRUD / API / DB / Charts yok.
 */

/**
 * Workspace widget kimlikleri.
 */
export type DashboardWorkspaceWidgetId =
  | 'overview'
  | 'kpi-cards'
  | 'recent-analysis'
  | 'recent-decisions'
  | 'recent-reports'
  | 'recent-exports'
  | 'execution-summary';

/**
 * Widget görsel türü — UI iskeleti için.
 */
export type DashboardWorkspaceWidgetKind =
  | 'overview'
  | 'kpi-cards'
  | 'list'
  | 'summary';

/**
 * Widget durumu.
 */
export type DashboardWorkspaceWidgetStatus = 'active' | 'coming-soon';

/**
 * Registry kaydı — yerleşik workspace widget tanımı.
 */
export interface DashboardWorkspaceWidgetDefinition {
  id: DashboardWorkspaceWidgetId;
  name: string;
  description: string;
  order: number;
  kind: DashboardWorkspaceWidgetKind;
  status: DashboardWorkspaceWidgetStatus;
  /** Varsayılan görünürlük */
  visible: boolean;
}

/**
 * Liste öğesi projeksiyonu.
 */
export interface DashboardWorkspaceListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
}

/**
 * KPI kart projeksiyonu.
 */
export interface DashboardWorkspaceKpiProjection {
  kpiId: string;
  name: string;
  unit: string;
  value: string | number | null;
  trendLabel?: string;
}

/**
 * Overview projeksiyonu.
 */
export interface DashboardWorkspaceOverviewProjection {
  dashboardId: string;
  title: string;
  description?: string;
  status: string;
  lastStage: string;
  locale: 'tr' | 'en';
  version: string;
  sectionCount: number;
  widgetCount: number;
  kpiCount: number;
}

/**
 * Execution Summary projeksiyonu.
 */
export interface DashboardWorkspaceExecutionProjection {
  status: string;
  lastStage: string;
  sectionCount: number;
  widgetCount: number;
  kpiCount: number;
  hasDashboardResult: boolean;
}

/**
 * Widget projeksiyonu — runtime çıktısı.
 */
export interface DashboardWorkspaceWidgetProjection {
  widgetId: DashboardWorkspaceWidgetId;
  name: string;
  description: string;
  kind: DashboardWorkspaceWidgetKind;
  status: DashboardWorkspaceWidgetStatus;
  visible: boolean;
  order: number;
  title: string;
  itemCount: number;
  items: readonly DashboardWorkspaceListItem[];
  kpis: readonly DashboardWorkspaceKpiProjection[];
  overview?: DashboardWorkspaceOverviewProjection;
  execution?: DashboardWorkspaceExecutionProjection;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı boş/iskelet projeksiyona dönüştürür.
 */
export function toEmptyWidgetProjection(
  definition: DashboardWorkspaceWidgetDefinition
): DashboardWorkspaceWidgetProjection {
  return {
    widgetId: definition.id,
    name: definition.name,
    description: definition.description,
    kind: definition.kind,
    status: definition.status,
    visible: definition.visible && definition.status === 'active',
    order: definition.order,
    title: definition.name,
    itemCount: 0,
    items: Object.freeze([]),
    kpis: Object.freeze([]),
    projected: true
  };
}
