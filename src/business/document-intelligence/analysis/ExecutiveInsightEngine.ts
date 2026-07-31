import type { BusinessInsight } from '../models/BusinessInsight';
import type { BusinessKpi } from '../models/BusinessKpi';
import type { NormalizedDocument } from '../models/NormalizedDocument';

function getKpi(
  kpis: readonly BusinessKpi[],
  id: string
): BusinessKpi | undefined {
  return kpis.find((kpi) => kpi.id === id);
}

function getValue(
  kpis: readonly BusinessKpi[],
  id: string
): number {
  return getKpi(kpis, id)?.value ?? 0;
}

function formatTry(value: number): string {
  return value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  }) + ' ₺';
}

function formatPercent(value: number): string {
  return `%${value.toLocaleString('tr-TR', {
    maximumFractionDigits: 2
  })}`;
}

function profitabilityInsight(
  kpis: readonly BusinessKpi[]
): BusinessInsight | null {
  const revenue = getValue(
    kpis,
    'semantic_total_revenue'
  );
  const profit = getValue(
    kpis,
    'semantic_gross_profit'
  );
  const margin = getValue(
    kpis,
    'semantic_profit_margin'
  );

  if (revenue <= 0) return null;

  if (profit < 0 || margin < 0) {
    return {
      id: 'executive-profitability-critical',
      title: 'Kârlılık riski tespit edildi',
      description:
        `Toplam ciro ${formatTry(revenue)} olmasına rağmen ` +
        `brüt sonuç ${formatTry(profit)} seviyesinde. ` +
        'Maliyet yapısı ve fiyatlandırma acilen gözden geçirilmelidir.',
      severity: 'critical',
      source: 'executive-profitability'
    };
  }

  if (margin < 10) {
    return {
      id: 'executive-profitability-warning',
      title: 'Kâr marjı düşük seviyede',
      description:
        `Brüt kâr marjı ${formatPercent(margin)}. ` +
        'Fiyatlandırma, ürün karması ve doğrudan maliyetler incelenmelidir.',
      severity: 'warning',
      source: 'executive-profitability'
    };
  }

  if (margin >= 30) {
    return {
      id: 'executive-profitability-strong',
      title: 'Kârlılık güçlü görünüyor',
      description:
        `Brüt kâr ${formatTry(profit)} ve kâr marjı ` +
        `${formatPercent(margin)} seviyesinde.`,
      severity: 'success',
      source: 'executive-profitability'
    };
  }

  return {
    id: 'executive-profitability-stable',
    title: 'Kârlılık kabul edilebilir seviyede',
    description:
      `Brüt kâr ${formatTry(profit)}, kâr marjı ise ` +
      `${formatPercent(margin)} olarak hesaplandı.`,
    severity: 'info',
    source: 'executive-profitability'
  };
}

function costPressureInsight(
  kpis: readonly BusinessKpi[]
): BusinessInsight | null {
  const revenue = getValue(
    kpis,
    'semantic_total_revenue'
  );
  const cost = getValue(
    kpis,
    'semantic_total_cost'
  );

  if (revenue <= 0 || cost <= 0) return null;

  const costRatio = (cost / revenue) * 100;

  if (costRatio >= 90) {
    return {
      id: 'executive-cost-pressure-critical',
      title: 'Maliyet baskısı kritik seviyede',
      description:
        `Toplam maliyet cironun ${formatPercent(costRatio)} oranına ulaşıyor. ` +
        'Tedarik, üretim ve operasyon maliyetleri öncelikli olarak incelenmelidir.',
      severity: 'critical',
      source: 'executive-cost-pressure'
    };
  }

  if (costRatio >= 75) {
    return {
      id: 'executive-cost-pressure-warning',
      title: 'Maliyet baskısı yüksek',
      description:
        `Toplam maliyet ${formatTry(cost)} ve cironun ` +
        `${formatPercent(costRatio)} oranında.`,
      severity: 'warning',
      source: 'executive-cost-pressure'
    };
  }

  return {
    id: 'executive-cost-pressure-stable',
    title: 'Maliyet oranı kontrol altında',
    description:
      `Toplam maliyet cironun ${formatPercent(costRatio)} oranında.`,
    severity: 'success',
    source: 'executive-cost-pressure'
  };
}

