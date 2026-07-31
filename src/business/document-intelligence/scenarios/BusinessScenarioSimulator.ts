import type {
  StoredBusinessDocumentAnalysis
} from '../providers/supabase/SupabaseBusinessDocumentAnalysisProvider';

export interface BusinessScenarioInput {
  priceChangePercent?: number;
  salesVolumeChangePercent?: number;
  unitCostChangePercent?: number;
  fixedCostChangePercent?: number;
  personnelCostChangePercent?: number;
}

export interface BusinessScenarioMetrics {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  quantity: number;
}

export interface BusinessScenarioDelta {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  quantity: number;
}

export interface BusinessScenarioRisk {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
}

export interface BusinessScenarioResult {
  baseline: BusinessScenarioMetrics;
  projected: BusinessScenarioMetrics;
  delta: BusinessScenarioDelta;
  risks: readonly BusinessScenarioRisk[];
  summary: string;
  disclosure: string;
}

const EPSILON = 0.000001;

function clampPercent(
  value: number | undefined,
  minimum = -100,
  maximum = 500
): number {
  if (!Number.isFinite(value)) return 0;

  return Math.min(
    maximum,
    Math.max(minimum, value ?? 0)
  );
}

function findKpi(
  analysis: StoredBusinessDocumentAnalysis,
  id: string
): number {
  return (
    analysis.kpis.find(
      (item) => item.id === id
    )?.value ?? 0
  );
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function calculateMargin(
  revenue: number,
  grossProfit: number
): number {
  if (Math.abs(revenue) <= EPSILON) return 0;

  return Math.min(
    100,
    Math.max(
      -100,
      (grossProfit / revenue) * 100
    )
  );
}

function createRisks(
  projected: BusinessScenarioMetrics
): BusinessScenarioRisk[] {
  const risks: BusinessScenarioRisk[] = [];

  if (projected.grossProfit < 0) {
    risks.push(
      Object.freeze({
        severity: 'critical',
        title: 'Senaryo zarar üretiyor',
        description:
          'Tahmini toplam maliyet, tahmini cironun üzerine çıkıyor.'
      })
    );
  } else if (projected.profitMargin < 5) {
    risks.push(
      Object.freeze({
        severity: 'critical',
        title: 'Kâr marjı kritik seviyede',
        description:
          `Tahmini kâr marjı %${projected.profitMargin}.`
      })
    );
  } else if (projected.profitMargin < 15) {
    risks.push(
      Object.freeze({
        severity: 'warning',
        title: 'Kâr marjı baskı altında',
        description:
          `Tahmini kâr marjı %${projected.profitMargin}.`
      })
    );
  }

  if (projected.revenue <= 0) {
    risks.push(
      Object.freeze({
        severity: 'critical',
        title: 'Ciro sıfırlandı',
        description:
          'Fiyat veya satış hacmi değişikliği cironun sıfırlanmasına neden oldu.'
      })
    );
  }

  if (risks.length === 0) {
    risks.push(
      Object.freeze({
        severity: 'info',
        title: 'Kritik senaryo riski bulunmadı',
        description:
          'Girilen varsayımlar altında temel finansal yapı korunuyor.'
      })
    );
  }

  return risks;
}

function createSummary(
  delta: BusinessScenarioDelta,
  projected: BusinessScenarioMetrics
): string {
  const profitDirection =
    delta.grossProfit > 0
      ? 'artıyor'
      : delta.grossProfit < 0
        ? 'azalıyor'
        : 'değişmiyor';

  return (
    `Senaryo sonucunda tahmini ciro ` +
    `${delta.revenue >= 0 ? '+' : ''}${delta.revenue.toLocaleString(
      'tr-TR'
    )} ₺ değişiyor. ` +
    `Brüt kâr ${profitDirection} ve tahmini ` +
    `kâr marjı %${projected.profitMargin}.`
  );
}

export class BusinessScenarioSimulator {
  simulate(
    analysis: StoredBusinessDocumentAnalysis,
    input: BusinessScenarioInput
  ): BusinessScenarioResult {
    const revenue = findKpi(
      analysis,
      'semantic_total_revenue'
    );

    const totalCost = findKpi(
      analysis,
      'semantic_total_cost'
    );

    const grossProfit =
      findKpi(
        analysis,
        'semantic_gross_profit'
      ) || revenue - totalCost;

    const quantity = findKpi(
      analysis,
      'semantic_total_quantity'
    );

    const baseline: BusinessScenarioMetrics =
      Object.freeze({
        revenue: round(revenue),
        totalCost: round(totalCost),
        grossProfit: round(grossProfit),
        profitMargin: round(
          calculateMargin(
            revenue,
            grossProfit
          )
        ),
        quantity: round(quantity)
      });

    const priceRate =
      1 +
      clampPercent(
        input.priceChangePercent
      ) /
        100;

    const volumeRate =
      1 +
      clampPercent(
        input.salesVolumeChangePercent
      ) /
        100;

    const unitCostRate =
      1 +
      clampPercent(
        input.unitCostChangePercent
      ) /
        100;

    const fixedCostRate =
      1 +
      clampPercent(
        input.fixedCostChangePercent
      ) /
        100;

    const personnelCostRate =
      1 +
      clampPercent(
        input.personnelCostChangePercent
      ) /
        100;

    const projectedQuantity =
      Math.max(0, quantity * volumeRate);

    const projectedRevenue =
      Math.max(
        0,
        revenue * priceRate * volumeRate
      );

    const variableCostShare = 0.65;
    const fixedCostShare = 0.20;
    const personnelCostShare = 0.15;

    const projectedVariableCost =
      totalCost *
      variableCostShare *
      unitCostRate *
      volumeRate;

    const projectedFixedCost =
      totalCost *
      fixedCostShare *
      fixedCostRate;

    const projectedPersonnelCost =
      totalCost *
      personnelCostShare *
      personnelCostRate;

    const projectedTotalCost =
      Math.max(
        0,
        projectedVariableCost +
          projectedFixedCost +
          projectedPersonnelCost
      );

    const projectedGrossProfit =
      projectedRevenue -
      projectedTotalCost;

    const projected: BusinessScenarioMetrics =
      Object.freeze({
        revenue: round(projectedRevenue),
        totalCost: round(projectedTotalCost),
        grossProfit: round(
          projectedGrossProfit
        ),
        profitMargin: round(
          calculateMargin(
            projectedRevenue,
            projectedGrossProfit
          )
        ),
        quantity: round(projectedQuantity)
      });

    const delta: BusinessScenarioDelta =
      Object.freeze({
        revenue: round(
          projected.revenue - baseline.revenue
        ),
        totalCost: round(
          projected.totalCost -
            baseline.totalCost
        ),
        grossProfit: round(
          projected.grossProfit -
            baseline.grossProfit
        ),
        profitMargin: round(
          projected.profitMargin -
            baseline.profitMargin
        ),
        quantity: round(
          projected.quantity -
            baseline.quantity
        )
      });

    return Object.freeze({
      baseline,
      projected,
      delta,
      risks: Object.freeze(
        createRisks(projected)
      ),
      summary: createSummary(
        delta,
        projected
      ),
      disclosure:
        'Bu simülasyon deterministik varsayımlara dayalı karar destek çıktısıdır; finansal garanti veya yatırım tavsiyesi değildir.'
    });
  }
}
