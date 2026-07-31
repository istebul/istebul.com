import type {
  BusinessBenchmarkResult
} from '../benchmark';
import type {
  BusinessForecastResult
} from '../forecast';
import type {
  BusinessPeriodComparisonResult
} from '../comparison';
import type {
  StoredBusinessDocumentAnalysis
} from '../providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export type BusinessAlertSeverity =
  | 'critical'
  | 'warning'
  | 'info'
  | 'success';

export type BusinessAlertCategory =
  | 'health'
  | 'revenue'
  | 'cost'
  | 'profitability'
  | 'benchmark'
  | 'forecast'
  | 'data-quality';

export interface BusinessAlert {
  id: string;
  category: BusinessAlertCategory;
  severity: BusinessAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
  score: number;
  source: string;
}

export interface BusinessAlertSummary {
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  successCount: number;
  highestSeverity:
    | BusinessAlertSeverity
    | 'none';
}

export interface BusinessAlertResult {
  alerts: readonly BusinessAlert[];
  summary: BusinessAlertSummary;
  executiveSummary: string;
  hasAlerts: boolean;
}

export interface BusinessAlertEngineInput {
  analysis: StoredBusinessDocumentAnalysis;
  comparison?: BusinessPeriodComparisonResult;
  benchmark?: BusinessBenchmarkResult;
  forecast?: BusinessForecastResult;
}

const SEVERITY_RANK: Record<
  BusinessAlertSeverity,
  number
> = {
  critical: 4,
  warning: 3,
  info: 2,
  success: 1
};

function createAlert(
  alert: BusinessAlert
): BusinessAlert {
  return Object.freeze(alert);
}

function findComparison(
  comparison: BusinessPeriodComparisonResult | undefined,
  id: string
) {
  return comparison?.kpis.find(
    (item) => item.id === id
  );
}

function findForecast(
  forecast: BusinessForecastResult | undefined,
  id: string
) {
  return forecast?.forecasts.find(
    (item) => item.id === id
  );
}

function createHealthAlerts(
  input: BusinessAlertEngineInput
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];
  const score = input.analysis.score;

  if (score < 40) {
    alerts.push(
      createAlert({
        id: 'business-health-critical',
        category: 'health',
        severity: 'critical',
        title: 'İşletme sağlık skoru kritik seviyede',
        description:
          `İşletme sağlık skoru ${score}/100 seviyesindedir.`,
        recommendation:
          'Kritik KPI, veri kalitesi ve maliyet alanlarını aynı gün içinde gözden geçirin.',
        score: 100,
        source: 'business-health'
      })
    );
  } else if (score < 60) {
    alerts.push(
      createAlert({
        id: 'business-health-warning',
        category: 'health',
        severity: 'warning',
        title: 'İşletme sağlığı dikkat gerektiriyor',
        description:
          `İşletme sağlık skoru ${score}/100 seviyesindedir.`,
        recommendation:
          'En zayıf göstergeler için 30 günlük iyileştirme planı hazırlayın.',
        score: 75,
        source: 'business-health'
      })
    );
  } else if (score >= 80) {
    alerts.push(
      createAlert({
        id: 'business-health-strong',
        category: 'health',
        severity: 'success',
        title: 'İşletme sağlık görünümü güçlü',
        description:
          `İşletme sağlık skoru ${score}/100 seviyesindedir.`,
        recommendation:
          'Güçlü performansı standart iş süreçlerine dönüştürün.',
        score: 20,
        source: 'business-health'
      })
    );
  }

  if (
    input.comparison &&
    input.comparison.score.absoluteChange <= -10
  ) {
    alerts.push(
      createAlert({
        id: 'business-health-sharp-decline',
        category: 'health',
        severity: 'critical',
        title: 'Sağlık skorunda hızlı düşüş',
        description:
          `Sağlık skoru ${Math.abs(
            input.comparison.score.absoluteChange
          )} puan geriledi.`,
        recommendation:
          'Son dönem değişikliklerini, maliyetleri ve veri kalitesini acil olarak inceleyin.',
        score: 95,
        source: 'period-comparison'
      })
    );
  }

  return alerts;
}

