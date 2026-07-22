/**
 * İSTEBUL Business Admin — export workspace projeksiyon (PR-202D).
 *
 * Pipeline aşaması 2: Workspace Projection.
 * ExportResult → widget projeksiyonları.
 */

import type { ExportResult } from './ExportResult';
import type { ExportWorkspaceContext } from './ExportWorkspaceContext';
import type {
  ExportWorkspaceListItem,
  ExportWorkspaceWidgetDefinition,
  ExportWorkspaceWidgetProjection
} from './ExportWorkspaceWidget';
import { toEmptyExportWidgetProjection } from './ExportWorkspaceWidget';

function resolveExportList(
  context: ExportWorkspaceContext
): readonly ExportResult[] {
  if (context.recentExports && context.recentExports.length > 0) {
    return context.recentExports;
  }
  if (context.exportResult) {
    return Object.freeze([context.exportResult]);
  }
  return Object.freeze([]);
}

function toExportListItem(exportResult: ExportResult): ExportWorkspaceListItem {
  return {
    id: exportResult.requestId,
    title: exportResult.metadata.title,
    subtitle: exportResult.completedAt ?? exportResult.metadata.createdAt,
    status: exportResult.status,
    formatId: exportResult.metadata.formatIds[0]
  };
}

function buildFormatItems(
  exportResult: ExportResult
): readonly ExportWorkspaceListItem[] {
  const labels = exportResult.summary.formatLabels;
  const formatIds = exportResult.metadata.formatIds;

  if (labels.length > 0) {
    return Object.freeze(
      labels.map((label, index) => ({
        id: formatIds[index] ?? `format-${index}`,
        title: label,
        subtitle: formatIds[index],
        formatId: formatIds[index],
        status: 'available'
      }))
    );
  }

  if (exportResult.artifacts.length > 0) {
    return Object.freeze(
      exportResult.artifacts.map((artifact) => ({
        id: artifact.id,
        title: artifact.fileName,
        subtitle: artifact.mimeType,
        formatId: artifact.formatId,
        status: artifact.formatId
      }))
    );
  }

  return Object.freeze(
    formatIds.map((formatId) => ({
      id: formatId,
      title: formatId.toUpperCase(),
      subtitle: formatId,
      formatId,
      status: 'available'
    }))
  );
}

/**
 * Tek bir widget tanımını ExportResult ile projekte eder.
 */
export function projectExportWorkspaceWidget(
  definition: ExportWorkspaceWidgetDefinition,
  context: ExportWorkspaceContext
): ExportWorkspaceWidgetProjection {
  const base = toEmptyExportWidgetProjection(definition);
  const primary = context.exportResult;
  const exports = resolveExportList(context);

  switch (definition.id) {
    case 'exports-overview': {
      if (!primary) {
        return base;
      }
      const overview = {
        requestId: primary.requestId,
        title: primary.metadata.title,
        headline: primary.summary.headline,
        status: primary.status,
        lastStage: primary.lastStage,
        locale: primary.metadata.locale,
        version: primary.metadata.version,
        formatCount: primary.metadata.formatIds.length,
        artifactCount: primary.artifacts.length,
        warningCount: primary.summary.warnings?.length ?? 0
      };
      return {
        ...base,
        title: overview.title,
        itemCount: overview.artifactCount,
        overview
      };
    }
    case 'recent-exports': {
      const items = Object.freeze(exports.map(toExportListItem));
      return {
        ...base,
        itemCount: items.length,
        items
      };
    }
    case 'available-formats': {
      if (!primary) {
        return base;
      }
      const items = buildFormatItems(primary);
      return {
        ...base,
        itemCount: items.length,
        items
      };
    }
    case 'export-status': {
      if (!primary) {
        return base;
      }
      const exportStatus = {
        status: primary.status,
        lastStage: primary.lastStage,
        artifactCount: primary.artifacts.length,
        formatCount: primary.metadata.formatIds.length,
        completedAt: primary.completedAt,
        hasExportResult: true
      };
      return {
        ...base,
        itemCount: 1,
        exportStatus
      };
    }
    case 'execution-summary': {
      const execution = {
        status: primary?.status ?? 'bekliyor',
        lastStage: primary?.lastStage ?? 'export-dogrulama',
        artifactCount: primary?.artifacts.length ?? 0,
        formatCount: primary?.metadata.formatIds.length ?? 0,
        exportCount: exports.length,
        hasExportResult: primary !== undefined
      };
      return {
        ...base,
        itemCount: 1,
        execution
      };
    }
    default:
      return base;
  }
}

/**
 * Kayıtlı widget tanımlarını projeksiyon listesine dönüştürür.
 */
export function projectExportWorkspaceWidgets(
  definitions: readonly ExportWorkspaceWidgetDefinition[],
  context: ExportWorkspaceContext
): readonly ExportWorkspaceWidgetProjection[] {
  return Object.freeze(
    definitions.map((definition) =>
      projectExportWorkspaceWidget(definition, context)
    )
  );
}
