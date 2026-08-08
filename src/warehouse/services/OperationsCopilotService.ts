import type {
  OperationsDashboardKpi,
  OperationsDashboardSnapshot,
} from "../types/OperationsDashboard";
import type {
  OperationsExceptionAnalyticsReport,
  OperationsManagementAction,
} from "../types/OperationsExceptionAnalytics";
import type {
  OperationsMetricComparison,
  OperationsPeriodComparison,
} from "../types/OperationsReport";
import type {
  OperationsCopilotAction,
  OperationsCopilotConfidence,
  OperationsCopilotHealth,
  OperationsCopilotPriority,
  OperationsCopilotResult,
  OperationsCopilotSignal,
} from "../types/OperationsCopilot";

export interface OperationsCopilotInput {
  readonly snapshot: OperationsDashboardSnapshot;
  readonly exceptionAnalytics?: OperationsExceptionAnalyticsReport;
  readonly comparison?: OperationsPeriodComparison;
  readonly generatedAt?: string;
}

/**
 * WarehouseIQ AI Copilot için kural tabanlı, izlenebilir ve salt okunur temel.
 * EPIC-009A harici yapay zekâ sağlayıcısına çağrı yapmaz.
 */
export class OperationsCopilotService {
  build(input: OperationsCopilotInput): OperationsCopilotResult {
    this.validateScope(input);

    const health = this.buildHealth(input.snapshot);
    const topRisk = this.buildTopRisk(input);
    const topOpportunity = this.buildTopOpportunity(input.comparison);
    const actions = this.buildActions(input);
    const confidence = this.buildConfidence(input);

    return Object.freeze({
      generatedAt: input.generatedAt ?? new Date().toISOString(),
      tenantId: input.snapshot.tenantId,
      ...(input.snapshot.warehouseId !== undefined
        ? { warehouseId: input.snapshot.warehouseId }
        : {}),
      periodStart: input.snapshot.periodStart,
      periodEnd: input.snapshot.periodEnd,
      health,
      dailySummary: this.buildDailySummary(input, health),
      ...(topRisk !== undefined ? { topRisk } : {}),
      ...(topOpportunity !== undefined ? { topOpportunity } : {}),
      actions,
      confidence,
      grounding: Object.freeze({
        snapshotId: input.snapshot.id,
        snapshotCalculatedAt: input.snapshot.calculatedAt,
        ...(input.exceptionAnalytics !== undefined
          ? {
              exceptionAnalyticsCalculatedAt:
                input.exceptionAnalytics.calculatedAt,
            }
          : {}),
        ...(input.comparison !== undefined
          ? { comparisonCalculatedAt: input.comparison.calculatedAt }
          : {}),
      }),
      disclosure:
        "WarehouseIQ AI Copilot çıktıları mevcut operasyon snapshot'ı, " +
        "istisna analizi ve dönem karşılaştırmalarından kural tabanlı " +
        "olarak oluşturulur. EPIC-009A aşamasında harici model çağrısı " +
        "yapılmaz ve Copilot operasyon verisini değiştirmez.",
    });
  }

  private validateScope(input: OperationsCopilotInput): void {
    const { snapshot, exceptionAnalytics, comparison } = input;

    if (
      exceptionAnalytics !== undefined &&
      (exceptionAnalytics.tenantId !== snapshot.tenantId ||
        exceptionAnalytics.warehouseId !== snapshot.warehouseId)
    ) {
      throw new Error(
        "Copilot istisna analizi snapshot ile aynı firma ve depo kapsamında olmalıdır.",
      );
    }

    if (comparison !== undefined) {
      for (const summary of [comparison.current, comparison.previous]) {
        if (
          summary.tenantId !== snapshot.tenantId ||
          summary.warehouseId !== snapshot.warehouseId
        ) {
          throw new Error(
            "Copilot dönem karşılaştırması snapshot ile aynı firma ve depo kapsamında olmalıdır.",
          );
        }
      }
    }
  }

