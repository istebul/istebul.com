/* eslint-disable */
// Bu dosya WarehouseIQ Copilot TypeScript kaynağından otomatik üretilir.

// src/warehouse/services/OperationsCopilotService.ts
var OperationsCopilotService = class {
  build(input) {
    this.validateScope(input);
    const health = this.buildHealth(input.snapshot);
    const topRisk = this.buildTopRisk(input);
    const topOpportunity = this.buildTopOpportunity(input.comparison);
    const actions = this.buildActions(input);
    const confidence = this.buildConfidence(input);
    return Object.freeze({
      generatedAt: input.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
      tenantId: input.snapshot.tenantId,
      ...input.snapshot.warehouseId !== void 0 ? { warehouseId: input.snapshot.warehouseId } : {},
      periodStart: input.snapshot.periodStart,
      periodEnd: input.snapshot.periodEnd,
      health,
      dailySummary: this.buildDailySummary(input, health),
      ...topRisk !== void 0 ? { topRisk } : {},
      ...topOpportunity !== void 0 ? { topOpportunity } : {},
      actions,
      confidence,
      grounding: Object.freeze({
        snapshotId: input.snapshot.id,
        snapshotCalculatedAt: input.snapshot.calculatedAt,
        ...input.exceptionAnalytics !== void 0 ? {
          exceptionAnalyticsCalculatedAt: input.exceptionAnalytics.calculatedAt
        } : {},
        ...input.comparison !== void 0 ? { comparisonCalculatedAt: input.comparison.calculatedAt } : {}
      }),
      disclosure: "WarehouseIQ AI Copilot \xE7\u0131kt\u0131lar\u0131 mevcut operasyon snapshot'\u0131, istisna analizi ve d\xF6nem kar\u015F\u0131la\u015Ft\u0131rmalar\u0131ndan kural tabanl\u0131 olarak olu\u015Fturulur. EPIC-009A a\u015Famas\u0131nda harici model \xE7a\u011Fr\u0131s\u0131 yap\u0131lmaz ve Copilot operasyon verisini de\u011Fi\u015Ftirmez."
    });
  }
  validateScope(input) {
    const { snapshot, exceptionAnalytics, comparison } = input;
    if (exceptionAnalytics !== void 0 && (exceptionAnalytics.tenantId !== snapshot.tenantId || exceptionAnalytics.warehouseId !== snapshot.warehouseId)) {
      throw new Error(
        "Copilot istisna analizi snapshot ile ayn\u0131 firma ve depo kapsam\u0131nda olmal\u0131d\u0131r."
      );
    }
    if (comparison !== void 0) {
      for (const summary of [comparison.current, comparison.previous]) {
        if (summary.tenantId !== snapshot.tenantId || summary.warehouseId !== snapshot.warehouseId) {
          throw new Error(
            "Copilot d\xF6nem kar\u015F\u0131la\u015Ft\u0131rmas\u0131 snapshot ile ayn\u0131 firma ve depo kapsam\u0131nda olmal\u0131d\u0131r."
          );
        }
      }
    }
  }
  buildHealth(snapshot) {
    return Object.freeze({
      score: snapshot.healthScore,
      status: snapshot.healthStatus,
      statusLabel: snapshot.healthStatus === "healthy" ? "Sa\u011Fl\u0131kl\u0131" : snapshot.healthStatus === "attention" ? "Dikkat gerekli" : "Kritik"
    });
  }
  buildTopRisk(input) {
    const action = input.exceptionAnalytics?.managementActions.find(
      (item) => item.priority === "immediate" || item.priority === "high"
    );
    if (action !== void 0) {
      return Object.freeze({
        id: `exception-risk-${action.code}`,
        title: action.title,
        description: action.description,
        priority: action.priority,
        source: "exception_analytics",
        ...action.process !== void 0 ? { process: action.process } : {}
      });
    }
    const kpi = this.rankRiskKpis(input.snapshot.kpis)[0];
    if (kpi !== void 0) {
      return Object.freeze({
        id: `dashboard-risk-${kpi.key}`,
        title: `${kpi.label} hedefin alt\u0131nda`,
        description: `${kpi.label} y\xFCzde ${kpi.value}; hedef y\xFCzde ${kpi.target}.`,
        priority: kpi.status === "critical" ? "high" : "medium",
        source: "dashboard",
        metricKey: kpi.key
      });
    }
    const declining = this.rankComparisonMetrics(
      input.comparison?.metrics.filter(
        (metric) => metric.direction === "declining"
      ) ?? []
    )[0];
    if (declining === void 0)
      return void 0;
    return Object.freeze({
      id: `comparison-risk-${declining.key}`,
      title: `${declining.label} geriliyor`,
      description: `${declining.label} mevcut de\u011Feri ${declining.currentValue}; \xF6nceki de\u011Fer ${declining.previousValue}.`,
      priority: "medium",
      source: "comparison"
    });
  }
  buildTopOpportunity(comparison) {
    const improving = this.rankComparisonMetrics(
      comparison?.metrics.filter(
        (metric) => metric.direction === "improving" || metric.improved
      ) ?? []
    )[0];
    if (improving === void 0)
      return void 0;
    return Object.freeze({
      id: `comparison-opportunity-${improving.key}`,
      title: `${improving.label} iyile\u015Fiyor`,
      description: `${improving.label} mevcut de\u011Feri ${improving.currentValue}; \xF6nceki de\u011Fer ${improving.previousValue}.`,
      priority: "medium",
      source: "comparison"
    });
  }
  buildActions(input) {
    const actions = [];
    for (const action of input.exceptionAnalytics?.managementActions ?? []) {
      actions.push(this.mapManagementAction(action));
    }
    for (const kpi of this.rankRiskKpis(input.snapshot.kpis)) {
      const priority = kpi.status === "critical" ? "high" : "medium";
      actions.push(
        Object.freeze({
          id: `dashboard-action-${kpi.key}`,
          title: `${kpi.label} sapmas\u0131n\u0131 giderin`,
          description: `${kpi.label} y\xFCzde ${kpi.value}; hedef y\xFCzde ${kpi.target}. \u0130lgili operasyon s\xFCreci ve kapasite plan\u0131 kontrol edilmelidir.`,
          priority,
          source: "dashboard",
          dueLabel: this.dueLabel(priority),
          metricKey: kpi.key
        })
      );
    }
    const unique = /* @__PURE__ */ new Map();
    for (const action of actions) {
      const key = action.title.trim().toLocaleLowerCase("tr-TR");
      if (!unique.has(key))
        unique.set(key, action);
    }
    return Object.freeze(
      [...unique.values()].sort(
        (left, right) => this.priorityRank(right.priority) - this.priorityRank(left.priority)
      ).slice(0, 5)
    );
  }
  mapManagementAction(action) {
    return Object.freeze({
      id: `exception-action-${action.code}`,
      title: action.title,
      description: action.description,
      priority: action.priority,
      source: "exception_analytics",
      dueLabel: this.dueLabel(action.priority),
      ...action.process !== void 0 ? { process: action.process } : {}
    });
  }
  buildConfidence(input) {
    let score = 50;
    const reasons = ["G\xFCncel operasyon snapshot'\u0131 mevcut."];
    if (input.snapshot.kpis.length >= 5) {
      score += 10;
      reasons.push("Temel operasyon KPI kapsam\u0131 yeterli.");
    }
    if (input.exceptionAnalytics !== void 0) {
      score += 20;
      reasons.push("\u0130stisna ve darbo\u011Faz analizi mevcut.");
    }
    if (input.comparison !== void 0) {
      score += 20;
      reasons.push("D\xF6nem kar\u015F\u0131la\u015Ft\u0131rmas\u0131 mevcut.");
    }
    const normalizedScore = Math.min(100, Math.max(0, score));
    const level = normalizedScore >= 80 ? "high" : normalizedScore >= 60 ? "medium" : "low";
    return Object.freeze({
      score: normalizedScore,
      level,
      label: level === "high" ? "Y\xFCksek veri g\xFCveni" : level === "medium" ? "Orta veri g\xFCveni" : "D\xFC\u015F\xFCk veri g\xFCveni",
      reasons: Object.freeze(reasons)
    });
  }
  buildDailySummary(input, health) {
    const parts = [
      `Depo sa\u011Fl\u0131k skoru ${health.score}/100 (${health.statusLabel}).`
    ];
    const riskKpis = input.snapshot.kpis.filter(
      (kpi) => kpi.status !== "good"
    );
    if (riskKpis.length > 0) {
      parts.push(`${riskKpis.length} KPI hedef d\u0131\u015F\u0131.`);
    }
    if (input.exceptionAnalytics !== void 0) {
      parts.push(
        `${input.exceptionAnalytics.unresolvedExceptions} a\xE7\u0131k istisna bulunuyor.`
      );
    }
    if (input.comparison !== void 0 && input.comparison.decliningMetricCount > 0) {
      parts.push(
        `${input.comparison.decliningMetricCount} metrik \xF6nceki d\xF6neme g\xF6re geriliyor.`
      );
    }
    return parts.join(" ");
  }
  rankRiskKpis(kpis) {
    const rank = { critical: 2, warning: 1, good: 0 };
    return [...kpis].filter((kpi) => kpi.status !== "good").sort(
      (left, right) => rank[right.status] - rank[left.status] || Math.abs(right.target - right.value) - Math.abs(left.target - left.value)
    );
  }
  rankComparisonMetrics(metrics) {
    return [...metrics].sort(
      (left, right) => Math.abs(right.changeRate) - Math.abs(left.changeRate)
    );
  }
  priorityRank(priority) {
    if (priority === "immediate")
      return 4;
    if (priority === "high")
      return 3;
    if (priority === "medium")
      return 2;
    return 1;
  }
  dueLabel(priority) {
    if (priority === "immediate")
      return "Hemen";
    if (priority === "high")
      return "Bug\xFCn";
    if (priority === "medium")
      return "Bu vardiya";
    return "Planlama d\xF6neminde";
  }
};

