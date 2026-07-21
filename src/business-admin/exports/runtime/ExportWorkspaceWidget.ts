/**
 * İSTEBUL Business Admin — Export Workspace widget modeli (PR-202D).
 *
 * Projection-only iskelet. CRUD / API / DB / Realtime yok.
 */

/**
 * Workspace widget kimlikleri.
 */
export type ExportWorkspaceWidgetId =
  | 'exports-overview'
  | 'recent-exports'
  | 'available-formats'
  | 'export-status'
  | 'execution-summary';

/**
 * Widget görsel türü — UI iskeleti için.
 */
export type ExportWorkspaceWidgetKind =
  | 'overview'
  | 'list'
  | 'formats'
  | 'status'
  | 'summary';

/**
 * Widget durumu.
 */
export type ExportWorkspaceWidgetStatus = 'active' | 'coming-soon';

/**
 * Registry kaydı — yerleşik workspace widget tanımı.
 */
export interface ExportWorkspaceWidgetDefinition {
  id: ExportWorkspaceWidgetId;
  name: string;
  description: string;
  order: number;
  kind: ExportWorkspaceWidgetKind;
  status: ExportWorkspaceWidgetStatus;
  /** Varsayılan görünürlük */
  visible: boolean;
}

/**
 * Liste / format öğesi projeksiyonu.
 */
export interface ExportWorkspaceListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  formatId?: string;
}

/**
 * Overview projeksiyonu.
 */
export interface ExportWorkspaceOverviewProjection {
  requestId: string;
  title: string;
  headline: string;
  status: string;
  lastStage: string;
  locale: 'tr' | 'en';
  version: string;
  formatCount: number;
  artifactCount: number;
  warningCount: number;
}

/**
 * Status projeksiyonu.
 */
export interface ExportWorkspaceStatusProjection {
  status: string;
  lastStage: string;
  artifactCount: number;
  formatCount: number;
  completedAt?: string;
  hasExportResult: boolean;
}

/**
 * Execution Summary projeksiyonu.
 */
export interface ExportWorkspaceExecutionProjection {
  status: string;
  lastStage: string;
  artifactCount: number;
  formatCount: number;
  exportCount: number;
  hasExportResult: boolean;
}

/**
 * Widget projeksiyonu — runtime çıktısı.
 */
export interface ExportWorkspaceWidgetProjection {
  widgetId: ExportWorkspaceWidgetId;
  name: string;
  description: string;
  kind: ExportWorkspaceWidgetKind;
  status: ExportWorkspaceWidgetStatus;
  visible: boolean;
  order: number;
  title: string;
  itemCount: number;
  items: readonly ExportWorkspaceListItem[];
  overview?: ExportWorkspaceOverviewProjection;
  exportStatus?: ExportWorkspaceStatusProjection;
  execution?: ExportWorkspaceExecutionProjection;
  /** Foundation katmanında her zaman true — CRUD yok */
  projected: true;
}

/**
 * Tanımı boş/iskelet projeksiyona dönüştürür.
 */
export function toEmptyExportWidgetProjection(
  definition: ExportWorkspaceWidgetDefinition
): ExportWorkspaceWidgetProjection {
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