function createFinancialAlerts(
  input: BusinessAlertEngineInput
): BusinessAlert[] {
  const alerts: BusinessAlert[] = [];

  const revenue = findComparison(
    input.comparison,
    'semantic_total_revenue'
  );

  const cost = findComparison(
    input.comparison,
    'semantic_total_cost'
  );

  const profit = findComparison(
    input.comparison,
    'semantic_gross_profit'
  );

  const margin = findComparison(
    input.comparison,
    'semantic_profit_margin'
  );

  if (
    revenue?.percentageChange !== null &&
    revenue?.percentageChange !== undefined &&
    revenue.percentageChange <= -10
  ) {
    alerts.push(
      createAlert({
        id: 'business-revenue-decline',
        category: 'revenue',
        severity:
          revenue.percentageChange <= -20
            ? 'critical'
            : 'warning',
        title: 'Ciro düşüşü tespit edildi',
        description:
          `Toplam ciro ${revenue.changeLabel} değişti.`,
        recommendation:
          'Satış kanalı, ürün ve müşteri kırılımında düşüşün nedenini inceleyin.',
        score:
          revenue.percentageChange <= -20
            ? 95
            : 75,
        source: 'period-comparison'
      })
    );
  }

  if (
    cost?.percentageChange !== null &&
    cost?.percentageChange !== undefined &&
    cost.percentageChange >= 10
  ) {
    alerts.push(
      createAlert({
        id: 'business-cost-pressure',
        category: 'cost',
        severity:
          cost.percentageChange >= 20
            ? 'critical'
            : 'warning',
        title: 'Maliyet baskısı yükseliyor',
        description:
          `Toplam maliyet ${cost.changeLabel} arttı.`,
        recommendation:
          'Maliyet kalemlerini tedarikçi, personel ve sabit gider bazında ayrıştırın.',
        score:
          cost.percentageChange >= 20
            ? 95
            : 80,
        source: 'period-comparison'
      })
    );
  }

  if (
    profit?.direction === 'down' ||
    margin?.direction === 'down'
  ) {
    alerts.push(
      createAlert({
        id: 'business-profitability-decline',
        category: 'profitability',
        severity:
          margin?.absoluteChange !== undefined &&
          margin.absoluteChange <= -10
            ? 'critical'
            : 'warning',
        title: 'Kârlılık düşüş eğiliminde',
        description:
          'Brüt kâr veya kâr marjında olumsuz değişim tespit edildi.',
        recommendation:
          'Fiyat, ürün karması ve birim maliyetleri birlikte değerlendirin.',
        score: 85,
        source: 'period-comparison'
      })
    );
  }

  return alerts;
}

function createBenchmarkAlerts(
  benchmark?: BusinessBenchmarkResult
): BusinessAlert[] {
  if (!benchmark?.hasBenchmarkData) return [];

  const alerts: BusinessAlert[] = [];

  if (
    benchmark.weakest &&
    benchmark.weakest.level === 'weak'
  ) {
    alerts.push(
      createAlert({
        id: 'business-benchmark-gap',
        category: 'benchmark',
        severity: 'warning',
        title: 'Benchmark performans boşluğu',
        description:
          `${benchmark.weakest.label}, yapılandırılmış referans profilinin altında.`,
        recommendation:
          'Bu gösterge için hedef değer ve sorumlu yönetici belirleyin.',
        score: 70,
        source: 'benchmark'
      })
    );
  }

  if (
    benchmark.strongest &&
    benchmark.strongest.level === 'strong'
  ) {
    alerts.push(
      createAlert({
        id: 'business-benchmark-strength',
        category: 'benchmark',
        severity: 'success',
        title: 'Benchmark üzerinde güçlü performans',
        description:
          `${benchmark.strongest.label}, referans profilinin üzerinde.`,
        recommendation:
          'Bu güçlü alanı büyüme ve rekabet avantajı için kullanın.',
        score: 15,
        source: 'benchmark'
      })
    );
  }

  return alerts;
}

