import type { BusinessDocumentCategory } from '../models/DocumentClassification';
import type { BusinessKpi } from '../models/BusinessKpi';
import type { NormalizedDocument } from '../models/NormalizedDocument';

const CATEGORY_RECOMMENDATIONS: Readonly<
  Record<BusinessDocumentCategory, string[]>
> = {
  sales: [
    'Satışları ürün, müşteri ve dönem bazında karşılaştırın.',
    'Düşük performans gösteren ürün veya kanallar için aksiyon planı oluşturun.',
    'Ciro artışı ile kârlılık değişimini birlikte takip edin.'
  ],
  inventory: [
    'Düşük stok ve aşırı stok eşiklerini ürün bazında tanımlayın.',
    'Hareketsiz stokların sermaye üzerindeki etkisini inceleyin.',
    'Stok devir hızını dönemsel olarak takip edin.'
  ],
  finance: [
    'Gelir, gider ve nakit hareketlerini dönem bazında karşılaştırın.',
    'Olağan dışı gider artışlarını sorumlu birimlerle doğrulayın.',
    'Tahsilat ve ödeme vadelerini nakit akışıyla birlikte yönetin.'
  ],
  customers: [
    'Müşterileri değer, sıklık ve son işlem tarihine göre segmentlere ayırın.',
    'Kaybedilme riski taşıyan müşteriler için geri kazanım akışı oluşturun.',
    'Müşteri yoğunlaşması riskini düzenli olarak ölçün.'
  ],
  hr: [
    'Personel maliyetlerini departman ve performans göstergeleriyle karşılaştırın.',
    'Fazla mesai ve izin kullanımındaki olağan dışı değişimleri inceleyin.',
    'Çalışan devir oranını ekip ve dönem bazında takip edin.'
  ],
  operations: [
    'Gecikme ve hata nedenlerini süreç adımlarına göre sınıflandırın.',
    'Kapasite kullanımını talep ve teslimat performansıyla karşılaştırın.',
    'Tekrarlayan operasyon sorunları için kök neden analizi yapın.'
  ],
  unknown: [
    'Belge başlıklarını ve kolon adlarını daha açıklayıcı hale getirin.',
    'Analiz kalitesini artırmak için tarih ve sayısal değer alanlarını standartlaştırın.',
    'Belgenin iş amacını belirten bir dosya adı kullanın.'
  ]
};

export class BusinessRecommendationEngine {
  generate(
    document: NormalizedDocument,
    category: BusinessDocumentCategory,
    kpis: BusinessKpi[]
  ): string[] {
    const recommendations = [
      ...CATEGORY_RECOMMENDATIONS[category]
    ];

    if (document.warnings.length > 0) {
      recommendations.push(
        'Belge ayrıştırma uyarılarını inceleyerek eksik veya bozuk verileri düzeltin.'
      );
    }

    if (kpis.length === 0) {
      recommendations.push(
        'KPI üretilebilmesi için sayısal kolonlar ve düzenli tablo yapısı ekleyin.'
      );
    }

    return recommendations.slice(0, 5);
  }
}
