/**
 * İSTEBUL Business Analysis Engine — SummaryBuilderRuntime (PR-102E).
 *
 * FindingResult, RuleResult ve KpiResult üzerinden nesnel Analysis Summary üretir.
 * Karar / öneri / AI üretmez.
 */

import type { AnalysisContext } from '../../models/AnalysisContext';
import type { AnalysisFinding } from '../../models/AnalysisFinding';
import type { AnalysisSummary } from '../../models/AnalysisSummary';
import type { KPIResult as FoundationKPIResult } from '../../models/KPIResult';
import type { ISummaryBuilder } from '../../ports/ISummaryBuilder';
import type { FindingResult } from '../../findings/runtime/FindingResult';
import type { KpiResult } from '../../kpis/runtime/KpiResult';
import type { RuleResult } from '../../rules/runtime/RuleResult';
import {
  endAnalysisStageTimer,
  nowMs,
  startAnalysisStageTimer
} from '../../pipeline/runtime/AnalysisTiming';
import type { SummaryContext } from './SummaryContext';
import { createSummaryContext } from './SummaryContext';
import type { SummaryMetadata, SummaryRecord } from './SummaryRecord';
import type { SummaryRegistryRuntime } from './SummaryRegistryRuntime';
import { createSummaryRegistryRuntime } from './SummaryRegistryRuntime';
import type {
  SummaryResult,
  SummaryTelemetry,
  SummaryWarning
} from './SummaryResult';
import type { SummarySection, SummarySectionId } from './SummarySection';
import { SUMMARY_SECTION_LABELS } from './SummarySection';

function section(
  id: SummarySectionId,
  order: number,
  items: string[],
  metrics: Record<string, string | number | boolean | null>
): SummarySection {
  return {
    id,
    title: SUMMARY_SECTION_LABELS[id],
    items: Object.freeze(items),
    metrics: Object.freeze(metrics),
    order
  };
}

function buildAnalysisMetadataSection(
  context: SummaryContext,
  order: number
): SummarySection {
  const analysisId = context.analysisContext?.analysisId ?? null;
  const datasetId = context.analysisContext?.dataset?.id ?? null;
  const locale = context.locale;
  const items = [
    `Analysis ID: ${analysisId ?? 'n/a'}`,
    `Dataset ID: ${datasetId ?? 'n/a'}`,
    `Locale: ${locale}`
  ];
  return section('analysis-metadata', order, items, {
    analysisId,
    datasetId,
    locale
  });
}

function buildDatasetStatisticsSection(
  kpiResult: KpiResult | undefined,
  analysisContext: AnalysisContext | undefined,
  order: number
): SummarySection {
  const size = kpiResult?.telemetry.datasetSize;
  const entityCount =
    size?.entityCount ??
    analysisContext?.dataset?.entities?.length ??
    0;
  const recordCount = size?.recordCount ?? 0;
  const columnCount = size?.columnCount ?? 0;
  const totalFieldCount = size?.totalFieldCount ?? 0;
  const items = [
    `Entity count: ${entityCount}`,
    `Record count: ${recordCount}`,
    `Column count: ${columnCount}`,
    `Total field count: ${totalFieldCount}`
  ];
  return section('dataset-statistics', order, items, {
    entityCount,
    recordCount,
    columnCount,
    totalFieldCount
  });
}

function buildKpiSummarySection(
  kpiResult: KpiResult | undefined,
  kpiResults: readonly FoundationKPIResult[] | undefined,
  order: number
): SummarySection {
  const calculated =
    kpiResult?.summary.calculatedCount ?? kpiResults?.length ?? 0;
  const requested = kpiResult?.summary.requestedCount ?? calculated;
  const unavailable = kpiResult?.summary.unavailableCount ?? 0;
  const success = kpiResult?.summary.success ?? calculated > 0;
  const items = [
    `Calculated KPIs: ${calculated}`,
    `Requested KPIs: ${requested}`,
    `Unavailable KPIs: ${unavailable}`,
    `KPI success: ${success ? 'true' : 'false'}`
  ];
  return section('kpi-summary', order, items, {
    calculatedCount: calculated,
    requestedCount: requested,
    unavailableCount: unavailable,
    success
  });
}

function buildRuleSummarySection(
  ruleResult: RuleResult | undefined,
  order: number
): SummarySection {
  const evaluated = ruleResult?.summary.evaluatedCount ?? 0;
  const triggered = ruleResult?.summary.triggeredCount ?? 0;
  const passed = ruleResult?.summary.passedCount ?? 0;
  const skipped = ruleResult?.summary.skippedCount ?? 0;
  const items = [
    `Evaluated rules: ${evaluated}`,
    `Triggered rules: ${triggered}`,
    `Passed rules: ${passed}`,
    `Skipped rules: ${skipped}`
  ];
  return section('rule-summary', order, items, {
    evaluatedCount: evaluated,
    triggeredCount: triggered,
    passedCount: passed,
    skippedCount: skipped
  });
}

