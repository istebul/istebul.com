/**
 * İSTEBUL Business Admin — Reports Workspace widget modeli (PR-202C).
 *
 * Projection-only iskelet. CRUD / API / DB / Realtime / Export yok.
 */

/**
 * Workspace widget kimlikleri.
 */
export type ReportsWorkspaceWidgetId =
  | 'reports-overview'
  | 'recent-reports'
  | 'report-categories'
  | 'report-details'
  | 'report-status'
  | 'execution-summary';

/**
 * Widget görsel türü — UI iskeleti için.
 */
export type ReportsWorkspaceWidgetKind =
  | 'overview'
  | 'list'
  | 'categories'
  | 'detail'
  | 'status'
  | 'summary';

/**
 * Widget durumu.
 */
export type ReportsWorkspaceWidgetStatus = 'active' | 'coming-soon';

/**
 * Registry kaydı — yerleşik workspace widget tanımı.
 */
export interface ReportsWorkspaceWidgetDefinition {
  id: ReportsWorkspaceWidgetId;
  name: string;
  description: string;
  order: number;
  kind: ReportsWorkspaceWidgetKind;
  status: ReportsWorkspaceWidgetStatus;
  /** Varsayılan görünürlük */
  visible: boolean;
}

/**
 * Liste / kategori öğesi projeksiyonu.
 */
export interface ReportsWorkspaceListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  category?: string;
}

/**
 * Overview projeksiyonu.
 */
export interface ReportsWorkspaceOverviewProjection {
  reportId: string;
  title: string;
  description?: string;
  status: string;
  lastStage: string;
  locale: 'tr' | 'en';
  version: string;
  headline: string;
  sectionCount: number;
  findingCount: number;
  recommendationCount: number;
  tagCount: number;
}

/**
 * Detail projeksiyonu.
 */
export interface ReportsWorkspaceDetailProjection {
  reportId: string;
  title: string;
  headline: string;
  body: string;
  highlights: readonly string[];
  sections: readonly ReportsWorkspaceListItem[];
  findings: readonly ReportsWorkspaceListItem[];
  recommendations: readonly ReportsWorkspaceListItem[];
}

/**
 * Status projeksiyonu.
 */
export interface ReportsWorkspaceStatusProjection {
  status: string;
  lastStage: string;
  sectionCount: number;
  findingCount: number;
  recommendationCount: number;
  hasReportResult: boolean;
}

/**
 * Execution Summary projeksiyonu.
 */
export interface ReportsWorkspaceExecutionProjection {
  status: string;
  lastStage: string;
  sectionCount: number;
  findingCount: number;
  recommendationCount: number;
  reportCount: number;
  hasReportResult: boolean;
}

/**
 * Widget projeksiyonu — runtime çıktısı.
 */
export interface ReportsWorkspaceWidgetProjection {
  widgetId: ReportsWorkspaceWidgetId;
  name: string;
  description: string;
  kind: ReportsWorkspaceWidgetKind;
  status: ReportsWorkspaceWidgetStatus;
  visible: boolean;
  order: number;
  title: string;
  itemCount: number;
  items: readonly ReportsWorkspaceListItem[];
  overview?: ReportsWorkspaceOverviewProjection;
  detail?: ReportsWorkspaceDetailProjection;
  reportStatus?: ReportsWorkspaceStatusProjection;
  execution?: ReportsWorkspaceExecutionProjection;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı boş/iskelet projeksiyona dönüştürür.
 */
export function toEmptyReportsWidgetProjection(
  definition: ReportsWorkspaceWidgetDefinition
): ReportsWorkspaceWidgetProjection {
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
    projected: true
  };
}