// src/warehouse/types/InventoryErrors.ts
var InventoryValidationError = class extends Error {
  code = "INVENTORY_VALIDATION_ERROR";
  constructor(message) {
    super(message);
    this.name = "InventoryValidationError";
  }
};

// src/warehouse/services/OperationsExceptionAnalyticsService.ts
var PROCESS_LABELS = {
  receiving: "Mal kabul",
  quality_control: "Kalite kontrol",
  putaway: "Yerle\u015Ftirme",
  replenishment: "\u0130kmal",
  picking: "Toplama",
  wave_planning: "Dalga planlama",
  packing: "Paketleme",
  shipping: "Sevkiyat",
  cycle_count: "D\xF6ng\xFCsel say\u0131m",
  inventory: "Stok y\xF6netimi"
};
var PROCESSES = Object.keys(
  PROCESS_LABELS
);
var CATEGORIES = [
  "delay",
  "quality",
  "inventory",
  "capacity",
  "equipment",
  "labor",
  "system",
  "carrier",
  "other"
];
var SEVERITIES = [
  "info",
  "warning",
  "critical"
];
var OperationsExceptionAnalyticsService = class {
  repository;
  now;
  idFactory;
  constructor(dependencies) {
    this.repository = dependencies.repository;
    this.now = dependencies.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
    this.idFactory = dependencies.idFactory ?? (() => crypto.randomUUID());
  }
  async recordException(input) {
    const tenantId = this.requiredText(
      input.tenantId,
      "Firma kimli\u011Fi"
    );
    const warehouseId = input.warehouseId === void 0 ? void 0 : this.requiredText(
      input.warehouseId,
      "Depo kimli\u011Fi"
    );
    const process = this.requireProcess(
      input.process
    );
    const category = this.requireCategory(
      input.category
    );
    const severity = this.requireSeverity(
      input.severity
    );
    const occurredAt = this.requiredDate(
      input.occurredAt,
      "\u0130stisna olu\u015Fma tarihi"
    );
    const resolvedAt = input.resolvedAt === void 0 ? void 0 : this.requiredDate(
      input.resolvedAt,
      "\u0130stisna \xE7\xF6z\xFCm tarihi"
    );
    if (resolvedAt !== void 0 && resolvedAt < occurredAt) {
      throw new InventoryValidationError(
        "\u0130stisna \xE7\xF6z\xFCm tarihi, olu\u015Fma tarihinden \xF6nce olamaz."
      );
    }
    const record = {
      id: this.idFactory(),
      tenantId,
      ...warehouseId !== void 0 ? { warehouseId } : {},
      process,
      category,
      code: this.requiredText(
        input.code,
        "\u0130stisna kodu"
      ).toUpperCase(),
      severity,
      rootCause: this.requiredText(
        input.rootCause,
        "K\xF6k neden"
      ),
      description: this.requiredText(
        input.description,
        "\u0130stisna a\xE7\u0131klamas\u0131"
      ),
      occurredAt,
      ...resolvedAt !== void 0 ? { resolvedAt } : {},
      ...input.resolutionNote !== void 0 ? {
        resolutionNote: this.requiredText(
          input.resolutionNote,
          "\xC7\xF6z\xFCm notu"
        )
      } : {},
      delayMinutes: this.nonNegative(
        input.delayMinutes ?? 0,
        "Gecikme s\xFCresi"
      ),
      impactedOrders: this.nonNegativeInteger(
        input.impactedOrders ?? 0,
        "Etkilenen sipari\u015F say\u0131s\u0131"
      ),
      impactedTasks: this.nonNegativeInteger(
        input.impactedTasks ?? 0,
        "Etkilenen g\xF6rev say\u0131s\u0131"
      ),
      impactedItems: this.nonNegative(
        input.impactedItems ?? 0,
        "Etkilenen \xFCr\xFCn miktar\u0131"
      ),
      createdAt: this.now()
    };
    return this.repository.save(
      record
    );
  }
  async analyze(filter, volumes) {
    const normalizedFilter = this.normalizeFilter(filter);
    const normalizedVolumes = this.normalizeVolumes(
      volumes
    );
    const records = await this.repository.list(
      normalizedFilter
    );
    const processSummaries = this.buildProcessSummaries(
      records,
      normalizedVolumes
    );
    const rootCausePareto = this.buildRootCausePareto(
      records
    );
    const bottlenecks = this.buildBottlenecks(
      processSummaries
    );
    const managementActions = this.buildManagementActions(
      records,
      rootCausePareto,
      bottlenecks
    );
    return {
      tenantId: normalizedFilter.tenantId,
      ...normalizedFilter.warehouseId !== void 0 ? {
        warehouseId: normalizedFilter.warehouseId
      } : {},
      periodStart: normalizedFilter.periodStart,
      periodEnd: normalizedFilter.periodEnd,
      totalExceptions: records.length,
      unresolvedExceptions: records.filter(
        (record) => record.resolvedAt === void 0
      ).length,
      criticalExceptions: records.filter(
        (record) => record.severity === "critical"
      ).length,
      totalDelayMinutes: this.round(
        records.reduce(
          (total, record) => total + record.delayMinutes,
          0
        )
      ),
      impactedOrders: records.reduce(
        (total, record) => total + record.impactedOrders,
        0
      ),
      impactedTasks: records.reduce(
        (total, record) => total + record.impactedTasks,
        0
      ),
      impactedItems: this.round(
        records.reduce(
          (total, record) => total + record.impactedItems,
          0
        )
      ),
      processSummaries,
      rootCausePareto,
      bottlenecks,
      managementActions,
      calculatedAt: this.now()
    };
  }
  buildProcessSummaries(records, volumes) {
    const processes = /* @__PURE__ */ new Map();
    for (const process of PROCESSES) {
      processes.set(
        process,
        {
          operationCount: 0,
          records: []
        }
      );
    }
    for (const volume of volumes) {
      const accumulator = processes.get(
        volume.process
      );
      accumulator.operationCount = volume.operationCount;
    }
    for (const record of records) {
      processes.get(
        record.process
      ).records.push(
        record
      );
    }
    return [...processes.entries()].map(
      ([process, accumulator]) => this.summarizeProcess(
        process,
        accumulator
      )
    ).filter(
      (summary) => summary.operationCount > 0 || summary.exceptionCount > 0
    ).sort(
      (left, right) => right.errorRate - left.errorRate || right.criticalCount - left.criticalCount || right.totalDelayMinutes - left.totalDelayMinutes || left.label.localeCompare(
        right.label,
        "tr"
      )
    );
  }
  summarizeProcess(process, accumulator) {
    const records = accumulator.records;
    const totalDelayMinutes = records.reduce(
      (total, record) => total + record.delayMinutes,
      0
    );
    const resolutionDurations = records.filter(
      (record) => record.resolvedAt !== void 0
    ).map(
      (record) => (Date.parse(
        record.resolvedAt
      ) - Date.parse(
        record.occurredAt
      )) / 6e4
    );
    const averageResolutionMinutes = resolutionDurations.length === 0 ? 0 : resolutionDurations.reduce(
      (total, duration) => total + duration,
      0
    ) / resolutionDurations.length;
    return {
      process,
      label: PROCESS_LABELS[process],
      operationCount: accumulator.operationCount,
      exceptionCount: records.length,
      unresolvedCount: records.filter(
        (record) => record.resolvedAt === void 0
      ).length,
      criticalCount: records.filter(
        (record) => record.severity === "critical"
      ).length,
      totalDelayMinutes: this.round(
        totalDelayMinutes
      ),
      averageDelayMinutes: records.length === 0 ? 0 : this.round(
        totalDelayMinutes / records.length
      ),
      averageResolutionMinutes: this.round(
        averageResolutionMinutes
      ),
      impactedOrders: records.reduce(
        (total, record) => total + record.impactedOrders,
        0
      ),
      impactedTasks: records.reduce(
        (total, record) => total + record.impactedTasks,
        0
      ),
      impactedItems: this.round(
        records.reduce(
          (total, record) => total + record.impactedItems,
          0
        )
      ),
      errorRate: accumulator.operationCount === 0 ? records.length === 0 ? 0 : 100 : this.rate(
        records.length,
        accumulator.operationCount
      )
    };
  }
  buildRootCausePareto(records) {
    if (records.length === 0) {
      return [];
    }
    const causes = /* @__PURE__ */ new Map();
    for (const record of records) {
      const accumulator = causes.get(
        record.rootCause
      ) ?? {
        exceptionCount: 0,
        totalDelayMinutes: 0,
        impactedOrders: 0
      };
      accumulator.exceptionCount += 1;
      accumulator.totalDelayMinutes += record.delayMinutes;
      accumulator.impactedOrders += record.impactedOrders;
      causes.set(
        record.rootCause,
        accumulator
      );
    }
    const sorted = [...causes.entries()].sort(
      (left, right) => right[1].exceptionCount - left[1].exceptionCount || right[1].totalDelayMinutes - left[1].totalDelayMinutes || left[0].localeCompare(
        right[0],
        "tr"
      )
    );
    let cumulativePercentage = 0;
    return sorted.map(
      ([rootCause, accumulator], index) => {
        const percentage = this.rate(
          accumulator.exceptionCount,
          records.length
        );
        const previousCumulative = cumulativePercentage;
        cumulativePercentage = this.round(
          cumulativePercentage + percentage
        );
        return {
          rank: index + 1,
          rootCause,
          exceptionCount: accumulator.exceptionCount,
          percentage,
          cumulativePercentage,
          totalDelayMinutes: this.round(
            accumulator.totalDelayMinutes
          ),
          impactedOrders: accumulator.impactedOrders,
          withinPrimary80Percent: previousCumulative < 80
        };
      }
    );
  }
  buildBottlenecks(summaries) {
    return summaries.filter(
      (summary) => summary.exceptionCount > 0
    ).map(
      (summary) => {
        const score = this.round(
          Math.min(
            40,
            summary.errorRate * 4
          ) + Math.min(
            24,
            summary.unresolvedCount * 8
          ) + Math.min(
            24,
            summary.criticalCount * 12
          ) + Math.min(
            12,
            summary.totalDelayMinutes / 30
          )
        );
        return {
          rank: 0,
          process: summary.process,
          label: summary.label,
          score,
          errorRate: summary.errorRate,
          unresolvedCount: summary.unresolvedCount,
          criticalCount: summary.criticalCount,
          totalDelayMinutes: summary.totalDelayMinutes,
          explanation: this.buildBottleneckExplanation(
            summary
          )
        };
      }
    ).sort(
      (left, right) => right.score - left.score || right.totalDelayMinutes - left.totalDelayMinutes || left.label.localeCompare(
        right.label,
        "tr"
      )
    ).map(
      (bottleneck, index) => ({
        ...bottleneck,
        rank: index + 1
      })
    );
  }
  buildBottleneckExplanation(summary) {
    const parts = [];
    if (summary.errorRate >= 5) {
      parts.push(
        `hata oran\u0131 y\xFCzde ${summary.errorRate}`
      );
    }
    if (summary.criticalCount > 0) {
      parts.push(
        `${summary.criticalCount} kritik istisna`
      );
    }
    if (summary.unresolvedCount > 0) {
      parts.push(
        `${summary.unresolvedCount} \xE7\xF6z\xFClmemi\u015F kay\u0131t`
      );
    }
    if (summary.totalDelayMinutes > 0) {
      parts.push(
        `${summary.totalDelayMinutes} dakika toplam gecikme`
      );
    }
    if (parts.length === 0) {
      return "S\xFCre\xE7te izlenmesi gereken operasyon istisnalar\u0131 bulunuyor.";
    }
    return `${summary.label} s\xFCrecinde ${parts.join(", ")} tespit edildi.`;
  }
  buildManagementActions(records, pareto, bottlenecks) {
    const actions = [];
    const criticalUnresolved = records.filter(
      (record) => record.severity === "critical" && record.resolvedAt === void 0
    );
    if (criticalUnresolved.length > 0) {
      actions.push({
        code: "RESOLVE_CRITICAL_EXCEPTIONS",
        priority: "immediate",
        title: "Kritik istisnalar\u0131 hemen \xE7\xF6z\xFCm kuyru\u011Funa al\u0131n",
        description: `${criticalUnresolved.length} kritik istisna hen\xFCz \xE7\xF6z\xFClmedi. Operasyon sorumlusu, hedef \xE7\xF6z\xFCm s\xFCresi ve takip zaman\u0131 atanmal\u0131d\u0131r.`
      });
    }
    const primaryBottleneck = bottlenecks[0];
    if (primaryBottleneck !== void 0 && primaryBottleneck.score >= 30) {
      actions.push({
        code: "REMOVE_PRIMARY_BOTTLENECK",
        priority: primaryBottleneck.score >= 60 ? "immediate" : "high",
        title: `${primaryBottleneck.label} darbo\u011Faz\u0131n\u0131 azalt\u0131n`,
        description: `${primaryBottleneck.explanation} Kapasite, g\xF6rev da\u011F\u0131l\u0131m\u0131 ve s\xFCre\xE7 kurallar\u0131 ayn\u0131 aksiyon plan\u0131nda incelenmelidir.`,
        process: primaryBottleneck.process
      });
    }
    const primaryCause = pareto.find(
      (item) => item.withinPrimary80Percent
    );
    if (primaryCause !== void 0) {
      actions.push({
        code: "ELIMINATE_PRIMARY_ROOT_CAUSE",
        priority: primaryCause.percentage >= 40 ? "high" : "medium",
        title: `"${primaryCause.rootCause}" k\xF6k nedenini ortadan kald\u0131r\u0131n`,
        description: `Bu k\xF6k neden ${primaryCause.exceptionCount} istisna ve ${primaryCause.totalDelayMinutes} dakika gecikme olu\u015Fturdu. Kal\u0131c\u0131 d\xFCzeltici faaliyet sahibi ve tamamlanma tarihi belirlenmelidir.`
      });
    }
    const totalDelayMinutes = records.reduce(
      (total, record) => total + record.delayMinutes,
      0
    );
    if (totalDelayMinutes >= 120) {
      actions.push({
        code: "RECOVER_OPERATION_DELAY",
        priority: totalDelayMinutes >= 480 ? "high" : "medium",
        title: "Birikmi\u015F operasyon gecikmesini geri kazan\u0131n",
        description: `Toplam ${this.round(totalDelayMinutes)} dakikal\u0131k gecikme bulunuyor. Kritik sipari\u015Fler yeniden \xF6nceliklendirilmeli ve vardiya kapasitesi g\xF6zden ge\xE7irilmelidir.`
      });
    }
    const highErrorProcess = bottlenecks.find(
      (item) => item.errorRate >= 5
    );
    if (highErrorProcess !== void 0) {
      actions.push({
        code: "REDUCE_PROCESS_ERROR_RATE",
        priority: highErrorProcess.errorRate >= 10 ? "high" : "medium",
        title: `${highErrorProcess.label} hata oran\u0131n\u0131 d\xFC\u015F\xFCr\xFCn`,
        description: `S\xFCre\xE7 hata oran\u0131 y\xFCzde ${highErrorProcess.errorRate}. Standart i\u015F ad\u0131mlar\u0131, kullan\u0131c\u0131 e\u011Fitimi ve sistem do\u011Frulamalar\u0131 birlikte kontrol edilmelidir.`,
        process: highErrorProcess.process
      });
    }
    return this.uniqueActions(
      actions
    ).slice(
      0,
      5
    );
  }
  uniqueActions(actions) {
    const seen = /* @__PURE__ */ new Set();
    return actions.filter(
      (action) => {
        if (seen.has(
          action.code
        )) {
          return false;
        }
        seen.add(
          action.code
        );
        return true;
      }
    );
  }
  normalizeFilter(filter) {
    const tenantId = this.requiredText(
      filter.tenantId,
      "Firma kimli\u011Fi"
    );
    const warehouseId = filter.warehouseId === void 0 ? void 0 : this.requiredText(
      filter.warehouseId,
      "Depo kimli\u011Fi"
    );
    const periodStart = this.requiredDate(
      filter.periodStart,
      "D\xF6nem ba\u015Flang\u0131c\u0131"
    );
    const periodEnd = this.requiredDate(
      filter.periodEnd,
      "D\xF6nem biti\u015Fi"
    );
    if (periodStart > periodEnd) {
      throw new InventoryValidationError(
        "D\xF6nem ba\u015Flang\u0131c\u0131, d\xF6nem biti\u015Finden sonra olamaz."
      );
    }
    return {
      tenantId,
      ...warehouseId !== void 0 ? { warehouseId } : {},
      periodStart,
      periodEnd,
      ...filter.process !== void 0 ? {
        process: this.requireProcess(
          filter.process
        )
      } : {},
      ...filter.severity !== void 0 ? {
        severity: this.requireSeverity(
          filter.severity
        )
      } : {},
      ...filter.unresolvedOnly !== void 0 ? {
        unresolvedOnly: filter.unresolvedOnly
      } : {}
    };
  }
  normalizeVolumes(volumes) {
    const processes = /* @__PURE__ */ new Set();
    return volumes.map(
      (volume) => {
        const process = this.requireProcess(
          volume.process
        );
        if (processes.has(
          process
        )) {
          throw new InventoryValidationError(
            `${PROCESS_LABELS[process]} s\xFCreci i\xE7in birden fazla operasyon hacmi tan\u0131mlanamaz.`
          );
        }
        processes.add(
          process
        );
        return {
          process,
          operationCount: this.nonNegativeInteger(
            volume.operationCount,
            `${PROCESS_LABELS[process]} operasyon say\u0131s\u0131`
          )
        };
      }
    );
  }
  requireProcess(process) {
    if (!PROCESSES.includes(
      process
    )) {
      throw new InventoryValidationError(
        "Desteklenmeyen depo operasyon s\xFCreci."
      );
    }
    return process;
  }
  requireCategory(category) {
    if (!CATEGORIES.includes(
      category
    )) {
      throw new InventoryValidationError(
        "Desteklenmeyen istisna kategorisi."
      );
    }
    return category;
  }
  requireSeverity(severity) {
    if (!SEVERITIES.includes(
      severity
    )) {
      throw new InventoryValidationError(
        "Desteklenmeyen istisna \xF6nem seviyesi."
      );
    }
    return severity;
  }
  requiredText(value, label) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InventoryValidationError(
        `${label} zorunludur.`
      );
    }
    return normalized;
  }
  requiredDate(value, label) {
    const normalized = this.requiredText(
      value,
      label
    );
    if (Number.isNaN(
      Date.parse(normalized)
    )) {
      throw new InventoryValidationError(
        `${label} ge\xE7erli bir tarih olmal\u0131d\u0131r.`
      );
    }
    return new Date(
      normalized
    ).toISOString();
  }
  nonNegative(value, label) {
    if (!Number.isFinite(value) || value < 0) {
      throw new InventoryValidationError(
        `${label} s\u0131f\u0131r veya daha b\xFCy\xFCk olmal\u0131d\u0131r.`
      );
    }
    return value;
  }
  nonNegativeInteger(value, label) {
    const normalized = this.nonNegative(
      value,
      label
    );
    if (!Number.isInteger(
      normalized
    )) {
      throw new InventoryValidationError(
        `${label} tam say\u0131 olmal\u0131d\u0131r.`
      );
    }
    return normalized;
  }
  rate(numerator, denominator) {
    if (denominator === 0) {
      return 0;
    }
    return this.round(
      numerator / denominator * 100
    );
  }
  round(value) {
    return Math.round(
      value * 100
    ) / 100;
  }
};