function buildFindingSummarySection(
  findingResult: FindingResult | undefined,
  findings: readonly AnalysisFinding[] | undefined,
  order: number
): SummarySection {
  const findingCount =
    findingResult?.summary.findingCount ?? findings?.length ?? 0;
  const informational = findingResult?.summary.informationalCount ?? 0;
  const warningCount = findingResult?.summary.warningCount ?? 0;
  const items = [
    `Findings: ${findingCount}`,
    `Informational records: ${informational}`,
    `Finding warnings: ${warningCount}`
  ];
  return section('finding-summary', order, items, {
    findingCount,
    informationalCount: informational,
    warningCount
  });
}

function buildSeverityDistributionSection(
  findingResult: FindingResult | undefined,
  findings: readonly AnalysisFinding[] | undefined,
  order: number
): SummarySection {
  const severityCounts = {
    ...(findingResult?.summary.severityCounts ?? {})
  };

  if (!findingResult && findings) {
    for (const finding of findings) {
      const key =
        finding.severity === 'bilgi'
          ? 'INFO'
          : finding.severity === 'uyari'
            ? 'WARNING'
            : 'ERROR';
      severityCounts[key as 'INFO' | 'WARNING' | 'ERROR'] =
        (severityCounts[key as 'INFO' | 'WARNING' | 'ERROR'] ?? 0) + 1;
    }
  }

  const info = severityCounts.INFO ?? 0;
  const warning = severityCounts.WARNING ?? 0;
  const error = severityCounts.ERROR ?? 0;
  const critical = severityCounts.CRITICAL ?? 0;
  const items = [
    `INFO: ${info}`,
    `WARNING: ${warning}`,
    `ERROR: ${error}`,
    `CRITICAL: ${critical}`
  ];
  return section('severity-distribution', order, items, {
    INFO: info,
    WARNING: warning,
    ERROR: error,
    CRITICAL: critical
  });
}

function buildCategoryDistributionSection(
  findingResult: FindingResult | undefined,
  order: number
): SummarySection {
  const categoryCounts = findingResult?.summary.categoryCounts ?? {};
  const dataQuality = categoryCounts['data-quality'] ?? 0;
  const structure = categoryCounts['dataset-structure'] ?? 0;
  const metadata = categoryCounts.metadata ?? 0;
  const informational = categoryCounts.informational ?? 0;
  const items = [
    `data-quality: ${dataQuality}`,
    `dataset-structure: ${structure}`,
    `metadata: ${metadata}`,
    `informational: ${informational}`
  ];
  return section('category-distribution', order, items, {
    'data-quality': dataQuality,
    'dataset-structure': structure,
    metadata,
    informational
  });
}

function buildExecutionSummarySection(
  context: SummaryContext,
  sectionsBuilt: number,
  order: number
): SummarySection {
  const kpiDuration = context.kpiResult?.telemetry.durationMs ?? 0;
  const ruleDuration = context.ruleResult?.telemetry.durationMs ?? 0;
  const findingDuration = context.findingResult?.telemetry.durationMs ?? 0;
  const items = [
    `Sections built: ${sectionsBuilt}`,
    `KPI durationMs: ${kpiDuration}`,
    `Rule durationMs: ${ruleDuration}`,
    `Finding durationMs: ${findingDuration}`
  ];
  return section('execution-summary', order, items, {
    sectionsBuilt,
    kpiDurationMs: kpiDuration,
    ruleDurationMs: ruleDuration,
    findingDurationMs: findingDuration
  });
}

function buildHeadline(sections: readonly SummarySection[]): string {
  const finding = sections.find((item) => item.id === 'finding-summary');
  const rule = sections.find((item) => item.id === 'rule-summary');
  const kpi = sections.find((item) => item.id === 'kpi-summary');
  const findingCount = Number(finding?.metrics.findingCount ?? 0);
  const triggered = Number(rule?.metrics.triggeredCount ?? 0);
  const calculated = Number(kpi?.metrics.calculatedCount ?? 0);
  return `Analiz özeti: ${calculated} KPI, ${triggered} tetiklenen kural, ${findingCount} bulgu.`;
}

function buildHighlights(sections: readonly SummarySection[]): string[] {
  const highlights: string[] = [];
  for (const sectionItem of sections) {
    if (sectionItem.items.length > 0) {
      highlights.push(`${sectionItem.title}: ${sectionItem.items[0]}`);
    }
  }
  return highlights;
}

/**
 * Summary Builder Runtime.
 */
export class SummaryBuilderRuntime implements ISummaryBuilder {
  private readonly registry: SummaryRegistryRuntime;

  constructor(registry?: SummaryRegistryRuntime) {
    this.registry = registry ?? createSummaryRegistryRuntime(true);
  }

