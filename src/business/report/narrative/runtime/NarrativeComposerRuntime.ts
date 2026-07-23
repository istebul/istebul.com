/**
 * İSTEBUL Business Report Engine — NarrativeComposerRuntime (PR-104C).
 *
 * ReportModel üzerinden şablon tabanlı Narrative üretir.
 * Yeni analiz / karar / LLM kullanmaz.
 */

import type { ReportModel } from '../../modelBuilder/runtime/ReportModel';
import {
  endReportStageTimer,
  nowMs,
  startReportStageTimer
} from '../../pipeline/runtime/ReportTiming';
import type { NarrativeContext } from './NarrativeContext';
import type { NarrativeKind } from './NarrativeKind';
import type { NarrativeRecord } from './NarrativeRecord';
import type { NarrativeRegistryRuntime } from './NarrativeRegistryRuntime';
import { createNarrativeRegistryRuntime } from './NarrativeRegistryRuntime';
import type {
  NarrativeMetadata,
  NarrativeResult,
  NarrativeTelemetry,
  NarrativeWarning
} from './NarrativeResult';
import type { NarrativeTemplate } from './NarrativeTemplate';

function emptyReportModel(): ReportModel {
  return {
    metadata: {
      id: '',
      reportDnaId: '',
      locale: 'tr',
      decisionRequestId: '',
      datasetId: '',
      analysisRequestId: '',
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      tags: Object.freeze([])
    },
    dataset: {
      datasetId: '',
      analysisRequestId: '',
      present: false
    },
    decision: {
      requestId: '',
      analysisRequestId: '',
      datasetId: '',
      status: 'basarisiz',
      lastStage: 'karar-derleme',
      completedAt: null,
      riskCount: 0,
      opportunityCount: 0,
      priorityCount: 0,
      scoreCount: 0
    },
    policy: {
      riskCount: 0,
      opportunityCount: 0,
      priorityCount: 0,
      present: false
    },
    recommendation: {
      recommendationCount: 0,
      priorityCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    actionPlan: {
      actionCount: 0,
      kindCounts: Object.freeze({}),
      items: Object.freeze([]),
      present: false
    },
    summary: {
      hasHeadline: false,
      headlineLength: 0,
      highlightCount: 0,
      cautionCount: 0,
      headline: '',
      highlights: Object.freeze([]),
      cautions: Object.freeze([]),
      present: false
    }
  };
}

function resolveReportModel(context: NarrativeContext): ReportModel {
  return (
    context.reportModel ??
    context.reportModelResult?.model ??
    emptyReportModel()
  );
}

function buildPlaceholders(
  model: ReportModel
): Readonly<Record<string, string>> {
  const recTitles = model.recommendation.items
    .map((item) => item.title)
    .filter((title) => title.length > 0);
  const actionTitles = model.actionPlan.items
    .map((item) => item.title)
    .filter((title) => title.length > 0);

  return Object.freeze({
    datasetId: model.dataset.datasetId || 'n/a',
    analysisRequestId: model.dataset.analysisRequestId || 'n/a',
    datasetPresent: model.dataset.present ? 'evet' : 'hayır',
    decisionStatus: model.decision.status,
    decisionRequestId: model.decision.requestId || 'n/a',
    recommendationCount: String(model.recommendation.recommendationCount),
    actionCount: String(model.actionPlan.actionCount),
    riskCount: String(model.policy.riskCount),
    opportunityCount: String(model.policy.opportunityCount),
    priorityCount: String(model.policy.priorityCount),
    priorityKritik: String(model.recommendation.priorityCounts.kritik ?? 0),
    priorityYuksek: String(model.recommendation.priorityCounts.yuksek ?? 0),
    priorityOrta: String(model.recommendation.priorityCounts.orta ?? 0),
    priorityDusuk: String(model.recommendation.priorityCounts.dusuk ?? 0),
    kindIncele: String(model.actionPlan.kindCounts.incele ?? 0),
    kindIyilestir: String(model.actionPlan.kindCounts.iyilestir ?? 0),
    kindIzle: String(model.actionPlan.kindCounts.izle ?? 0),
    recommendationTitles:
      recTitles.length > 0 ? recTitles.join('; ') : 'yok',
    actionTitles: actionTitles.length > 0 ? actionTitles.join('; ') : 'yok',
    firstRecommendationTitle: recTitles[0] ?? 'yok',
    firstActionTitle: actionTitles[0] ?? 'yok',
    summaryHeadline: model.summary.headline || 'yok',
    highlightCount: String(model.summary.highlightCount),
    cautionCount: String(model.summary.cautionCount)
  });
}

function applyTemplate(
  template: string,
  placeholders: Readonly<Record<string, string>>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    return placeholders[key] ?? '';
  });
}

