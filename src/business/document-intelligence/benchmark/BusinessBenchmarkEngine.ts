import type {
  StoredBusinessDocumentAnalysis
} from '../providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export type BusinessBenchmarkLevel =
  | 'weak'
  | 'average'
  | 'strong'
  | 'unavailable';

export type BusinessBenchmarkImpact =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'unavailable';

export interface BusinessBenchmarkReference {
  id: string;
  label: string;
  unit?: string;
  lowerBound: number;
  median: number;
  upperBound: number;
  lowerIsBetter?: boolean;
}

export interface BusinessBenchmarkItem {
  id: string;
  label: string;
  unit?: string;
  value: number;
  referenceMedian: number;
  absoluteGap: number;
  percentageGap: number | null;
  percentile: number;
  level: BusinessBenchmarkLevel;
  impact: BusinessBenchmarkImpact;
  statusLabel: string;
}

export interface BusinessBenchmarkResult {
  profileId: string;
  profileLabel: string;
  disclosure: string;
  score: BusinessBenchmarkItem;
  kpis: readonly BusinessBenchmarkItem[];
  strongest?: BusinessBenchmarkItem;
  weakest?: BusinessBenchmarkItem;
  summary: string;
  hasBenchmarkData: boolean;
}

const EPSILON = 0.000001;

const DEFAULT_REFERENCE_PROFILE = Object.freeze({
  id: 'structured-sme-reference-v1',
  label: 'Yapılandırılmış KOBİ referans profili',
  disclosure:
    'Bu karşılaştırma gerçek sektör ortalaması değildir. ' +
    'İSTEBUL Business tarafından tanımlanan yapılandırılmış ' +
    'referans profilini kullanır.',
  score: Object.freeze({
    id: 'business_health_score',
    label: 'İşletme sağlık skoru',
    lowerBound: 45,
    median: 65,
    upperBound: 82
  }),
  kpis: Object.freeze([
    Object.freeze({
      id: 'semantic_total_revenue',
      label: 'Toplam ciro',
      unit: 'TRY',
      lowerBound: 100_000,
      median: 500_000,
      upperBound: 1_500_000
    }),
    Object.freeze({
      id: 'semantic_total_cost',
      label: 'Toplam maliyet',
      unit: 'TRY',
      lowerBound: 60_000,
      median: 350_000,
      upperBound: 1_100_000,
      lowerIsBetter: true
    }),
    Object.freeze({
      id: 'semantic_gross_profit',
      label: 'Brüt kâr',
      unit: 'TRY',
      lowerBound: 20_000,
      median: 150_000,
      upperBound: 500_000
    }),
    Object.freeze({
      id: 'semantic_profit_margin',
      label: 'Kâr marjı',
      unit: '%',
      lowerBound: 8,
      median: 20,
      upperBound: 35
    }),
    Object.freeze({
      id: 'semantic_total_quantity',
      label: 'Toplam satış adedi',
      unit: 'adet',
      lowerBound: 100,
      median: 500,
      upperBound: 1_500
    })
  ] satisfies readonly BusinessBenchmarkReference[])
});

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

function calculatePercentile(
  value: number,
  reference: BusinessBenchmarkReference
): number {
  const {
    lowerBound,
    median,
    upperBound,
    lowerIsBetter
  } = reference;

  let percentile: number;

  if (value <= lowerBound) {
    const denominator =
      Math.abs(lowerBound) > EPSILON
        ? Math.abs(lowerBound)
        : 1;

    percentile =
      10 + (value / denominator) * 15;
  } else if (value <= median) {
    percentile =
      25 +
      ((value - lowerBound) /
        Math.max(
          median - lowerBound,
          EPSILON
        )) *
        25;
  } else if (value <= upperBound) {
    percentile =
      50 +
      ((value - median) /
        Math.max(
          upperBound - median,
          EPSILON
        )) *
        35;
  } else {
    percentile =
      85 +
      ((value - upperBound) /
        Math.max(
          Math.abs(upperBound),
          1
        )) *
        15;
  }

  const normalized =
    clamp(percentile, 1, 99);

  return Math.round(
    lowerIsBetter
      ? 100 - normalized
      : normalized
  );
}

function resolveLevel(
  percentile: number
): Exclude<
  BusinessBenchmarkLevel,
  'unavailable'