function createForecastAlerts(
  forecast?: BusinessForecastResult
): BusinessAlert[] {
  if (!forecast?.hasForecastData) {
    return [
      createAlert({
        id: 'business-forecast-data-insufficient',
        category: 'forecast',
        severity: 'info',
        title: 'Tahmin için geçmiş veri yetersiz',
        description:
          'En az üç dönem analizi olmadan güvenli projeksiyon üretilemiyor.',
        recommendation:
          'Düzenli dönem analizleri oluşturmaya devam edin.',
        score: 30,
        source: 'forecast'
      })
    ];
  }

  const alerts: BusinessAlert[] = [];

  const revenueForecast = findForecast(
    forecast,
    'semantic_total_revenue'
  );

  const profitForecast = findForecast(
    forecast,
    'semantic_gross_profit'
  );

  const marginForecast = findForecast(
    forecast,
    'semantic_profit_margin'
  );

  if (
    revenueForecast?.direction === 'down' ||
    profitForecast?.direction === 'down'
  ) {
    alerts.push(
      createAlert({
        id: 'business-forecast-negative',
        category: 'forecast',
        severity: 'warning',
        title: 'Gelecek projeksiyonu negatif',
        description:
          'Ciro veya brüt kâr tahmini düşüş yönünde ilerliyor.',
        recommendation:
          '30 ve 90 günlük satış ve maliyet senaryoları oluşturun.',
        score: 80,
        source: 'forecast'
      })
    );
  }

  if (
    marginForecast?.direction === 'down' &&
    marginForecast.confidence !== 'low'
  ) {
    alerts.push(
      createAlert({
        id: 'business-margin-forecast-risk',
        category: 'profitability',
        severity: 'critical',
        title: 'Kâr marjı tahmini riskli',
        description:
          'Kâr marjı orta veya yüksek güvenle düşüş yönünde tahmin ediliyor.',
        recommendation:
          'Fiyat ve maliyet senaryolarını yönetim gündemine alın.',
        score: 95,
        source: 'forecast'
      })
    );
  }

  return alerts;
}

function createSummary(
  alerts: readonly BusinessAlert[]
): BusinessAlertSummary {
  const criticalCount = alerts.filter(
    (item) => item.severity === 'critical'
  ).length;

  const warningCount = alerts.filter(
    (item) => item.severity === 'warning'
  ).length;

  const infoCount = alerts.filter(
    (item) => item.severity === 'info'
  ).length;

  const successCount = alerts.filter(
    (item) => item.severity === 'success'
  ).length;

  const highestSeverity =
    criticalCount > 0
      ? 'critical'
      : warningCount > 0
        ? 'warning'
        : infoCount > 0
          ? 'info'
          : successCount > 0
            ? 'success'
            : 'none';

  return Object.freeze({
    criticalCount,
    warningCount,
    infoCount,
    successCount,
    highestSeverity
  });
}

function createExecutiveSummary(
  summary: BusinessAlertSummary
): string {
  if (summary.criticalCount > 0) {
    return (
      `${summary.criticalCount} kritik ve ` +
      `${summary.warningCount} uyarı seviyesinde konu bulundu. ` +
      'Acil yönetim müdahalesi gerekiyor.'
    );
  }

  if (summary.warningCount > 0) {
    return (
      `${summary.warningCount} uyarı seviyesinde konu bulundu. ` +
      'Yakın takip ve düzeltici aksiyon öneriliyor.'
    );
  }

  return 'Kritik yönetici alarmı bulunmadı.';
}

export class BusinessAlertEngine {
  evaluate(
    input: BusinessAlertEngineInput
  ): BusinessAlertResult {
    const alerts = [
      ...createHealthAlerts(input),
      ...createFinancialAlerts(input),
      ...createBenchmarkAlerts(input.benchmark),
      ...createForecastAlerts(input.forecast)
    ].sort((left, right) => {
      const severityDifference =
        SEVERITY_RANK[right.severity] -
        SEVERITY_RANK[left.severity];

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return right.score - left.score;
    });

    const summary = createSummary(alerts);

    return Object.freeze({
      alerts: Object.freeze(alerts),
      summary,
      executiveSummary:
        createExecutiveSummary(summary),
      hasAlerts: alerts.length > 0
    });
  }
}
