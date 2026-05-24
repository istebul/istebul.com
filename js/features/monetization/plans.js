/** Monetization plan definitions — copy & feature boundaries */

export const PLANS = {
  free: {
    id: 'free',
    name: 'Başlangıç',
    priceLabel: 'Ücretsiz',
    description: 'Temel karar analizi ve partner teklif talebi',
    highlights: [
      'Auto karar analizi (özet)',
      '2 araç karşılaştırma',
      'Partner teklif talebi',
      'Şeffaf metodoloji özeti'
    ]
  },
  pro: {
    id: 'pro',
    name: 'isteBul Pro',
    priceLabel: 'Aylık abonelik',
    priceHint: 'Stripe ile güvenli ödeme · dilediğiniz zaman iptal',
    description: 'Gelişmiş analiz, sınırsız karşılaştırma ve öncelikli partner eşleşmesi',
    trialDays: 7,
    trialLabel: '7 gün ücretsiz deneme',
    billing: {
      monthly: {
        id: 'monthly',
        label: 'Aylık',
        priceDisplay: '₺299',
        periodLabel: '/ ay',
        checkoutLabel: 'Aylık Pro\'ya geç'
      },
      annual: {
        id: 'annual',
        label: 'Yıllık',
        priceDisplay: '₺2.870',
        periodLabel: '/ yıl',
        monthlyEquivalent: '₺239 / ay',
        savingsLabel: '%20 tasarruf',
        discountPercent: 20,
        checkoutLabel: 'Yıllık Pro\'ya geç (indirimli)'
      }
    },
    highlights: [
      'Sınırsız karşılaştırma',
      'Detaylı premium karar raporu',
      'Gelişmiş AI karar özeti',
      'Öncelikli partner eşleşmesi',
      'Karar geçmişi ve export'
    ],
    cta: 'Pro\'ya geç'
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
  advanced_ai_summary: 'Gelişmiş AI karar özeti',
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