> {
  if (percentile >= 70) return 'strong';
  if (percentile >= 35) return 'average';
  return 'weak';
}

function resolveImpact(
  level: Exclude<
    BusinessBenchmarkLevel,
    'unavailable'
  >
): Exclude<
  BusinessBenchmarkImpact,
  'unavailable'
> {
  if (level === 'strong') return 'positive';
  if (level === 'weak') return 'negative';
  return 'neutral';
}

function createStatusLabel(
  level: Exclude<
    BusinessBenchmarkLevel,
    'unavailable'
  >
): string {
  if (level === 'strong') {
    return 'Referans profilinin üzerinde';
  }

  if (level === 'weak') {
    return 'Referans profilinin altında';
  }

  return 'Referans profiline yakın';
}

function createItem(
  value: number,
  reference: BusinessBenchmarkReference
): BusinessBenchmarkItem {
  const absoluteGap =
    value - reference.median;

  const percentageGap =
    Math.abs(reference.median) <= EPSILON
      ? null
      : (absoluteGap /
          Math.abs(reference.median)) *
        100;

  const percentile =
    calculatePercentile(value, reference);

  const level = resolveLevel(percentile);

  const impact: Exclude<
    BusinessBenchmarkImpact,
    'unavailable'
  > = reference.lowerIsBetter
    ? value < reference.median - EPSILON
      ? 'positive'
      : value > reference.median + EPSILON
        ? 'negative'
        : 'neutral'
    : resolveImpact(level);

  return Object.freeze({
    id: reference.id,
    label: reference.label,
    unit: reference.unit,
    value,
    referenceMedian: reference.median,
    absoluteGap,
    percentageGap,
    percentile,
    level,
    impact,
    statusLabel: createStatusLabel(level)
  });
}

function performanceRank(
  item: BusinessBenchmarkItem
): number {
  return item.percentile;
}

function createSummary(
  score: BusinessBenchmarkItem,
  items: readonly BusinessBenchmarkItem[],
  strongest?: BusinessBenchmarkItem,
  weakest?: BusinessBenchmarkItem
): string {
  if (items.length === 0) {
    return (
      'Yapılandırılmış referans profiliyle ' +
      'karşılaştırılabilir semantik KPI bulunamadı.'
    );
  }

  const strongCount = items.filter(
    (item) => item.level === 'strong'
  ).length;

  const weakCount = items.filter(
    (item) => item.level === 'weak'
  ).length;

  return [
    `İşletme sağlık skoru yaklaşık ${score.percentile}. persentildedir.`,
    `${strongCount} gösterge güçlü,`,
    `${weakCount} gösterge geliştirme alanı olarak sınıflandırıldı.`,
    strongest
      ? `En güçlü alan: ${strongest.label}.`
      : '',
    weakest
      ? `En büyük performans boşluğu: ${weakest.label}.`
      : ''
  ]
    .filter(Boolean)
    .join(' ');
}

export class BusinessBenchmarkEngine {
  evaluate(
    analysis: StoredBusinessDocumentAnalysis
  ): BusinessBenchmarkResult {
    const score = createItem(
      analysis.score,
      DEFAULT_REFERENCE_PROFILE.score
    );

    const items =
      DEFAULT_REFERENCE_PROFILE.kpis.flatMap(
        (reference) => {
          const kpi = analysis.kpis.find(
            (candidate) =>
              candidate.id === reference.id
          );

          return kpi
            ? [createItem(kpi.value, reference)]
            : [];
        }
      );

    const ranked = [...items].sort(
      (left, right) =>
        performanceRank(right) -
        performanceRank(left)
    );

    const strongest = ranked[0];
    const weakest =
      ranked.length > 0
        ? ranked[ranked.length - 1]
        : undefined;

    return Object.freeze({
      profileId: DEFAULT_REFERENCE_PROFILE.id,
      profileLabel:
        DEFAULT_REFERENCE_PROFILE.label,
      disclosure:
        DEFAULT_REFERENCE_PROFILE.disclosure,
      score,
      kpis: Object.freeze(items),
      strongest,
      weakest,
      summary: createSummary(
        score,
        items,
        strongest,
        weakest
      ),
      hasBenchmarkData: items.length > 0
    });
  }
}
