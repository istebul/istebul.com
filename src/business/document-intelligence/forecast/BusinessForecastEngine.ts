import type {
  BusinessKpi
} from '../models/BusinessKpi';
import type {
  StoredBusinessDocumentAnalysis
} from '../providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export type BusinessForecastConfidence =
  | 'low'
  | 'medium'
  | 'high';

export type BusinessForecastDirection =
  | 'up'
  | 'down'
  | 'stable';

export interface BusinessForecastPoint {
  horizonDays: 30 | 90 | 365;
  projectedValue: number;
  absoluteChange: number;
  percentageChange: number | null;
}

export interface BusinessKpiForecast {
  id: string;
  label: string;
  unit?: string;
  currentValue: number;
  slopePerDay: number;
  direction: BusinessForecastDirection;
  confidence: BusinessForecastConfidence;
  dataPointCount: number;
  fitScore: number;
  projections: readonly BusinessForecastPoint[];
}

export interface BusinessForecastResult {
  generatedAt: string;
  sourceAnalysisIds: readonly string[];
  sourcePointCount: number;
  forecasts: readonly BusinessKpiForecast[];
  summary: string;
  disclosure: string;
  hasForecastData: boolean;
}

interface NumericObservation {
  timestamp: number;
  value: number;
}

const FORECAST_KPI_IDS = Object.freeze([
  'semantic_total_revenue',
  'semantic_total_cost',
  'semantic_gross_profit',
  'semantic_profit_margin',
  'semantic_total_quantity'
] as const);

const HORIZONS = Object.freeze([
  30,
  90,
  365
] as const);

const MINIMUM_POINT_COUNT = 3;
const STABLE_SLOPE = 0.000001;

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function parseTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function findKpi(
  analysis: StoredBusinessDocumentAnalysis,
  id: string
): BusinessKpi | undefined {
  return analysis.kpis.find(
    (kpi) => kpi.id === id
  );
}

function calculateRegression(
  observations: readonly NumericObservation[]
): {
  slopePerDay: number;
  intercept: number;
  fitScore: number;
} {
  const origin =
    observations[0]?.timestamp ?? 0;

  const points = observations.map(
    (observation) => ({
      x:
        (observation.timestamp - origin) /
        86_400_000,
      y: observation.value
    })
  );

  const count = points.length;

  const meanX =
    points.reduce(
      (sum, point) => sum + point.x,
      0
    ) / count;

  const meanY =
    points.reduce(
      (sum, point) => sum + point.y,
      0
    ) / count;

  const numerator = points.reduce(
    (sum, point) =>
      sum +
      (point.x - meanX) *
        (point.y - meanY),
    0
  );

  const denominator = points.reduce(
    (sum, point) =>
      sum +
      Math.pow(point.x - meanX, 2),
    0
  );

  const slopePerDay =
    Math.abs(denominator) <= STABLE_SLOPE
      ? 0
      : numerator / denominator;

  const intercept =
    meanY - slopePerDay * meanX;

  const totalVariance = points.reduce(
    (sum, point) =>
      sum +
      Math.pow(point.y - meanY, 2),
    0
  );

  const residualVariance = points.reduce(
    (sum, point) => {
      const predicted =
        intercept + slopePerDay * point.x;

      return (
        sum +
        Math.pow(point.y - predicted, 2)
      );
    },
    0
  );

  const fitScore =
    totalVariance <= STABLE_SLOPE
      ? 1
      : clamp(
          1 -
            residualVariance /
              totalVariance,
          0,
          1
        );

  return {
    slopePerDay,
    intercept,
    fitScore
  };
}

function resolveConfidence(
  pointCount: number,
  fitScore: number
): BusinessForecastConfidence {
  if (pointCount >= 6 && fitScore >= 0.7) {
    return 'high';
  }

  if (pointCount >= 4 && fitScore >= 0.35) {
    return 'medium';
  }

  return 'low';
}

function resolveDirection(
  slopePerDay: number
): BusinessForecastDirection {
  if (Math.abs(slopePerDay) <= STABLE_SLOPE) {
    return 'stable';
  }

  return slopePerDay > 0 ? 'up' : 'down';
}

function constrainValue(
  id: string,
  value: number
): number {
  if (id === 'semantic_profit_margin') {
    return clamp(value, 0, 100);
  }

  return Math.max(0, value);
}

