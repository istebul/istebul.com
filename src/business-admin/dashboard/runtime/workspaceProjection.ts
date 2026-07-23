/**
 * İSTEBUL Business Admin — workspace projeksiyon (PR-202B).
 *
 * Pipeline aşaması 2: Workspace Projection.
 * DashboardResult → widget projeksiyonları.
 */

import type { DashboardResult } from './DashboardResult';
import type {
  DashboardWorkspaceListItem,
  DashboardWorkspaceWidgetDefinition,
  DashboardWorkspaceWidgetProjection
} from './DashboardWorkspaceWidget';
import { toEmptyWidgetProjection } from './DashboardWorkspaceWidget';

function asListItems(
  value: unknown
): readonly DashboardWorkspaceListItem[] {
  if (!Array.isArray(value)) {
    return Object.freeze([]);
  }

  const items: DashboardWorkspaceListItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const id =
      typeof record.id === 'string'
        ? record.id
        : typeof record.title === 'string'
          ? record.title
          : '';
    const title =
      typeof record.title === 'string'
        ? record.title
        : typeof record.name === 'string'
          ? record.name
          : id;
    if (!id && !title) {
      continue;
    }
    items.push({
      id: id || title,
      title: title || id,
      subtitle:
        typeof record.subtitle === 'string' ? record.subtitle : undefined,
      status: typeof record.status === 'string' ? record.status : undefined
    });
  }
  return Object.freeze(items);
}

function extractListItemsFromWidgets(
  dashboard: DashboardResult,
  codes: readonly string[]
): readonly DashboardWorkspaceListItem[] {
  const matched = dashboard.widgets.filter((widget) =>
    codes.some(
      (code) =>
        widget.widgetCode.toLowerCase().includes(code) ||
        widget.kind.toLowerCase().includes(code) ||
        widget.title.toLowerCase().includes(code)
    )
  );

  const fromPayload: DashboardWorkspaceListItem[] = [];
  for (const widget of matched) {
    const payloadItems = asListItems(widget.payload?.items);
    if (payloadItems.length > 0) {
      fromPayload.push(...payloadItems);
      continue;
    }
    fromPayload.push({
      id: widget.id,
      title: widget.title,
      subtitle: widget.widgetCode,
      status: widget.kind
    });
  }

  if (fromPayload.length > 0) {
    return Object.freeze(fromPayload);
  }

  // Fallback: sections matching code keywords
  const sectionItems = dashboard.sections
    .filter((section) =>
      codes.some((code) => section.title.toLowerCase().includes(code))
    )
    .map((section) => ({
      id: section.id,
      title: section.title,
      subtitle: section.description,
      status: `widgets:${section.widgetIds.length}`
    }));

  return Object.freeze(sectionItems);
}

/**
 * Tek bir widget tanımını DashboardResult ile projekte eder.
 */
export function projectWorkspaceWidget(
  definition: DashboardWorkspaceWidgetDefinition,
  dashboardResult?: DashboardResult
): DashboardWorkspaceWidgetProjection {
  const base = toEmptyWidgetProjection(definition);

  if (!dashboardResult) {
    return base;
  }

  switch (definition.id) {
    case 'overview': {
      const overview = {
        dashboardId: dashboardResult.id,
        title: dashboardResult.metadata.title,
        description: dashboardResult.metadata.description,
        status: dashboardResult.status,
        lastStage: dashboardResult.lastStage,
        locale: dashboardResult.metadata.locale,
        version: dashboardResult.metadata.version,
        sectionCount: dashboardResult.sections.length,
        widgetCount: dashboardResult.widgets.length,
        kpiCount: dashboardResult.kpis.length
      };
      return {
        ...base,
        title: overview.title,
        itemCount: overview.sectionCount,
        overview
      };
    }
    case 'kpi-cards': {
      const kpis = Object.freeze(
        dashboardResult.kpis.map((kpi) => ({
          kpiId: kpi.kpiId,
          name: kpi.name,
          unit: kpi.unit,
          value: kpi.value,
          trendLabel: kpi.trendLabel
        }))
      );
      return {
        ...base,
        title: definition.name,
        itemCount: kpis.length,
        kpis
      };
    }
    case 'recent-analysis': {
      const items = extractListItemsFromWidgets(dashboardResult, [
        'analysis',
        'analiz'
      ]);
      return { ...base, itemCount: items.length, items };
    }
    case 'recent-decisions': {
      const items = extractListItemsFromWidgets(dashboardResult, [
        'decision',
        'karar'
      ]);
      return { ...base, itemCount: items.length, items };
    }
    case 'recent-reports': {
      const items = extractListItemsFromWidgets(dashboardResult, [
        'report',
        'rapor'
      ]);
      return { ...base, itemCount: items.length, items };
    }
    case 'recent-exports': {
      const items = extractListItemsFromWidgets(dashboardResult, [
        'export',
        'dışa',
        'disa'
      ]);
      return { ...base, itemCount: items.length, items };
    }
    case 'execution-summary': {
      const execution = {
        status: dashboardResult.status,
        lastStage: dashboardResult.lastStage,
        sectionCount: dashboardResult.sections.length,
        widgetCount: dashboardResult.widgets.length,
        kpiCount: dashboardResult.kpis.length,
        hasDashboardResult: true
      };
      return {
        ...base,
        title: definition.name,
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
export function projectWorkspaceWidgets(
  definitions: readonly DashboardWorkspaceWidgetDefinition[],
  dashboardResult?: DashboardResult
): readonly DashboardWorkspaceWidgetProjection[] {
  return Object.freeze(
    definitions.map((definition) =>
      projectWorkspaceWidget(definition, dashboardResult)
    )
  );
}
