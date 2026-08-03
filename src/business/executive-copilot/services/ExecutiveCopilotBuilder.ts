import type {
  BusinessAlert,
  BusinessAlertResult,
  BusinessForecastResult,
  BusinessKpiComparison,
  BusinessPeriodComparisonResult
} from '../../document-intelligence';

import type {
  StoredBusinessDocumentAnalysis
} from '../../document-intelligence/providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

import type {
  ExecutiveCopilotAction,
  ExecutiveCopilotConfidence,
  ExecutiveCopilotHealth,
  ExecutiveCopilotPriority,
  ExecutiveCopilotResult,
  ExecutiveCopilotSignal
} from '../models/ExecutiveCopilotResult';

export interface ExecutiveCopilotBuilderInput {
  analysis: StoredBusinessDocumentAnalysis;
  comparison?: BusinessPeriodComparisonResult;
  alerts?: BusinessAlertResult;
  forecast?: BusinessForecastResult;
  generatedAt?: string;
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildHealth(
  score: number,
  comparison?: BusinessPeriodComparisonResult
): ExecutiveCopilotHealth {
  const normalizedScore = clampScore(score);

  const status =
    normalizedScore < 40
      ? 'critical'
      : normalizedScore < 70
        ? 'attention'
        : 'healthy';

  const trend =
    comparison?.score.direction === 'up'
      ? 'improving'
      : comparison?.score.direction === 'down'
        ? 'declining'
        : comparison
          ? 'stable'
          : 'unknown';

  return Object.freeze({
    score: normalizedScore,
    status,
    statusLabel:
      status === 'critical'
        ? 'Kritik'
        : status === 'attention'
          ? 'Dikkat gerekiyor'
          : 'Sağlıklı',
    trend,
    trendLabel:
      trend === 'improving'
        ? 'İyileşiyor'
        : trend === 'declining'
          ? 'Geriliyor'
          : trend === 'stable'
            ? 'Stabil'
            : 'Karşılaştırma yok'
  });
}

function mapAlertPriority(
  alert: BusinessAlert
): ExecutiveCopilotPriority {
  if (alert.severity === 'critical') return 'critical';
  if (alert.severity === 'warning') return 'high';
  if (alert.severity === 'success') return 'low';
  return 'medium';
}

function findTopAlert(
  alerts?: BusinessAlertResult
): BusinessAlert | undefined {
  const priority: Record<
    BusinessAlert['severity'],
    number
  > = {
    critical: 4,
    warning: 3,
    info: 2,
    success: 1
  };

  return [...(alerts?.alerts ?? [])]
    .sort(
      (left, right) =>
        priority[right.severity] -
        priority[left.severity]
    )[0];
}

function rankByMagnitude(
  items: readonly BusinessKpiComparison[]
): BusinessKpiComparison[] {
  return [...items].sort(
    (left, right) =>
      Math.abs(right.absoluteChange) -
      Math.abs(left.absoluteChange)
  );
}

function buildTopRisk(
  alerts?: BusinessAlertResult,
  comparison?: BusinessPeriodComparisonResult
): ExecutiveCopilotSignal | undefined {
  const alert = findTopAlert(alerts);

  if (
    alert &&
    (
      alert.severity === 'critical' ||
      alert.severity === 'warning'
    )
  ) {
    return Object.freeze({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      severity: mapAlertPriority(alert),
      source: 'alert'
    });
  }

  const negative = rankByMagnitude(
    comparison?.kpis.filter(
      (item) => item.impact === 'negative'
    ) ?? []
  )[0];

  if (!negative) return undefined;

  return Object.freeze({
    id: `comparison-risk-${negative.id}`,
    title: `${negative.label} geriliyor`,
    description:
      `${negative.label} önceki döneme göre ` +
      `${negative.changeLabel} değişti.`,
    severity: 'high',
    source: 'comparison'
  });
}

function buildTopOpportunity(
  comparison?: BusinessPeriodComparisonResult
): ExecutiveCopilotSignal | undefined {
  const positive = rankByMagnitude(
    comparison?.kpis.filter(
      (item) => item.impact === 'positive'
    ) ?? []
  )[0];

  if (!positive) return undefined;

  return Object.freeze({
    id: `comparison-opportunity-${positive.id}`,
    title: `${positive.label} güçleniyor`,
    description:
      `${positive.label} önceki döneme göre ` +
      `${positive.changeLabel} iyileşti.`,
    severity: 'medium',
    source: 'comparison'
  });
}

function actionDueLabel(
  priority: ExecutiveCopilotPriority
): string {
  if (priority === 'critical') return 'Bugün';
  if (priority === 'high') return '24 saat içinde';
  if (priority === 'medium') return 'Bu hafta';
  return 'Planlama döneminde';
}

function normalizeActionTitle(
  value: string,
  fallback: string
): string {
  const normalized = value.trim();

  if (!normalized) return fallback;

  const firstSentence =
    normalized.split(/[.!?]/)[0]?.trim() ?? normalized;

  return firstSentence.length > 72
    ? `${firstSentence.slice(0, 69)}...`
    : firstSentence;
}

function buildActions(
  analysis: StoredBusinessDocumentAnalysis,
  alerts?: BusinessAlertResult
): readonly ExecutiveCopilotAction[] {
  const actions: ExecutiveCopilotAction[] = [];

  for (const alert of alerts?.alerts ?? []) {
    if (
      alert.severity !== 'critical' &&
      alert.severity !== 'warning'
    ) {
      continue;
    }

    const priority = mapAlertPriority(alert);

    actions.push(
      Object.freeze({
        id: `alert-action-${alert.id}`,
        title: normalizeActionTitle(
          alert.recommendation,
          alert.title
        ),
        description: alert.recommendation,
        priority,
        source: 'alert',
        dueLabel: actionDueLabel(priority)
      })
    );
  }

  for (
    let index = 0;
    index < analysis.recommendations.length;
    index += 1
  ) {
    const recommendation =
      analysis.recommendations[index];

    if (!recommendation) continue;

    const priority: ExecutiveCopilotPriority =
      actions.length === 0 && analysis.score < 70
        ? 'high'
        : 'medium';

    actions.push(
      Object.freeze({
        id: `analysis-action-${index + 1}`,
        title: normalizeActionTitle(
          recommendation,
          `Önerilen aksiyon ${index + 1}`
        ),
        description: recommendation,
        priority,
        source: 'analysis',
        dueLabel: actionDueLabel(priority)
      })
    );
  }

  const unique = new Map<
    string,
    ExecutiveCopilotAction
  >();

  for (const action of actions) {
    const key = action.description
      .trim()
      .toLocaleLowerCase('tr-TR');

    if (!unique.has(key)) {
      unique.set(key, action);
    }
  }

  return Object.freeze(
    [...unique.values()]
      .sort((left, right) => {
        const priorityRank: Record<
          ExecutiveCopilotPriority,
          number
        > = {
          critical: 4,
          high: 3,
          medium: 2,
          low: 1
        };

        return (
          priorityRank[right.priority] -
          priorityRank[left.priority]
        );
      })
      .slice(0, 5)
  );
}

function buildConfidence(
  analysis: StoredBusinessDocumentAnalysis,
  comparison?: BusinessPeriodComparisonResult,
  forecast?: BusinessForecastResult
): ExecutiveCopilotConfidence {
  let score = 35;
  const reasons: string[] = [];

  if (analysis.kpis.length >= 5) {
    score += 25;
    reasons.push('Yeterli sayıda KPI üretildi.');
  } else {
    reasons.push('KPI kapsamı sınırlı.');
  }

  if (comparison?.hasComparableData) {
    score += 20;
    reasons.push('Önceki dönem karşılaştırması mevcut.');
  } else {
    reasons.push('Karşılaştırmalı dönem verisi bulunmuyor.');
  }

  if (forecast?.hasForecastData) {
    score += 20;
    reasons.push('Tahmin için yeterli geçmiş veri mevcut.');
  } else {
    reasons.push('Tahmin geçmişi sınırlı veya yetersiz.');
  }

  const normalizedScore = clampScore(score);

  const level =
    normalizedScore >= 80
      ? 'high'
      : normalizedScore >= 55
        ? 'medium'
        : 'low';

  return Object.freeze({
    score: normalizedScore,
    level,
    label:
      level === 'high'
        ? 'Yüksek veri güveni'
        : level === 'medium'
          ? 'Orta veri güveni'
          : 'Düşük veri güveni',
    reasons: Object.freeze(reasons)
  });
}

function buildDailySummary(
  analysis: StoredBusinessDocumentAnalysis,
  health: ExecutiveCopilotHealth,
  topRisk?: ExecutiveCopilotSignal,
  topOpportunity?: ExecutiveCopilotSignal
): string {
  const parts = [
    `İşletme sağlık skoru ${health.score}/100.`,
    analysis.summary
  ];

  if (topRisk) {
    parts.push(`Öncelikli risk: ${topRisk.title}.`);
  }

  if (topOpportunity) {
    parts.push(
      `Öne çıkan fırsat: ${topOpportunity.title}.`
    );
  }

  return parts.join(' ');
}

export class ExecutiveCopilotBuilder {
  build(
    input: ExecutiveCopilotBuilderInput
  ): ExecutiveCopilotResult {
    const health = buildHealth(
      input.analysis.score,
      input.comparison
    );

    const topRisk = buildTopRisk(
      input.alerts,
      input.comparison
    );

    const topOpportunity = buildTopOpportunity(
      input.comparison
    );

    const actions = buildActions(
      input.analysis,
      input.alerts
    );

    const confidence = buildConfidence(
      input.analysis,
      input.comparison,
      input.forecast
    );

    return Object.freeze({
      generatedAt:
        input.generatedAt ?? new Date().toISOString(),
      businessId: input.analysis.businessId,
      analysisId: input.analysis.id,
      health,
      dailySummary: buildDailySummary(
        input.analysis,
        health,
        topRisk,
        topOpportunity
      ),
      topRisk,
      topOpportunity,
      actions,
      confidence,
      disclosure:
        'Executive Copilot çıktıları mevcut işletme verileri ve ' +
        'kural tabanlı analiz sonuçları üzerinden oluşturulur; ' +
        'kesin finansal sonuç veya garanti niteliği taşımaz.'
    });
  }
}

export function buildExecutiveCopilotResult(
  input: ExecutiveCopilotBuilderInput
): ExecutiveCopilotResult {
  return new ExecutiveCopilotBuilder().build(input);
}

export default ExecutiveCopilotBuilder;
