import {
  createActionPlanBuilderRuntime,
  createActionPlanContext,
  type ActionPlanResult,
  type RecommendationRecord,
  type RecommendationResult
} from '../../decision';
import type {
  DecisionPriorityLevel
} from '../../decision/models/DecisionPriority';
import type {
  BusinessAnalysisResult
} from '../../document-intelligence/models/BusinessAnalysisResult';
import type {
  BusinessInsight,
  InsightSeverity
} from '../../document-intelligence/models/BusinessInsight';

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function mapInsightSeverity(
  severity: InsightSeverity
): RecommendationRecord['severity'] {
  if (severity === 'critical') return 'CRITICAL';
  if (severity === 'warning') return 'WARNING';
  if (severity === 'success') return 'INFO';

  return 'INFO';
}

function mapInsightPriority(
  severity: InsightSeverity
): DecisionPriorityLevel {
  if (severity === 'critical') return 'kritik';
  if (severity === 'warning') return 'yuksek';
  if (severity === 'success') return 'orta';

  return 'dusuk';
}

function createRecommendationRecord(
  insight: BusinessInsight,
  index: number
): RecommendationRecord {
  const id = `rec-executive-${slugify(insight.id || insight.title)}-${index}`;
  const priority = mapInsightPriority(insight.severity);

  return {
    id,
    title: insight.title,
    description: insight.description,
    category: 'analysis',
    severity: mapInsightSeverity(insight.severity),
    priority,
    sourcePolicy: `executive-${insight.source}`,
    sourceFinding: insight.id,
    metadata: Object.freeze({
      source: insight.source,
      insightSeverity: insight.severity,
      adapter: 'executive-decision-adapter'
    }),
    recommendation: {
      id,
      code:
        `EXECUTIVE_${slugify(insight.source || insight.title)}`
          .replace(/-/g, '_')
          .toUpperCase(),
      title: insight.title,
      description: insight.description,
      priorityLevel: priority
    },
    informational: false
  };
}

function createFallbackRecommendationRecord(
  recommendation: string,
  index: number
): RecommendationRecord {
  const id = `rec-executive-fallback-${index}`;
  const title = `Yönetici aksiyonu ${index + 1}`;

  return {
    id,
    title,
    description: recommendation,
    category: 'analysis',
    severity: 'INFO',
    priority: 'orta',
    sourcePolicy: 'executive-analysis-recommendation',
    metadata: Object.freeze({
      adapter: 'executive-decision-adapter',
      fallback: true
    }),
    recommendation: {
      id,
      code: `EXECUTIVE_ACTION_${index + 1}`,
      title,
      description: recommendation,
      priorityLevel: 'orta'
    },
    informational: false
  };
}

function buildRecommendationResult(
  analysis: BusinessAnalysisResult
): RecommendationResult {
  const insightRecords = analysis.insights.map(
    createRecommendationRecord
  );

  const fallbackRecords =
    insightRecords.length > 0
      ? []
      : analysis.recommendations.map(
          createFallbackRecommendationRecord
        );

  const records = [...insightRecords, ...fallbackRecords];

  const categoryCounts: Record<string, number> = {};
  const severityCounts: Record<string, number> = {};

  for (const record of records) {
    categoryCounts[record.category] =
      (categoryCounts[record.category] ?? 0) + 1;

    severityCounts[record.severity] =
      (severityCounts[record.severity] ?? 0) + 1;
  }

  const startedAt = nowIso();
  const endedAt = nowIso();

  return {
    records: Object.freeze(records),
    recommendations: Object.freeze(
      records.map((record) => record.recommendation)
    ),
    summary: {
      recommendationCount: records.length,
      informationalCount: 0,
      warningCount: 0,
      categoryCounts: Object.freeze(categoryCounts),
      severityCounts: Object.freeze(severityCounts),
      success: true
    },
    warnings: Object.freeze([]),
    telemetry: {
      durationMs: 0,
      startedAt,
      endedAt,
      recommendationCount: records.length,
      categoryCount: Object.keys(categoryCounts).length,
      categoryDistribution: Object.freeze(categoryCounts),
      severityDistribution: Object.freeze(severityCounts),
      warningCount: 0
    }
  };
}

export interface ExecutiveDecisionResult {
  recommendationResult: RecommendationResult;
  actionPlanResult: ActionPlanResult;
}

export class ExecutiveDecisionAdapter {
  build(
    analysis: BusinessAnalysisResult
  ): ExecutiveDecisionResult {
    const recommendationResult =
      buildRecommendationResult(analysis);

    const actionPlanResult =
      createActionPlanBuilderRuntime().compute(
        createActionPlanContext({
          recommendationResult,
          includeSkippedInfo: false,
          locale: 'tr'
        })
      );

    return {
      recommendationResult,
      actionPlanResult
    };
  }
}