function createProjection(
  id: string,
  currentValue: number,
  slopePerDay: number,
  horizonDays: 30 | 90 | 365
): BusinessForecastPoint {
  const projectedValue = constrainValue(
    id,
    currentValue +
      slopePerDay * horizonDays
  );

  const absoluteChange =
    projectedValue - currentValue;

  const percentageChange =
    Math.abs(currentValue) <= STABLE_SLOPE
      ? null
      : (absoluteChange /
          Math.abs(currentValue)) *
        100;

  return Object.freeze({
    horizonDays,
    projectedValue:
      Number(projectedValue.toFixed(2)),
    absoluteChange:
      Number(absoluteChange.toFixed(2)),
    percentageChange:
      percentageChange === null
        ? null
        : Number(
            percentageChange.toFixed(2)
          )
  });
}

function createKpiForecast(
  id: string,
  label: string,
  unit: string | undefined,
  observations: readonly NumericObservation[]
): BusinessKpiForecast {
  const {
    slopePerDay,
    fitScore
  } = calculateRegression(observations);

  const currentValue =
    observations[
      observations.length - 1
    ]?.value ?? 0;

  return Object.freeze({
    id,
    label,
    unit,
    currentValue,
    slopePerDay:
      Number(slopePerDay.toFixed(6)),
    direction:
      resolveDirection(slopePerDay),
    confidence:
      resolveConfidence(
        observations.length,
        fitScore
      ),
    dataPointCount: observations.length,
    fitScore:
      Number(fitScore.toFixed(4)),
    projections: Object.freeze(
      HORIZONS.map((horizonDays) =>
        createProjection(
          id,
          currentValue,
          slopePerDay,
          horizonDays
        )
      )
    )
  });
}

function createSummary(
  forecasts: readonly BusinessKpiForecast[]
): string {
  if (forecasts.length === 0) {
    return (
      'Tahmin üretmek için aynı KPI kimliğine ' +
      'sahip en az üç geçerli analiz gerekir.'
    );
  }

  const upward = forecasts.filter(
    (forecast) => forecast.direction === 'up'
  ).length;

  const downward = forecasts.filter(
    (forecast) => forecast.direction === 'down'
  ).length;

  const highConfidence = forecasts.filter(
    (forecast) =>
      forecast.confidence === 'high'
  ).length;

  const outlook =
    upward > downward
      ? 'Genel projeksiyon yönü pozitiftir.'
      : downward > upward
        ? 'Genel projeksiyon yönü dikkat gerektiriyor.'
        : 'Genel projeksiyon yönü dengelidir.';

  return [
    `${forecasts.length} KPI için 30, 90 ve 365 günlük projeksiyon üretildi.`,
    `${highConfidence} tahmin yüksek güven seviyesindedir.`,
    outlook
  ].join(' ');
}

export class BusinessForecastEngine {
  forecast(
    analyses: readonly StoredBusinessDocumentAnalysis[]
  ): BusinessForecastResult {
    const sorted = [...analyses]
      .map((analysis) => ({
        analysis,
        timestamp:
          parseTimestamp(analysis.createdAt)
      }))
      .filter(
        (
          item
        ): item is {
          analysis: StoredBusinessDocumentAnalysis;
          timestamp: number;
        } => item.timestamp !== null
      )
      .sort(
        (left, right) =>
          left.timestamp - right.timestamp
      );

    const forecasts: BusinessKpiForecast[] = [];

    for (const id of FORECAST_KPI_IDS) {
      const observations =
        sorted.flatMap(
          ({ analysis, timestamp }) => {
            const kpi = findKpi(
              analysis,
              id
            );

            return kpi &&
              Number.isFinite(kpi.value)
              ? [
                  {
                    timestamp,
                    value: kpi.value
                  }
                ]
              : [];
          }
        );

      if (
        observations.length <
        MINIMUM_POINT_COUNT
      ) {
        continue;
      }

      const latestKpi = findKpi(
        sorted[
          sorted.length - 1
        ].analysis,
        id
      );

      forecasts.push(
        createKpiForecast(
          id,
          latestKpi?.label ?? id,
          latestKpi?.unit,
          observations
        )
      );
    }

    return Object.freeze({
      generatedAt: new Date().toISOString(),
      sourceAnalysisIds: Object.freeze(
        sorted.map(
          ({ analysis }) => analysis.id
        )
      ),
      sourcePointCount: sorted.length,
      forecasts: Object.freeze(forecasts),
      summary: createSummary(forecasts),
      disclosure:
        'Tahminler geçmiş analizlerdeki doğrusal eğilime ' +
        'dayalı projeksiyonlardır; garanti veya bağımsız ' +
        'finansal tahmin niteliğinde değildir.',
      hasForecastData: forecasts.length > 0
    });
  }
}