function salesVolumeInsight(
  kpis: readonly BusinessKpi[]
): BusinessInsight | null {
  const quantity = getValue(
    kpis,
    'semantic_total_quantity'
  );
  const records = getValue(
    kpis,
    'semantic_total_records'
  );

  if (records <= 0) return null;

  if (quantity <= 0) {
    return {
      id: 'executive-sales-volume-missing',
      title: 'Satış hacmi ölçülemiyor',
      description:
        'Kayıtlar mevcut ancak satış adedi alanı bulunamadı veya sıfır değer içeriyor.',
      severity: 'warning',
      source: 'executive-sales-volume'
    };
  }

  return {
    id: 'executive-sales-volume',
    title: 'Satış hacmi ölçüldü',
    description:
      `${records.toLocaleString('tr-TR')} kayıt içinde ` +
      `${quantity.toLocaleString('tr-TR')} adet satış tespit edildi.`,
    severity: 'info',
    source: 'executive-sales-volume'
  };
}

function productLeadershipInsights(
  kpis: readonly BusinessKpi[]
): BusinessInsight[] {
  const insights: BusinessInsight[] = [];

  const revenueLeader = getKpi(
    kpis,
    'semantic_top_revenue_product'
  );

  if (revenueLeader) {
    insights.push({
      id: 'executive-revenue-leader',
      title: 'Ciro lideri belirlendi',
      description:
        `${revenueLeader.label.replace('En Yüksek Ciro: ', '')} ` +
        `${formatTry(revenueLeader.value)} ciro üretti.`,
      severity: 'success',
      source: 'executive-product-performance'
    });
  }

  const quantityLeader = getKpi(
    kpis,
    'semantic_top_quantity_product'
  );

  if (quantityLeader) {
    insights.push({
      id: 'executive-quantity-leader',
      title: 'Satış adedi lideri belirlendi',
      description:
        `${quantityLeader.label.replace('En Çok Satan: ', '')} ` +
        `${quantityLeader.value.toLocaleString('tr-TR')} adet satışla öne çıktı.`,
      severity: 'info',
      source: 'executive-product-performance'
    });
  }

  return insights;
}

function dataQualityInsight(
  document: NormalizedDocument
): BusinessInsight {
  const totalCells = document.tables.reduce(
    (sum, table) =>
      sum + table.rowCount * table.columns.length,
    0
  );

  const nullCells = document.tables.reduce(
    (sum, table) =>
      sum +
      table.columns.reduce(
        (columnSum, column) =>
          columnSum + column.nullCount,
        0
      ),
    0
  );

  const nullRate =
    totalCells > 0
      ? (nullCells / totalCells) * 100
      : 100;

  if (nullRate >= 30) {
    return {
      id: 'executive-data-quality-critical',
      title: 'Veri kalitesi düşük',
      description:
        `Hücrelerin yaklaşık ${formatPercent(nullRate)} oranında boş değer içerdiği tespit edildi.`,
      severity: 'critical',
      source: 'executive-data-quality'
    };
  }

  if (nullRate >= 10) {
    return {
      id: 'executive-data-quality-warning',
      title: 'Veri kalitesi geliştirilebilir',
      description:
        `Boş hücre oranı ${formatPercent(nullRate)} seviyesinde.`,
      severity: 'warning',
      source: 'executive-data-quality'
    };
  }

  return {
    id: 'executive-data-quality-strong',
    title: 'Veri kalitesi güçlü',
    description:
      `Boş hücre oranı yalnızca ${formatPercent(nullRate)} seviyesinde.`,
    severity: 'success',
    source: 'executive-data-quality'
  };
}

export class ExecutiveInsightEngine {
  generate(
    document: NormalizedDocument,
    kpis: readonly BusinessKpi[]
  ): BusinessInsight[] {
    const insights: BusinessInsight[] = [];

    const profitability = profitabilityInsight(kpis);
    const costPressure = costPressureInsight(kpis);
    const salesVolume = salesVolumeInsight(kpis);

    if (profitability) insights.push(profitability);
    if (costPressure) insights.push(costPressure);
    if (salesVolume) insights.push(salesVolume);

    insights.push(
      ...productLeadershipInsights(kpis),
      dataQualityInsight(document)
    );

    return insights;
  }
}

export default ExecutiveInsightEngine;
