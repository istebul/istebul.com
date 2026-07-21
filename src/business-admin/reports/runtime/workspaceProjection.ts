/**
 * İSTEBUL Business Admin — reports workspace projeksiyon (PR-202C).
 *
 * Pipeline aşaması 2: Workspace Projection.
 * ReportResult → widget projeksiyonları.
 */

import type { ReportResult } from './ReportResult';
import type { ReportsWorkspaceContext } from './ReportsWorkspaceContext';
import type {
  ReportsWorkspaceListItem,
  ReportsWorkspaceWidgetDefinition,
  ReportsWorkspaceWidgetProjection
} from './ReportsWorkspaceWidget';
import { toEmptyReportsWidgetProjection } from './ReportsWorkspaceWidget';

function resolveReportList(
  context: ReportsWorkspaceContext
): readonly ReportResult[] {
  if (context.recentReports && context.recentReports.length > 0) {
    return context.recentReports;
  }
  if (context.reportResult) {
    return Object.freeze([context.reportResult]);
  }
  return Object.freeze([]);
}

function toReportListItem(report: ReportResult): ReportsWorkspaceListItem {
  return {
    id: report.id,
    title: report.metadata.title,
    subtitle: report.metadata.createdAt,
    status: report.status,
    category: report.sections[0]?.kind
  };
}

function buildCategoryItems(
  report: ReportResult
): readonly ReportsWorkspaceListItem[] {
  const counts = new Map<string, number>();
  for (const section of report.sections) {
    const key = section.kind || 'ozel';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const tag of report.metadata.tags ?? []) {
    const key = `tag:${tag}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.freeze(
    [...counts.entries()].map(([category, count]) => ({
      id: category,
      title: category.startsWith('tag:')
        ? category.slice(4)
        : category,
      subtitle: `${count} öğe`,
      category,
      status: String(count)
    }))
  );
}

/**
 * Tek bir widget tanımını ReportResult ile projekte eder.
 */
export function projectReportsWorkspaceWidget(
  definition: ReportsWorkspaceWidgetDefinition,
  context: ReportsWorkspaceContext
): ReportsWorkspaceWidgetProjection {
  const base = toEmptyReportsWidgetProjection(definition);
  const primary = context.reportResult;
  const reports = resolveReportList(context);

  switch (definition.id) {
    case 'reports-overview': {
      if (!primary) {
        return base;
      }
      const overview = {
        reportId: primary.id,
        title: primary.metadata.title,
        description: primary.metadata.description,
        status: primary.status,
        lastStage: primary.lastStage,
        locale: primary.metadata.locale,
        version: primary.metadata.version,
        headline: primary.executiveSummary.headline,
        sectionCount: primary.sections.length,
        findingCount: primary.findings.length,
        recommendationCount: primary.recommendations.length,
        tagCount: primary.metadata.tags?.length ?? 0
      };
      return {
        ...base,
        title: overview.title,
        itemCount: overview.sectionCount,
        overview
      };
    }
    case 'recent-reports': {
      const items = Object.freeze(reports.map(toReportListItem));
      return {
        ...base,
        itemCount: items.length,
        items
      };
    }
    case 'report-categories': {
      if (!primary) {
        return base;
      }
      const items = buildCategoryItems(primary);
      return {
        ...base,
        itemCount: items.length,
        items
      };
    }
    case 'report-details': {
      if (!primary) {
        return base;
      }
      const detail = {
        reportId: primary.id,
        title: primary.metadata.title,
        headline: primary.executiveSummary.headline,
        body: primary.executiveSummary.body,
        highlights: Object.freeze([
          ...(primary.executiveSummary.highlights ?? [])
        ]),
        sections: Object.freeze(
          primary.sections.map((section) => ({
            id: section.id,
            title: section.title,
            subtitle: section.sectionCode,
            category: section.kind,
            status: section.kind
          }))
        ),
        findings: Object.freeze(
          primary.findings.map((finding) => ({
            id: finding.id,
            title: finding.title,
            subtitle: finding.description,
            status: finding.severity
          }))
        ),
        recommendations: Object.freeze(
          primary.recommendations.map((rec) => ({
            id: rec.id,
            title: rec.title,
            subtitle: rec.description,
            status: rec.priorityLevel
          }))
        )
      };
      return {
        ...base,
        title: detail.title,
        itemCount:
          detail.sections.length +
          detail.findings.length +
          detail.recommendations.length,
        detail
      };
    }
    case 'report-status': {
      if (!primary) {
        return base;
      }
      const reportStatus = {
        status: primary.status,
        lastStage: primary.lastStage,
        sectionCount: primary.sections.length,
        findingCount: primary.findings.length,
        recommendationCount: primary.recommendations.length,
        hasReportResult: true
      };
      return {
        ...base,
        itemCount: 1,
        reportStatus
      };
    }
    case 'execution-summary': {
      const execution = {
        status: primary?.status ?? 'bekliyor',
        lastStage: primary?.lastStage ?? 'karar-dogrulama',
        sectionCount: primary?.sections.length ?? 0,
        findingCount: primary?.findings.length ?? 0,
        recommendationCount: primary?.recommendations.length ?? 0,
        reportCount: reports.length,
        hasReportResult: primary !== undefined
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
export function projectReportsWorkspaceWidgets(
  definitions: readonly ReportsWorkspaceWidgetDefinition[],
  context: ReportsWorkspaceContext
): readonly ReportsWorkspaceWidgetProjection[] {
  return Object.freeze(
    definitions.map((definition) =>
      projectReportsWorkspaceWidget(definition, context)
    )
  );
}
