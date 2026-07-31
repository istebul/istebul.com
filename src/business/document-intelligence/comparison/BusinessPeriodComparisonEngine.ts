import type {
  BusinessKpi
} from '../models/BusinessKpi';
import type {
  StoredBusinessDocumentAnalysis
} from '../providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export type BusinessComparisonDirection =
  | 'up'
  | 'down'
  | 'stable'
  | 'unavailable';

export type BusinessComparisonImpact =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'unavailable';

export interface BusinessKpiComparison {
  id: string;
  label: string;
  unit?: string;
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  percentageChange: number | null;
  direction: BusinessComparisonDirection;
  impact: BusinessComparisonImpact;
  changeLabel: string;
}

export interface BusinessScoreComparison {
  currentValue: number;
  previousValue: number;
  absoluteChange: number;
  direction: Exclude<
    BusinessComparisonDirection,
    'unavailable'
  >;
  impact: Exclude<
    BusinessComparisonImpact,
    'unavailable'
  >;
  changeLabel: string;
}

export interface BusinessPeriodComparisonResult {
  currentAnalysisId: string;
  previousAnalysisId: string;
  currentCreatedAt: string;
  previousCreatedAt: string;
  score: BusinessScoreComparison;
  kpis: readonly BusinessKpiComparison[];
  summary: string;
  hasComparableData: boolean;
}

const COMPARABLE_KPI_IDS = Object.freeze([
  'semantic_total_revenue',
  'semantic_total_cost',
  'semantic_gross_profit',
  'semantic_profit_margin',
  'semantic_total_quantity'
] as const);

const STABLE_THRESHOLD = 0.000001;

function formatNumber(
  value: number,
  maximumFractionDigits = 2
): string {
  return value.toLocaleString('tr-TR', {
    maximumFractionDigits
  });
}

function formatSignedNumber(
  value: number,
  maximumFractionDigits = 2
): string {
  if (Math.abs(value) <= STABLE_THRESHOLD) {
    return formatNumber(0, maximumFractionDigits);
  }

  const prefix = value > 0 ? '+' : '';

  return `${prefix}${formatNumber(
    value,
    maximumFractionDigits
  )}`;
}

function resolveDirection(
  absoluteChange: number
): Exclude<
  BusinessComparisonDirection,
  'unavailable'
> {
  if (Math.abs(absoluteChange) <= STABLE_THRESHOLD) {
    return 'stable';
  }

  return absoluteChange > 0 ? 'up' : 'down';
}

function resolveImpact(
  kpiId: string,
  direction: Exclude<
    BusinessComparisonDirection,
    'unavailable'
  >
): Exclude<
  BusinessComparisonImpact,
  'unavailable'
> {
  if (direction === 'stable') return 'neutral';

  if (kpiId === 'semantic_total_cost') {
    return direction === 'down'
      ? 'positive'
      : 'negative';
  }

  return direction === 'up'
    ? 'positive'
    : 'negative';
}

function findKpi(
  analysis: StoredBusinessDocumentAnalysis,
  id: string
): BusinessKpi | undefined {
  return analysis.kpis.find((kpi) => kpi.id === id);
}

function createPercentageChange(
  previousValue: number,
  currentValue: number
): number | null {
  if (Math.abs(previousValue) <= STABLE_THRESHOLD) {
    return null;
  }

  return (
    ((currentValue - previousValue) /
      Math.abs(previousValue)) *
    100
  );
}

function createChangeLabel(
  kpi: BusinessKpi,
  absoluteChange: number,
  percentageChange: number | null
): string {
  if (Math.abs(absoluteChange) <= STABLE_THRESHOLD) {
    return 'Değişim yok';
  }

  if (
    kpi.id === 'semantic_profit_margin' ||
    kpi.unit === '%'
  ) {
    return `${formatSignedNumber(
      absoluteChange
    )} puan`;
  }

  if (percentageChange === null) {
    return `${formatSignedNumber(
      absoluteChange
    )} mutlak değişim`;
  }

  return `%${formatSignedNumber(
    percentageChange
  )}`;
}

function createKpiComparison(
  current: BusinessKpi,
  previous: BusinessKpi
): BusinessKpiComparison {
  const absoluteChange =
    current.value - previous.value;

  const percentageChange =
    current.id === 'semantic_profit_margin' ||
    current.unit === '%'
      ? null
      : createPercentageChange(
          previous.value,
          current.value
        );

  const direction =
    resolveDirection(absoluteChange);

  return Object.freeze({
    id: current.id,
    label: current.label,
    unit: current.unit,
    currentValue: current.value,
    previousValue: previous.value,
    absoluteChange,
    percentageChange,
    direction,
    impact: resolveImpact(
      current.id,
      direction
    ),
    changeLabel: createChangeLabel(
      current,
      absoluteChange,
      percentageChange
    )
  });
}

function createScoreComparison(
  currentScore: number,
  previousScore: number
): BusinessScoreComparison {
  const absoluteChange =
    currentScore - previousScore;

  const direction =
    resolveDirection(absoluteChange);

  return Object.freeze({
    currentValue: currentScore,
    previousValue: previousScore,
    absoluteChange,
    direction,
    impact:
      direction === 'up'
        ? 'positive'
        : direction === 'down'
          ? 'negative'
          : 'neutral',
    changeLabel:
      Math.abs(absoluteChange) <= STABLE_THRESHOLD
        ? 'Değişim yok'
        : `${formatSignedNumber(
            absoluteChange
          )} puan`
  });
}

function createSummary(
  score: BusinessScoreComparison,
  kpis: readonly BusinessKpiComparison[]
): string {
  if (kpis.length === 0) {
    return (
      'Son iki analiz arasında karşılaştırılabilir ' +
      'semantik KPI bulunamadı.'
    );
  }

  const positiveCount = kpis.filter(
    (kpi) => kpi.impact === 'positive'
  ).length;

  const negativeCount = kpis.filter(
    (kpi) => kpi.impact === 'negative'
  ).length;

  const trendSummary =
    positiveCount > negativeCount
      ? 'Genel performans eğilimi olumlu.'
      : negativeCount > positiveCount
        ? 'Genel performans eğilimi dikkat gerektiriyor.'
        : 'Genel performans eğilimi dengeli.';

  return [
    `İşletme sağlık skoru ${score.previousValue} seviyesinden`,
    `${score.currentValue} seviyesine geldi`,
    `(${score.changeLabel}).`,
    `${positiveCount} göstergede olumlu,`,
    `${negativeCount} göstergede olumsuz değişim bulundu.`,
    trendSummary
  ].join(' ');
}

export class BusinessPeriodComparisonEngine {
  compare(
    current: StoredBusinessDocumentAnalysis,
    previous: StoredBusinessDocumentAnalysis
  ): BusinessPeriodComparisonResult {
    const comparisons: BusinessKpiComparison[] = [];

    for (const kpiId of COMPARABLE_KPI_IDS) {
      const currentKpi = findKpi(current, kpiId);
      const previousKpi = findKpi(previous, kpiId);

      if (!currentKpi || !previousKpi) {
        continue;
      }

      comparisons.push(
        createKpiComparison(
          currentKpi,
          previousKpi
        )
      );
    }

    const score = createScoreComparison(
      current.score,
      previous.score
    );

    return Object.freeze({
      currentAnalysisId: current.id,
      previousAnalysisId: previous.id,
      currentCreatedAt: current.createdAt,
      previousCreatedAt: previous.createdAt,
      score,
      kpis: Object.freeze(comparisons),
      summary: createSummary(
        score,
        comparisons
      ),
      hasComparableData: comparisons.length > 0
    });
  }
}
