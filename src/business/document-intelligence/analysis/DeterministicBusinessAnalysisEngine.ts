import type { BusinessAnalysisEngine } from './BusinessAnalysisEngine';
import type { BusinessAnalysisResult } from '../models/BusinessAnalysisResult';
import type { BusinessInsight } from '../models/BusinessInsight';
import type {
  BusinessDocumentCategory,
  DocumentClassification
} from '../models/DocumentClassification';
import type { NormalizedDocument } from '../models/NormalizedDocument';
import { BusinessKpiExtractor } from '../kpi/BusinessKpiExtractor';
import { BusinessRecommendationEngine } from '../recommendations/BusinessRecommendationEngine';
import { BusinessHealthScorer } from '../scoring/BusinessHealthScorer';

const CATEGORY_LABELS: Readonly<
  Record<BusinessDocumentCategory, string>
> = {
  sales: 'satış',
  inventory: 'stok ve envanter',
  finance: 'finans',
  customers: 'müşteri',
  hr: 'insan kaynakları',
  operations: 'operasyon',
  unknown: 'genel işletme'
};

function createInsights(
  document: NormalizedDocument,
  classification: DocumentClassification
): BusinessInsight[] {
  const totalRows = document.tables.reduce(
    (sum, table) => sum + table.rowCount,
    0
  );

  const numericColumnCount = document.tables.reduce(
    (sum, table) =>
      sum +
      table.columns.filter((column) =>
        ['number', 'currency', 'percentage'].includes(
          column.detectedType
        )
      ).length,
    0
  );

  const insights: BusinessInsight[] = [
    {
      id: 'document-structure',
      title: 'Belge yapısı incelendi',
      description:
        `${document.tables.length} tablo, ` +
        `${totalRows} kayıt ve ` +
        `${numericColumnCount} sayısal kolon tespit edildi.`,
      severity: 'info',
      source: 'document-structure'
    }
  ];

  if (classification.category !== 'unknown') {
    insights.push({
      id: 'document-classification',
      title: 'Belge türü sınıflandırıldı',
      description:
        `Belge, %${Math.round(
          classification.confidence * 100
        )} güven düzeyiyle ` +
        `${CATEGORY_LABELS[classification.category]} belgesi olarak değerlendirildi.`,
      severity:
        classification.confidence >= 0.6
          ? 'success'
          : 'warning',
      source: 'document-classification'
    });
  } else {
    insights.push({
      id: 'document-classification-unknown',
      title: 'Belge türü kesinleştirilemedi',
      description:
        'Kolon adları ve belge içeriği belirli bir işletme kategorisiyle yeterli düzeyde eşleşmedi.',
      severity: 'warning',
      source: 'document-classification'
    });
  }

  if (document.warnings.length > 0) {
    insights.push({
      id: 'document-warnings',
      title: 'Veri kalitesi uyarıları bulundu',
      description:
        `${document.warnings.length} ayrıştırma veya normalizasyon uyarısı analiz sonucunu etkileyebilir.`,
      severity: 'warning',
      source: 'document-warnings'
    });
  }

  if (totalRows === 0) {
    insights.push({
      id: 'empty-document',
      title: 'Analiz edilebilir kayıt bulunamadı',
      description:
        'Belge yapısı algılandı ancak tablo satırı bulunmadığı için ayrıntılı KPI üretilemedi.',
      severity: 'critical',
      source: 'document-structure'
    });
  }

  return insights;
}

function buildSummary(
  document: NormalizedDocument,
  classification: DocumentClassification,
  score: number,
  kpiCount: number
): string {
  const categoryLabel =
    CATEGORY_LABELS[classification.category];

  return (
    `${document.title} belgesi ${categoryLabel} kapsamında analiz edildi. ` +
    `Belge sağlık skoru ${score}/100 olarak hesaplandı ve ` +
    `${kpiCount} temel performans göstergesi üretildi.`
  );
}

export class DeterministicBusinessAnalysisEngine
  implements BusinessAnalysisEngine
{
  constructor(
    private readonly kpiExtractor = new BusinessKpiExtractor(),
    private readonly scorer = new BusinessHealthScorer(),
    private readonly recommendationEngine =
      new BusinessRecommendationEngine()
  ) {}

  async analyze(
    document: NormalizedDocument,
    classification: DocumentClassification
  ): Promise<BusinessAnalysisResult> {
    const kpis = this.kpiExtractor.extract(document);
    const score = this.scorer.score(
      document,
      classification
    );
    const insights = createInsights(
      document,
      classification
    );
    const recommendations =
      this.recommendationEngine.generate(
        document,
        classification.category,
        kpis
      );

    return {
      documentId: document.documentId,
      category: classification.category,
      score,
      summary: buildSummary(
        document,
        classification,
        score,
        kpis.length
      ),
      kpis,
      insights,
      recommendations,
      analyzedAt: new Date().toISOString()
    };
  }
}
