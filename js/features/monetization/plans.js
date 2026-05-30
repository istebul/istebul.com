/** Monetization plan definitions — copy & feature boundaries */
import { BRAND_VOICE } from '../../core/brand-voice.js';

export const PRICING_MESSAGING = Object.freeze({
  headline: 'Yanlış araç seçimi yıllık maliyette çok daha pahalıya patlar',
  subhead:
    'Bakım, yakıt, kredi, sigorta ve değer kaybı birlikte düşünülmezse “ucuz araç” pahalıya çıkar. isteBul karar altyapısı: ücretsiz temel analiz; Pro ile senaryo karşılaştırma ve gelişmiş AI açıklaması.',
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
    description: 'Temel analiz — TCO özeti ve önizleme; üyelik zorunlu değil',
    highlights: [
      'Temel TCO ve uyum skoru',
      '2 araç karşılaştırma',
      'Karar önizlemesi',
      'Saatlik AI gerekçe kotası'
    ]
  },
  pro: {
    id: 'pro',
    name: 'isteBul Pro',
    priceLabel: 'Aylık abonelik',
    priceHint: 'iyzico / PayTR ile güvenli ödeme · dilediğiniz zaman iptal',
    description: 'Detaylı TCO, senaryo karşılaştırma, gelişmiş AI açıklama ve premium rapor',
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
      'Premium karar raporu',
      'Derin TCO kırılımı',
      'AI karar özeti (skoru değiştirmez)',
      'Finans partner eşleşmesi',
      'Öncelikli destek ve müzakere içgörüleri',
      'Premium export / raporlama'
    ],
    cta: 'Karar riskini azalt'
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceLabel: 'Özel teklif',
    description: 'Sıcak lead, CRM, webhook/API ve pilot partner operasyonları',
    highlights: [
      'Skorlu sıcak lead',
      'CRM ve webhook/API',
      'Pilot çalışma ve SLA',
      'Özel metodoloji',
      'Kurumsal destek'
    ],
    cta: 'Kurumsal teklif al',
    contactHref: '/iletisim.html?konu=enterprise'
  }
};

export const FREE_LIMITS = {
  maxComparisons: 2,
  maxAutoResultsPreview: 3,
  premiumReport: false,
  advancedAiSummary: true,
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