function composeRecord(
  template: NarrativeTemplate,
  placeholders: Readonly<Record<string, string>>,
  locale: 'tr' | 'en'
): NarrativeRecord {
  return {
    id: `narrative:${template.id}`,
    kind: template.kind,
    title: template.title,
    body: applyTemplate(template.bodyTemplate, placeholders),
    highlights: Object.freeze(
      template.highlightTemplates.map((item) =>
        applyTemplate(item, placeholders)
      )
    ),
    templateId: template.id,
    locale,
    order: template.order
  };
}

/**
 * Narrative Composer Runtime.
 */
export class NarrativeComposerRuntime {
  private readonly registry: NarrativeRegistryRuntime;

  constructor(registry?: NarrativeRegistryRuntime) {
    this.registry = registry ?? createNarrativeRegistryRuntime(true);
  }

  getRegistry(): NarrativeRegistryRuntime {
    return this.registry;
  }

  /**
   * ReportModel → şablon tabanlı NarrativeResult.
   */
  compute(context: NarrativeContext): NarrativeResult {
    const timer = startReportStageTimer();
    const startMark = nowMs();
    const warnings: NarrativeWarning[] = [];
    const generatedAt = new Date().toISOString();

    const model = resolveReportModel(context);
    const hasModelInput = Boolean(
      context.reportModel || context.reportModelResult
    );

    if (!hasModelInput) {
      warnings.push({
        code: 'EMPTY_REPORT_MODEL',
        message: 'ReportModel yok; boş narrative seti üretildi.'
      });
    }

    let templates = this.registry.getEnabled();
    if (context.narrativeKinds && context.narrativeKinds.length > 0) {
      const allowed = new Set(context.narrativeKinds);
      templates = Object.freeze(
        templates.filter((item) => allowed.has(item.kind))
      );
    }

    if (templates.length === 0) {
      warnings.push({
        code: 'NO_TEMPLATES_ENABLED',
        message: 'Aktif Narrative şablonu yok.'
      });
    }

    const placeholders = buildPlaceholders(model);
    const narratives: NarrativeRecord[] = [];
    const templateUsage: Partial<Record<string, number>> = {};
    const kindDistribution: Partial<Record<NarrativeKind, number>> = {};

    for (const template of templates) {
      const record = composeRecord(template, placeholders, context.locale);
      narratives.push(record);
      templateUsage[template.id] = (templateUsage[template.id] ?? 0) + 1;
      kindDistribution[template.kind] =
        (kindDistribution[template.kind] ?? 0) + 1;
    }

    const metadata: NarrativeMetadata = {
      reportModelId: model.metadata.id || 'unknown-report-model',
      locale: context.locale,
      generatedAt,
      templateIds: Object.freeze(narratives.map((item) => item.templateId))
    };

    const timing = endReportStageTimer(timer);
    const telemetry: NarrativeTelemetry = {
      durationMs:
        timing.durationMs || Math.max(0, Math.round(nowMs() - startMark)),
      startedAt: timing.startedAt,
      endedAt: timing.endedAt,
      narrativeCount: narratives.length,
      templateUsage: Object.freeze({ ...templateUsage }),
      kindDistribution: Object.freeze({ ...kindDistribution }),
      warningCount: warnings.length
    };

    return {
      narratives: Object.freeze(narratives),
      metadata,
      warnings: Object.freeze(warnings),
      telemetry
    };
  }
}

export function createNarrativeComposerRuntime(
  registry?: NarrativeRegistryRuntime
): NarrativeComposerRuntime {
  return new NarrativeComposerRuntime(registry);
}

export default NarrativeComposerRuntime;