// src/warehouse/services/OperationsReportingService.ts
var METRICS = [
  {
    key: "health_score",
    label: "Operasyon sa\u011Fl\u0131k skoru",
    mode: "higher"
  },
  {
    key: "order_completion",
    label: "Sipari\u015F tamamlama",
    mode: "higher"
  },
  {
    key: "on_time_dispatch",
    label: "Zaman\u0131nda sevkiyat",
    mode: "higher"
  },
  {
    key: "task_completion",
    label: "G\xF6rev tamamlama",
    mode: "higher"
  },
  {
    key: "task_exception",
    label: "G\xF6rev istisna oran\u0131",
    mode: "lower"
  },
  {
    key: "inventory_accuracy",
    label: "Stok do\u011Frulu\u011Fu",
    mode: "higher"
  },
  {
    key: "capacity_utilization",
    label: "Kapasite kullan\u0131m\u0131",
    mode: "target",
    target: 90
  },
  {
    key: "labor_utilization",
    label: "Personel verimlili\u011Fi",
    mode: "higher"
  },
  {
    key: "item_fulfillment",
    label: "\xDCr\xFCn kar\u015F\u0131lama",
    mode: "higher"
  },
  {
    key: "short_pick",
    label: "Eksik toplama oran\u0131",
    mode: "lower"
  }
];
var OperationsReportingService = class {
  repository;
  now;
  constructor(dependencies) {
    this.repository = dependencies.repository;
    this.now = dependencies.now ?? (() => (/* @__PURE__ */ new Date()).toISOString());
  }
  async comparePeriods(filter) {
    const normalized = this.normalizeComparisonFilter(
      filter
    );
    const [currentSnapshots, previousSnapshots] = await Promise.all([
      this.repository.list({
        tenantId: normalized.tenantId,
        ...normalized.warehouseId !== void 0 ? {
          warehouseId: normalized.warehouseId
        } : {},
        periodStart: normalized.currentPeriodStart,
        periodEnd: normalized.currentPeriodEnd
      }),
      this.repository.list({
        tenantId: normalized.tenantId,
        ...normalized.warehouseId !== void 0 ? {
          warehouseId: normalized.warehouseId
        } : {},
        periodStart: normalized.previousPeriodStart,
        periodEnd: normalized.previousPeriodEnd
      })
    ]);
    this.requireSnapshots(
      currentSnapshots,
      "G\xFCncel d\xF6nem"
    );
    this.requireSnapshots(
      previousSnapshots,
      "\xD6nceki d\xF6nem"
    );
    const current = this.summarize(
      {
        tenantId: normalized.tenantId,
        ...normalized.warehouseId !== void 0 ? {
          warehouseId: normalized.warehouseId
        } : {},
        periodStart: normalized.currentPeriodStart,
        periodEnd: normalized.currentPeriodEnd
      },
      currentSnapshots
    );
    const previous = this.summarize(
      {
        tenantId: normalized.tenantId,
        ...normalized.warehouseId !== void 0 ? {
          warehouseId: normalized.warehouseId
        } : {},
        periodStart: normalized.previousPeriodStart,
        periodEnd: normalized.previousPeriodEnd
      },
      previousSnapshots
    );
    const metrics = METRICS.map(
      (definition) => this.compareMetric(
        definition,
        current,
        previous
      )
    );
    const improvingMetricCount = metrics.filter(
      (metric) => metric.direction === "improving"
    ).length;
    const decliningMetricCount = metrics.filter(
      (metric) => metric.direction === "declining"
    ).length;
    return {
      current,
      previous,
      metrics,
      improvingMetricCount,
      decliningMetricCount,
      improved: improvingMetricCount > decliningMetricCount,
      calculatedAt: this.now()
    };
  }
  async buildTrend(filter) {
    const normalized = this.normalizeTrendFilter(
      filter
    );
    const definition = this.requireMetric(
      normalized.metric
    );
    const snapshots = await this.repository.list({
      tenantId: normalized.tenantId,
      ...normalized.warehouseId !== void 0 ? {
        warehouseId: normalized.warehouseId
      } : {},
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd
    });
    this.requireSnapshots(
      snapshots,
      "Trend d\xF6nemi"
    );
    const points = [...snapshots].sort(
      (left, right) => left.periodStart.localeCompare(
        right.periodStart
      ) || left.calculatedAt.localeCompare(
        right.calculatedAt
      )
    ).map(
      (snapshot) => ({
        snapshotId: snapshot.id,
        ...snapshot.warehouseId !== void 0 ? {
          warehouseId: snapshot.warehouseId
        } : {},
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        value: this.metricValueFromSnapshot(
          normalized.metric,
          snapshot
        ),
        healthStatus: snapshot.healthStatus
      })
    );
    const firstValue = points[0].value;
    const lastValue = points[points.length - 1].value;
    return {
      tenantId: normalized.tenantId,
      ...normalized.warehouseId !== void 0 ? {
        warehouseId: normalized.warehouseId
      } : {},
      metric: normalized.metric,
      label: definition.label,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
      points,
      firstValue,
      lastValue,
      change: this.round(
        lastValue - firstValue
      ),
      direction: this.resolveDirection(
        definition,
        firstValue,
        lastValue
      ),
      calculatedAt: this.now()
    };
  }
  async buildWarehouseReport(filter) {
    const normalized = this.normalizeReportFilter(
      filter,
      false
    );
    const snapshots = await this.repository.list({
      tenantId: normalized.tenantId,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd
    });
    const warehouseGroups = /* @__PURE__ */ new Map();
    for (const snapshot of snapshots) {
      if (!snapshot.warehouseId) {
        continue;
      }
      const warehouseSnapshots = warehouseGroups.get(
        snapshot.warehouseId
      ) ?? [];
      warehouseSnapshots.push(
        snapshot
      );
      warehouseGroups.set(
        snapshot.warehouseId,
        warehouseSnapshots
      );
    }
    if (warehouseGroups.size === 0) {
      throw new InventoryValidationError(
        "Depo performans raporu i\xE7in kay\u0131tl\u0131 dashboard verisi bulunamad\u0131."
      );
    }
    const summaries = [...warehouseGroups.entries()].map(
      ([warehouseId, items]) => this.summarize(
        {
          tenantId: normalized.tenantId,
          warehouseId,
          periodStart: normalized.periodStart,
          periodEnd: normalized.periodEnd
        },
        items
      )
    ).sort(
      (left, right) => right.healthScore - left.healthScore || right.onTimeDispatchRate - left.onTimeDispatchRate || right.inventoryAccuracyRate - left.inventoryAccuracyRate || (left.warehouseId ?? "").localeCompare(
        right.warehouseId ?? ""
      )
    );
    return {
      tenantId: normalized.tenantId,
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
      warehouseCount: summaries.length,
      warehouses: summaries.map(
        (summary, index) => ({
          rank: index + 1,
          warehouseId: summary.warehouseId,
          summary
        })
      ),
      calculatedAt: this.now()
    };
  }
  summarize(filter, snapshots) {
    const normalized = this.normalizeReportFilter(
      filter,
      true
    );
    this.requireSnapshots(
      snapshots,
      "Rapor d\xF6nemi"
    );
    for (const snapshot of snapshots) {
      if (snapshot.tenantId !== normalized.tenantId) {
        throw new InventoryValidationError(
          "Dashboard kayd\u0131 farkl\u0131 bir firmaya aittir."
        );
      }
      if (normalized.warehouseId !== void 0 && snapshot.warehouseId !== normalized.warehouseId) {
        throw new InventoryValidationError(
          "Dashboard kayd\u0131 farkl\u0131 bir depoya aittir."
        );
      }
    }
    const totals = snapshots.reduce(
      (accumulator, snapshot) => ({
        totalOrders: accumulator.totalOrders + snapshot.totalOrders,
        completedOrders: accumulator.completedOrders + snapshot.completedOrders,
        onTimeOrders: accumulator.onTimeOrders + snapshot.onTimeOrders,
        totalTasks: accumulator.totalTasks + snapshot.totalTasks,
        completedTasks: accumulator.completedTasks + snapshot.completedTasks,
        exceptionTasks: accumulator.exceptionTasks + snapshot.exceptionTasks,
        totalInventoryChecks: accumulator.totalInventoryChecks + snapshot.totalInventoryChecks,
        accurateInventoryChecks: accumulator.accurateInventoryChecks + snapshot.accurateInventoryChecks,
        usedCapacity: accumulator.usedCapacity + snapshot.usedCapacity,
        totalCapacity: accumulator.totalCapacity + snapshot.totalCapacity,
        productiveMinutes: accumulator.productiveMinutes + snapshot.productiveMinutes,
        availableLaborMinutes: accumulator.availableLaborMinutes + snapshot.availableLaborMinutes,
        requestedItems: accumulator.requestedItems + snapshot.requestedItems,
        fulfilledItems: accumulator.fulfilledItems + snapshot.fulfilledItems,
        shortItems: accumulator.shortItems + snapshot.shortItems,
        healthScoreTotal: accumulator.healthScoreTotal + snapshot.healthScore
      }),
      {
        totalOrders: 0,
        completedOrders: 0,
        onTimeOrders: 0,
        totalTasks: 0,
        completedTasks: 0,
        exceptionTasks: 0,
        totalInventoryChecks: 0,
        accurateInventoryChecks: 0,
        usedCapacity: 0,
        totalCapacity: 0,
        productiveMinutes: 0,
        availableLaborMinutes: 0,
        requestedItems: 0,
        fulfilledItems: 0,
        shortItems: 0,
        healthScoreTotal: 0
      }
    );
    const healthScore = this.round(
      totals.healthScoreTotal / snapshots.length
    );
    return {
      tenantId: normalized.tenantId,
      ...normalized.warehouseId !== void 0 ? {
        warehouseId: normalized.warehouseId
      } : {},
      periodStart: normalized.periodStart,
      periodEnd: normalized.periodEnd,
      snapshotCount: snapshots.length,
      totalOrders: totals.totalOrders,
      completedOrders: totals.completedOrders,
      totalTasks: totals.totalTasks,
      completedTasks: totals.completedTasks,
      requestedItems: totals.requestedItems,
      fulfilledItems: totals.fulfilledItems,
      orderCompletionRate: this.rate(
        totals.completedOrders,
        totals.totalOrders
      ),
      onTimeDispatchRate: this.rate(
        totals.onTimeOrders,
        totals.completedOrders
      ),
      taskCompletionRate: this.rate(
        totals.completedTasks,
        totals.totalTasks
      ),
      taskExceptionRate: this.rate(
        totals.exceptionTasks,
        totals.totalTasks
      ),
      inventoryAccuracyRate: this.rate(
        totals.accurateInventoryChecks,
        totals.totalInventoryChecks
      ),
      capacityUtilizationRate: this.rate(
        totals.usedCapacity,
        totals.totalCapacity
      ),
      laborUtilizationRate: this.rate(
        totals.productiveMinutes,
        totals.availableLaborMinutes
      ),
      itemFulfillmentRate: this.rate(
        totals.fulfilledItems,
        totals.requestedItems
      ),
      shortPickRate: this.rate(
        totals.shortItems,
        totals.requestedItems
      ),
      healthScore,
      healthStatus: this.resolveHealthStatus(
        healthScore
      )
    };
  }
  compareMetric(definition, current, previous) {
    const currentValue = this.metricValueFromSummary(
      definition.key,
      current
    );
    const previousValue = this.metricValueFromSummary(
      definition.key,
      previous
    );
    const change = this.round(
      currentValue - previousValue
    );
    const direction = this.resolveDirection(
      definition,
      previousValue,
      currentValue
    );
    return {
      key: definition.key,
      label: definition.label,
      currentValue,
      previousValue,
      change,
      changeRate: this.changeRate(
        previousValue,
        currentValue
      ),
      direction,
      improved: direction === "improving"
    };
  }
  resolveDirection(definition, previousValue, currentValue) {
    const epsilon = 0.01;
    if (Math.abs(
      currentValue - previousValue
    ) <= epsilon) {
      return "stable";
    }
    if (definition.mode === "higher") {
      return currentValue > previousValue ? "improving" : "declining";
    }
    if (definition.mode === "lower") {
      return currentValue < previousValue ? "improving" : "declining";
    }
    const target = definition.target ?? 0;
    const previousDistance = Math.abs(
      previousValue - target
    );
    const currentDistance = Math.abs(
      currentValue - target
    );
    if (Math.abs(
      currentDistance - previousDistance
    ) <= epsilon) {
      return "stable";
    }
    return currentDistance < previousDistance ? "improving" : "declining";
  }
  metricValueFromSummary(key, summary) {
    switch (key) {
      case "health_score":
        return summary.healthScore;
      case "order_completion":
        return summary.orderCompletionRate;
      case "on_time_dispatch":
        return summary.onTimeDispatchRate;
      case "task_completion":
        return summary.taskCompletionRate;
      case "task_exception":
        return summary.taskExceptionRate;
      case "inventory_accuracy":
        return summary.inventoryAccuracyRate;
      case "capacity_utilization":
        return summary.capacityUtilizationRate;
      case "labor_utilization":
        return summary.laborUtilizationRate;
      case "item_fulfillment":
        return summary.itemFulfillmentRate;
      case "short_pick":
        return summary.shortPickRate;
    }
  }
  metricValueFromSnapshot(key, snapshot) {
    switch (key) {
      case "health_score":
        return snapshot.healthScore;
      case "order_completion":
        return snapshot.orderCompletionRate;
      case "on_time_dispatch":
        return snapshot.onTimeDispatchRate;
      case "task_completion":
        return snapshot.taskCompletionRate;
      case "task_exception":
        return snapshot.taskExceptionRate;
      case "inventory_accuracy":
        return snapshot.inventoryAccuracyRate;
      case "capacity_utilization":
        return snapshot.capacityUtilizationRate;
      case "labor_utilization":
        return snapshot.laborUtilizationRate;
      case "item_fulfillment":
        return snapshot.itemFulfillmentRate;
      case "short_pick":
        return snapshot.shortPickRate;
    }
  }
  normalizeComparisonFilter(filter) {
    const tenantId = this.requiredText(
      filter.tenantId,
      "Firma kimli\u011Fi"
    );
    const warehouseId = filter.warehouseId === void 0 ? void 0 : this.requiredText(
      filter.warehouseId,
      "Depo kimli\u011Fi"
    );
    const currentPeriodStart = this.requiredDate(
      filter.currentPeriodStart,
      "G\xFCncel d\xF6nem ba\u015Flang\u0131c\u0131"
    );
    const currentPeriodEnd = this.requiredDate(
      filter.currentPeriodEnd,
      "G\xFCncel d\xF6nem biti\u015Fi"
    );
    const previousPeriodStart = this.requiredDate(
      filter.previousPeriodStart,
      "\xD6nceki d\xF6nem ba\u015Flang\u0131c\u0131"
    );
    const previousPeriodEnd = this.requiredDate(
      filter.previousPeriodEnd,
      "\xD6nceki d\xF6nem biti\u015Fi"
    );
    this.validatePeriod(
      currentPeriodStart,
      currentPeriodEnd,
      "G\xFCncel d\xF6nem"
    );
    this.validatePeriod(
      previousPeriodStart,
      previousPeriodEnd,
      "\xD6nceki d\xF6nem"
    );
    return {
      tenantId,
      ...warehouseId !== void 0 ? { warehouseId } : {},
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd
    };
  }
  normalizeTrendFilter(filter) {
    const normalized = this.normalizeReportFilter(
      filter,
      true
    );
    this.requireMetric(
      filter.metric
    );
    return {
      ...normalized,
      metric: filter.metric
    };
  }
  normalizeReportFilter(filter, allowWarehouseId) {
    const tenantId = this.requiredText(
      filter.tenantId,
      "Firma kimli\u011Fi"
    );
    const warehouseId = filter.warehouseId === void 0 ? void 0 : this.requiredText(
      filter.warehouseId,
      "Depo kimli\u011Fi"
    );
    if (!allowWarehouseId && warehouseId !== void 0) {
      throw new InventoryValidationError(
        "Depo kar\u015F\u0131la\u015Ft\u0131rma raporunda depo filtresi kullan\u0131lamaz."
      );
    }
    const periodStart = this.requiredDate(
      filter.periodStart,
      "D\xF6nem ba\u015Flang\u0131c\u0131"
    );
    const periodEnd = this.requiredDate(
      filter.periodEnd,
      "D\xF6nem biti\u015Fi"
    );
    this.validatePeriod(
      periodStart,
      periodEnd,
      "Rapor d\xF6nemi"
    );
    return {
      tenantId,
      ...warehouseId !== void 0 ? { warehouseId } : {},
      periodStart,
      periodEnd
    };
  }
  requireMetric(key) {
    const definition = METRICS.find(
      (metric) => metric.key === key
    );
    if (!definition) {
      throw new InventoryValidationError(
        "Desteklenmeyen operasyon KPI metri\u011Fi."
      );
    }
    return definition;
  }
  requireSnapshots(snapshots, label) {
    if (snapshots.length === 0) {
      throw new InventoryValidationError(
        `${label} i\xE7in dashboard verisi bulunamad\u0131.`
      );
    }
  }
  validatePeriod(periodStart, periodEnd, label) {
    if (periodStart > periodEnd) {
      throw new InventoryValidationError(
        `${label} ba\u015Flang\u0131c\u0131, biti\u015Finden sonra olamaz.`
      );
    }
  }
  requiredText(value, label) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new InventoryValidationError(
        `${label} zorunludur.`
      );
    }
    return normalized;
  }
  requiredDate(value, label) {
    const normalized = this.requiredText(
      value,
      label
    );
    if (Number.isNaN(
      Date.parse(normalized)
    )) {
      throw new InventoryValidationError(
        `${label} ge\xE7erli bir tarih olmal\u0131d\u0131r.`
      );
    }
    return new Date(
      normalized
    ).toISOString();
  }
  rate(numerator, denominator) {
    if (denominator === 0) {
      return 0;
    }
    return this.round(
      numerator / denominator * 100
    );
  }
  changeRate(previousValue, currentValue) {
    if (previousValue === 0) {
      return currentValue === 0 ? 0 : 100;
    }
    return this.round(
      (currentValue - previousValue) / Math.abs(
        previousValue
      ) * 100
    );
  }
  resolveHealthStatus(score) {
    if (score >= 90) {
      return "healthy";
    }
    if (score >= 75) {
      return "attention";
    }
    return "critical";
  }
  round(value) {
    return Math.round(
      value * 100
    ) / 100;
  }
};