  getRegistry(): SummaryRegistryRuntime {
    return this.registry;
  }

  /**
   * Foundation `ISummaryBuilder.build`.
   */
  async build(
    context: AnalysisContext,
    kpiResults: readonly FoundationKPIResult[],
    findings: readonly AnalysisFinding[]
  ): Promise<AnalysisSummary> {
    const result = this.compute(
      createSummaryContext({
        analysisContext: context,
        kpiResults,
        findings,
        locale: context.locale
      })
    );
    return result.analysisSummary;
  }

  /**
   * Detaylı runtime sonucu — bölümler + metadata + telemetri.
   */
  compute(context: SummaryContext): SummaryResult {
    const timer = startAnalysisStageTimer();
    const startMark = nowMs();
    const warnings: SummaryWarning[] = [];

    const enabled = this.registry.getEnabled();
    if (enabled.length === 0) {
      warnings.push({
        code: 'NO_SECTIONS_ENABLED',
        message: 'Aktif summary bölümü yok.'
      });
    }

    if (!context.kpiResult && !context.ruleResult && !context.findingResult) {
      warnings.push({
        code: 'EMPTY_ANALYSIS_INPUTS',
        message:
          'KPI/Rule/Finding runtime sonuçları yok; boş analiz özeti üretildi.'
      });
    }

    const sections: SummarySection[] = [];
    let order = 1;

    for (const definition of enabled) {
      switch (definition.id) {
        case 'analysis-metadata':
          sections.push(buildAnalysisMetadataSection(context, order));
          break;
        case 'dataset-statistics':
          sections.push(
            buildDatasetStatisticsSection(
              context.kpiResult,
              context.analysisContext,
              order
            )
          );
          break;
        case 'kpi-summary':
          sections.push(
            buildKpiSummarySection(
              context.kpiResult,
              context.kpiResults,
              order
            )
          );
          break;
        case 'rule-summary':
          sections.push(buildRuleSummarySection(context.ruleResult, order));
          break;
        case 'finding-summary':
          sections.push(
            buildFindingSummarySection(
              context.findingResult,
              context.findings,
              order
            )
          );
          break;
        case 'severity-distribution':
          sections.push(
            buildSeverityDistributionSection(
              context.findingResult,
              context.findings,
              order
            )
          );
          break;
        case 'category-distribution':
          sections.push(
            buildCategoryDistributionSection(context.findingResult, order)
          );
          break;
        case 'execution-summary':
          sections.push(
            buildExecutionSummarySection(context, sections.length + 1, order)
          );
          break;
        default:
          warnings.push({
            code: 'UNKNOWN_SECTION',
            message: `Bilinmeyen summary bölümü: ${definition.id}`
          });
          break;
      }
      order += 1;
    }

    // execution-summary sectionsBuilt should reflect final count
    const executionIndex = sections.findIndex(
      (item) => item.id === 'execution-summary'
    );
    if (executionIndex >= 0) {
      sections[executionIndex] = buildExecutionSummarySection(
        context,
        sections.length,
        sections[executionIndex].order
      );
    }

    const frozenSections = Object.freeze(sections);
    const analysisSummary: AnalysisSummary = {
      headline: buildHeadline(frozenSections),
      highlights: Object.freeze(buildHighlights(frozenSections))
      // recommendations intentionally omitted — no advice in this PR
    };

    const sourceStages: string[] = [];
    if (context.kpiResult) {
      sourceStages.push('kpi-hesaplama');
    }
    if (context.ruleResult) {
      sourceStages.push('kural-degerlendirme');
    }
    if (context.findingResult) {
      sourceStages.push('bulgu-uretimi');
    }

    const metadata: SummaryMetadata = {
      analysisId: context.analysisContext?.analysisId,
      datasetId: context.analysisContext?.dataset?.id,
      locale: context.locale,
      generatedAt: new Date().toISOString(),
      sourceStages: Object.freeze(sourceStages)
    };

    const record: SummaryRecord = {
      analysisSummary,
      sections: frozenSections,
      metadata
    };

    const timing = endAnalysisStageTimer(timer);
    const telemetry: SummaryTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      summarySectionCount: frozenSections.length,
      findingTotals:
        context.findingResult?.summary.findingCount ??
        context.findings?.length ??
        0,
      ruleTotals: context.ruleResult?.summary.evaluatedCount ?? 0,
      kpiTotals:
        context.kpiResult?.summary.calculatedCount ??
        context.kpiResults?.length ??
        0,
      warningCount: warnings.length
    };

    return {
      record,
      analysisSummary,
      sections: frozenSections,
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createSummaryBuilderRuntime(
  registry?: SummaryRegistryRuntime
): SummaryBuilderRuntime {
  return new SummaryBuilderRuntime(registry);
}

export default SummaryBuilderRuntime;