  private buildHealth(
    snapshot: OperationsDashboardSnapshot,
  ): OperationsCopilotHealth {
    return Object.freeze({
      score: snapshot.healthScore,
      status: snapshot.healthStatus,
      statusLabel:
        snapshot.healthStatus === "healthy"
          ? "Sağlıklı"
          : snapshot.healthStatus === "attention"
            ? "Dikkat gerekli"
            : "Kritik",
    });
  }

  private buildTopRisk(
    input: OperationsCopilotInput,
  ): OperationsCopilotSignal | undefined {
    const action = input.exceptionAnalytics?.managementActions.find(
      (item) => item.priority === "immediate" || item.priority === "high",
    );

    if (action !== undefined) {
      return Object.freeze({
        id: `exception-risk-${action.code}`,
        title: action.title,
        description: action.description,
        priority: action.priority,
        source: "exception_analytics",
        ...(action.process !== undefined ? { process: action.process } : {}),
      });
    }

    const kpi = this.rankRiskKpis(input.snapshot.kpis)[0];

    if (kpi !== undefined) {
      return Object.freeze({
        id: `dashboard-risk-${kpi.key}`,
        title: `${kpi.label} hedefin altında`,
        description: `${kpi.label} yüzde ${kpi.value}; hedef yüzde ${kpi.target}.`,
        priority: kpi.status === "critical" ? "high" : "medium",
        source: "dashboard",
        metricKey: kpi.key,
      });
    }

    const declining = this.rankComparisonMetrics(
      input.comparison?.metrics.filter(
        (metric) => metric.direction === "declining",
      ) ?? [],
    )[0];

    if (declining === undefined) return undefined;

    return Object.freeze({
      id: `comparison-risk-${declining.key}`,
      title: `${declining.label} geriliyor`,
      description:
        `${declining.label} mevcut değeri ${declining.currentValue}; ` +
        `önceki değer ${declining.previousValue}.`,
      priority: "medium",
      source: "comparison",
    });
  }

  private buildTopOpportunity(
    comparison?: OperationsPeriodComparison,
  ): OperationsCopilotSignal | undefined {
    const improving = this.rankComparisonMetrics(
      comparison?.metrics.filter(
        (metric) => metric.direction === "improving" || metric.improved,
      ) ?? [],
    )[0];

    if (improving === undefined) return undefined;

    return Object.freeze({
      id: `comparison-opportunity-${improving.key}`,
      title: `${improving.label} iyileşiyor`,
      description:
        `${improving.label} mevcut değeri ${improving.currentValue}; ` +
        `önceki değer ${improving.previousValue}.`,
      priority: "medium",
      source: "comparison",
    });
  }

  private buildActions(
    input: OperationsCopilotInput,
  ): readonly OperationsCopilotAction[] {
    const actions: OperationsCopilotAction[] = [];

    for (const action of input.exceptionAnalytics?.managementActions ?? []) {
      actions.push(this.mapManagementAction(action));
    }

    for (const kpi of this.rankRiskKpis(input.snapshot.kpis)) {
      const priority: OperationsCopilotPriority =
        kpi.status === "critical" ? "high" : "medium";

      actions.push(
        Object.freeze({
          id: `dashboard-action-${kpi.key}`,
          title: `${kpi.label} sapmasını giderin`,
          description:
            `${kpi.label} yüzde ${kpi.value}; hedef yüzde ${kpi.target}. ` +
            "İlgili operasyon süreci ve kapasite planı kontrol edilmelidir.",
          priority,
          source: "dashboard",
          dueLabel: this.dueLabel(priority),
          metricKey: kpi.key,
        }),
      );
    }

    const unique = new Map<string, OperationsCopilotAction>();

    for (const action of actions) {
      const key = action.title.trim().toLocaleLowerCase("tr-TR");
      if (!unique.has(key)) unique.set(key, action);
    }

    return Object.freeze(
      [...unique.values()]
        .sort(
          (left, right) =>
            this.priorityRank(right.priority) -
            this.priorityRank(left.priority),
        )
        .slice(0, 5),
    );
  }