// src/warehouse/runtime/OperationsCopilotRuntime.ts
function numberValue(value) {
  return Number(value);
}
function mapDashboardRow(row) {
  return {
    id: row.id,
    tenantId: row.account_id,
    ...row.warehouse_id !== null ? { warehouseId: row.warehouse_id } : {},
    periodStart: row.period_start,
    periodEnd: row.period_end,
    totalOrders: numberValue(row.total_orders),
    completedOrders: numberValue(row.completed_orders),
    onTimeOrders: numberValue(row.on_time_orders),
    delayedOrders: numberValue(row.delayed_orders),
    totalTasks: numberValue(row.total_tasks),
    completedTasks: numberValue(row.completed_tasks),
    exceptionTasks: numberValue(row.exception_tasks),
    totalInventoryChecks: numberValue(row.total_inventory_checks),
    accurateInventoryChecks: numberValue(row.accurate_inventory_checks),
    usedCapacity: numberValue(row.used_capacity),
    totalCapacity: numberValue(row.total_capacity),
    productiveMinutes: numberValue(row.productive_minutes),
    availableLaborMinutes: numberValue(row.available_labor_minutes),
    requestedItems: numberValue(row.requested_items),
    fulfilledItems: numberValue(row.fulfilled_items),
    shortItems: numberValue(row.short_items),
    orderCompletionRate: numberValue(row.order_completion_rate),
    onTimeDispatchRate: numberValue(row.on_time_dispatch_rate),
    taskCompletionRate: numberValue(row.task_completion_rate),
    taskExceptionRate: numberValue(row.task_exception_rate),
    inventoryAccuracyRate: numberValue(row.inventory_accuracy_rate),
    capacityUtilizationRate: numberValue(row.capacity_utilization_rate),
    laborUtilizationRate: numberValue(row.labor_utilization_rate),
    itemFulfillmentRate: numberValue(row.item_fulfillment_rate),
    shortPickRate: numberValue(row.short_pick_rate),
    healthScore: numberValue(row.health_score),
    healthStatus: row.health_status,
    kpis: Array.isArray(row.kpis) ? row.kpis : [],
    alerts: Array.isArray(row.alerts) ? row.alerts : [],
    calculatedAt: row.calculated_at
  };
}
function mapExceptionRow(row) {
  return {
    id: row.id,
    tenantId: row.account_id,
    ...row.warehouse_id !== null ? { warehouseId: row.warehouse_id } : {},
    process: row.process,
    category: row.category,
    code: row.code,
    severity: row.severity,
    rootCause: row.root_cause,
    description: row.description,
    occurredAt: row.occurred_at,
    ...row.resolved_at !== null ? { resolvedAt: row.resolved_at } : {},
    ...row.resolution_note !== null ? { resolutionNote: row.resolution_note } : {},
    delayMinutes: numberValue(row.delay_minutes),
    impactedOrders: numberValue(row.impacted_orders),
    impactedTasks: numberValue(row.impacted_tasks),
    impactedItems: numberValue(row.impacted_items),
    createdAt: row.created_at
  };
}
function sameWarehouse(snapshotWarehouseId, filterWarehouseId) {
  return snapshotWarehouseId === filterWarehouseId;
}
function dashboardMatches(snapshot, filter) {
  if (snapshot.tenantId !== filter.tenantId) {
    return false;
  }
  if (!sameWarehouse(
    snapshot.warehouseId,
    filter.warehouseId
  )) {
    return false;
  }
  if (filter.periodStart !== void 0 && snapshot.periodEnd < filter.periodStart) {
    return false;
  }
  if (filter.periodEnd !== void 0 && snapshot.periodStart > filter.periodEnd) {
    return false;
  }
  return true;
}
function exceptionMatches(record, filter) {
  if (record.tenantId !== filter.tenantId || !sameWarehouse(
    record.warehouseId,
    filter.warehouseId
  )) {
    return false;
  }
  if (record.occurredAt < filter.periodStart || record.occurredAt > filter.periodEnd) {
    return false;
  }
  if (filter.process !== void 0 && record.process !== filter.process) {
    return false;
  }
  if (filter.severity !== void 0 && record.severity !== filter.severity) {
    return false;
  }
  if (filter.unresolvedOnly === true && record.resolvedAt !== void 0) {
    return false;
  }
  return true;
}
function uniqueSnapshots(snapshots) {
  const byId = /* @__PURE__ */ new Map();
  for (const snapshot of snapshots) {
    byId.set(snapshot.id, snapshot);
  }
  return [...byId.values()];
}
function findPreviousPeriodSnapshot(current, snapshots) {
  return [...snapshots].filter(
    (snapshot) => snapshot.id !== current.id && snapshot.tenantId === current.tenantId && snapshot.warehouseId === current.warehouseId && (snapshot.periodStart !== current.periodStart || snapshot.periodEnd !== current.periodEnd)
  ).sort(
    (left, right) => right.calculatedAt.localeCompare(
      left.calculatedAt
    )
  )[0];
}
async function buildWarehouseOperationsCopilotRuntime(input) {
  if (input.snapshot === null) {
    return null;
  }
  const generatedAt = input.generatedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  const current = mapDashboardRow(input.snapshot);
  if (current.tenantId !== input.accountId || current.warehouseId !== (input.warehouseId ?? void 0)) {
    throw new Error(
      "Copilot runtime snapshot kapsam\u0131 se\xE7ili firma ve depo ile e\u015Fle\u015Fmiyor."
    );
  }
  const snapshots = uniqueSnapshots([
    current,
    ...(input.trend ?? []).map(mapDashboardRow)
  ]);
  const exceptionRecords = (input.exceptions ?? []).map(mapExceptionRow);
  const processVolumes = (input.processVolumes ?? []).map((row) => ({
    process: row.process,
    operationCount: numberValue(row.operation_count)
  }));
  const dashboardRepository = {
    async list(filter) {
      return snapshots.filter(
        (snapshot) => dashboardMatches(
          snapshot,
          filter
        )
      );
    }
  };
  const exceptionRepository = {
    async list(filter) {
      return exceptionRecords.filter(
        (record) => exceptionMatches(
          record,
          filter
        )
      );
    }
  };
  const analyticsService = new OperationsExceptionAnalyticsService({
    repository: exceptionRepository,
    now: () => generatedAt
  });
  const exceptionAnalytics = await analyticsService.analyze(
    {
      tenantId: current.tenantId,
      ...current.warehouseId !== void 0 ? {
        warehouseId: current.warehouseId
      } : {},
      periodStart: current.periodStart,
      periodEnd: current.periodEnd
    },
    processVolumes
  );
  const previous = findPreviousPeriodSnapshot(
    current,
    snapshots
  );
  let comparison;
  if (previous !== void 0) {
    const reportingService = new OperationsReportingService({
      repository: dashboardRepository,
      now: () => generatedAt
    });
    comparison = await reportingService.comparePeriods({
      tenantId: current.tenantId,
      ...current.warehouseId !== void 0 ? {
        warehouseId: current.warehouseId
      } : {},
      currentPeriodStart: current.periodStart,
      currentPeriodEnd: current.periodEnd,
      previousPeriodStart: previous.periodStart,
      previousPeriodEnd: previous.periodEnd
    });
  }
  return new OperationsCopilotService().build({
    snapshot: current,
    exceptionAnalytics,
    ...comparison !== void 0 ? { comparison } : {},
    generatedAt
  });
}
var OperationsCopilotRuntime_default = buildWarehouseOperationsCopilotRuntime;
export {
  buildWarehouseOperationsCopilotRuntime,
  OperationsCopilotRuntime_default as default
};
