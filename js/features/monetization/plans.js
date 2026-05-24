/** Monetization plan definitions — copy & feature boundaries */

export const PRICING_MESSAGING = Object.freeze({
  headline: 'Yanlış araç kararının maliyetini küçültün',
  subhead:
    'Pro bir “abonelik kutusu” değil — TCO, karşılaştırma ve raporla seçim riskini görünür kılar. Ücretsiz başlayın; ihtiyaç halinde derinleştirin.',
  popularBadge: 'En popüler',
  roiTitle: 'Karar maliyeti hesabı',
  roiDisclaimer:
    'Örnek senaryo; gerçek TCO sapması bütçe, kullanım ve piyasa koşullarına göre değişir. Getiri veya tasarruf garantisi verilmez.'
});

export const PLANS = {
  free: {
    id: 'free',
    name: 'Başlangıç',
    priceLabel: 'Ücretsiz',
    description: 'TCO özeti ve 2 model karşılaştırma — satın alma öncesi yanlış seçim riskini görün',
    highlights: [
      '5 adımlı maliyet analizi (Auto)',
      '2 araç TCO karşılaştırma',
      'İsteğe bağlı partner teklif talebi',
      'Şeffaf metodoloji özeti'
    ]
  },
  pro: {
    id: 'pro',
    name: 'isteBul Pro',
    priceLabel: 'Aylık abonelik',
    priceHint: 'Stripe ile güvenli ödeme · dilediğiniz zaman iptal',
    description: 'Derin TCO raporu, sınırsız karşılaştırma ve öncelikli yönlendirme — tek yanlış seçim maliyetine göre düşük risk',
    trialDays: 7,
    trialLabel: '7 gün ücretsiz dene',
    billing: {
      monthly: {
        id: 'monthly',
        label: 'Aylık',
        priceDisplay: '₺299',
        periodLabel: '/ ay',
        checkoutLabel: 'Aylık Pro — karar netliğini aç'
      },
      annual: {
        id: 'annual',
        label: 'Yıllık',
        priceDisplay: '₺2.870',
        periodLabel: '/ yıl',
        monthlyEquivalent: '₺239 / ay',
        savingsLabel: '12 aylık ödemeye göre daha az',
        discountPercent: 20,
        checkoutLabel: 'Yıllık Pro — aylık ₺239 ile devam et'
      }
    },
    highlights: [
      'Sınırsız karşılaştırma',
      'Detaylı premium karar raporu',
      'Şeffaf AI gerekçe özeti (skoru değiştirmez)',
      'Öncelikli partner eşleşmesi',
      'Karar geçmişi ve export'
    ],
    cta: 'Karar riskini azalt'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Özel teklif',
    description: 'Kurumsal ekipler, galeri ağları ve yüksek hacimli partner operasyonları',
    highlights: [
      'Özel SLA ve destek hattı',
      'API / webhook entegrasyonu',
      'Çoklu kullanıcı ve rol yönetimi',
      'Özel metodoloji ve raporlama',
      'Beyaz etiket seçenekleri'
    ],
    cta: 'Kurumsal teklif al',
    contactHref: '/iletisim.html?konu=enterprise'
  }
};

export const FREE_LIMITS = {
  maxComparisons: 2,
  maxAutoResultsPreview: 3,
  premiumReport: false,
  advancedAiSummary: false,
  priorityPartner: false
};

export const PRO_FEATURES = {
  comparison_unlimited: 'Sınırsız karşılaştırma',
  premium_report: 'Detaylı premium karar raporu',
  advanced_ai_summary: 'Şeffaf AI gerekçe özeti',
  priority_partner: 'Öncelikli partner yönlendirme',
  decision_export: 'Karar geçmişi export'
};

export const AFFILIATE_DEFAULTS = {
  source: 'istebul',
  medium: 'referral',
  campaign: 'marketplace'
};

export const PARTNER_OFFERS = {
  dealer: { label: 'Galeri lead', revenueHint: '₺5.000+ / sıcak lead' },
  finance: { label: 'Finansman lead', revenueHint: '₺2.000+ / onaylı başvuru' },
  insurance: { label: 'Sigorta lead', revenueHint: '₺1.500+ / poliçe' },
  premium_report: { label: 'Premium rapor', revenueHint: '₺499+ / rapor' }
};