  private mapManagementAction(
    action: OperationsManagementAction,
  ): OperationsCopilotAction {
    return Object.freeze({
      id: `exception-action-${action.code}`,
      title: action.title,
      description: action.description,
      priority: action.priority,
      source: "exception_analytics",
      dueLabel: this.dueLabel(action.priority),
      ...(action.process !== undefined ? { process: action.process } : {}),
    });
  }

  private buildConfidence(
    input: OperationsCopilotInput,
  ): OperationsCopilotConfidence {
    let score = 50;
    const reasons = ["Güncel operasyon snapshot'ı mevcut."];

    if (input.snapshot.kpis.length >= 5) {
      score += 10;
      reasons.push("Temel operasyon KPI kapsamı yeterli.");
    }
    if (input.exceptionAnalytics !== undefined) {
      score += 20;
      reasons.push("İstisna ve darboğaz analizi mevcut.");
    }
    if (input.comparison !== undefined) {
      score += 20;
      reasons.push("Dönem karşılaştırması mevcut.");
    }

    const normalizedScore = Math.min(100, Math.max(0, score));
    const level =
      normalizedScore >= 80 ? "high" : normalizedScore >= 60 ? "medium" : "low";

    return Object.freeze({
      score: normalizedScore,
      level,
      label:
        level === "high"
          ? "Yüksek veri güveni"
          : level === "medium"
            ? "Orta veri güveni"
            : "Düşük veri güveni",
      reasons: Object.freeze(reasons),
    });
  }

  private buildDailySummary(
    input: OperationsCopilotInput,
    health: OperationsCopilotHealth,
  ): string {
    const parts = [
      `Depo sağlık skoru ${health.score}/100 (${health.statusLabel}).`,
    ];

    const riskKpis = input.snapshot.kpis.filter(
      (kpi) => kpi.status !== "good",
    );

    if (riskKpis.length > 0) {
      parts.push(`${riskKpis.length} KPI hedef dışı.`);
    }
    if (input.exceptionAnalytics !== undefined) {
      parts.push(
        `${input.exceptionAnalytics.unresolvedExceptions} açık istisna bulunuyor.`,
      );
    }
    if (
      input.comparison !== undefined &&
      input.comparison.decliningMetricCount > 0
    ) {
      parts.push(
        `${input.comparison.decliningMetricCount} metrik önceki döneme göre geriliyor.`,
      );
    }

    return parts.join(" ");
  }

  private rankRiskKpis(
    kpis: readonly OperationsDashboardKpi[],
  ): OperationsDashboardKpi[] {
    const rank = { critical: 2, warning: 1, good: 0 } as const;

    return [...kpis]
      .filter((kpi) => kpi.status !== "good")
      .sort(
        (left, right) =>
          rank[right.status] -
            rank[left.status] ||
          Math.abs(right.target - right.value) -
            Math.abs(left.target - left.value),
      );
  }

  private rankComparisonMetrics(
    metrics: readonly OperationsMetricComparison[],
  ): OperationsMetricComparison[] {
    return [...metrics].sort(
      (left, right) =>
        Math.abs(right.changeRate) - Math.abs(left.changeRate),
    );
  }

  private priorityRank(priority: OperationsCopilotPriority): number {
    if (priority === "immediate") return 4;
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  }

  private dueLabel(priority: OperationsCopilotPriority): string {
    if (priority === "immediate") return "Hemen";
    if (priority === "high") return "Bugün";
    if (priority === "medium") return "Bu vardiya";
    return "Planlama döneminde";
  }
}

export function buildOperationsCopilotResult(
  input: OperationsCopilotInput,
): OperationsCopilotResult {
  return new OperationsCopilotService().build(input);
}

export default OperationsCopilotService;
