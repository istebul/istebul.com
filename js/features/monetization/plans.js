/** Monetization plan definitions — copy & feature boundaries */
import { BRAND_VOICE } from '../../core/brand-voice.js';

export const PRICING_MESSAGING = Object.freeze({
  headline: 'Yanlış araç seçimi yıllık maliyette çok daha pahalıya patlar',
  subhead:
    'Bu planlar İSTEBUL AI karar altyapısına aittir (GarsonAI / İSTEBUL Business değil). Bakım, yakıt, kredi, sigorta ve değer kaybı birlikte düşünülmezse “ucuz araç” pahalıya çıkar. Ücretsiz temel analiz; Pro ile senaryo karşılaştırma ve gelişmiş AI açıklaması.',
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
    name: 'İSTEBUL AI Pro',
    priceLabel: 'Erken erişim',
    priceHint: 'Ödeme aktivasyonu sonrası bilgilendirme · pilot erişim sürecinde',
    description: 'Detaylı TCO, senaryo karşılaştırma, gelişmiş AI açıklama ve premium rapor',
    trialDays: 0,
    trialLabel: 'Erken erişim talep et',
    billing: {
      monthly: {
        id: 'monthly',
        label: 'Aylık',
        priceDisplay: 'Erken erişim',
        periodLabel: '',
        checkoutLabel: 'Pro erken erişim talep et'
      },
      annual: {
        id: 'annual',
        label: 'Yıllık',
        priceDisplay: 'Pilot erişim',
        periodLabel: '',
        monthlyEquivalent: 'Aktivasyon sonrası',
        savingsLabel: 'Fiyat aktivasyon sonrası duyurulur',
        discountPercent: 0,
        checkoutLabel: 'Pro pilot erişim talep et'
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
    cta: 'Erken erişim talep et'
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
