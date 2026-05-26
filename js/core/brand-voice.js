/**
 * P4.6 — Single brand voice: premium, güvenilir, akıllı, net, profesyonel.
 * Karar altyapısı tonu; ilan pazarı veya startup jargonu değil.
 */

export const BRAND_VOICE = Object.freeze({
  productName: 'isteBul',
  categoryLabel: 'Karar altyapısı',
  positioningLine: 'Pahalı bir araç hatasından kaçının.',
  leadLine:
    'Gerçek sahip olma maliyetini görün, seçenekleri güvenle karşılaştırın ve gizli maliyet riskini erken fark edin — ilan listesi değil, karar desteği.',

  cta: {
    primaryAuto: 'TCO analizini başlat',
    primaryAutoLong: 'Ücretsiz TCO analizi başlat',
    methodology: 'Metodolojiyi incele',
    plans: 'Planları incele',
    analysisStart: 'Analizi başlat',
    saveAnalysis: 'Analizini kaydet ve devam et',
    accountLogin: 'Giriş Yap',
    accountRegister: 'Analizini kaydet',
    addOption: 'Seçenek ekle',
    publishOption: 'Seçeneği kaydet',
    continueFree: 'Ücretsiz önizlemeyle devam et',
    externalSource: 'Kaynağı görüntüle'
  },

  trust: {
    heroHint: '~2 dk · KVKK uyumlu · bağlayıcı teklif değil',
    railLine:
      'Skor ve TCO kural tabanlı · AI yalnızca gerekçe · metodolojik destek',
    stickyLine:
      'Skor ve TCO kural tabanlı · AI yalnızca gerekçe · ödeme Stripe ile',
    pricingLine:
      '7 gün deneme · iptal tek tık · fatura Stripe müşteri panelinden',
    compliance:
      'Skorlar ve bantlar metodolojik destek sunar; kesin sonuç veya finansal taahhüt değildir.',
    sampleNote:
      'Gösterim amaçlıdır; canlı analizde değerler girdilerinize göre hesaplanır.'
  },

  kickers: {
    trust: 'Güvenilirlik',
    methodology: 'Metodoloji',
    process: 'Süreç',
    options: 'Seçenekler',
    detail: 'Seçenek detayı',
    compare: 'Karşılaştırma',
    preview: 'Karar önizlemesi',
    faq: 'SSS',
    category: 'Kategori çerçevesi'
  },

  headings: {
    trust: 'Karar için netlik — pazarlama söylemi değil',
    options: 'Öne çıkan seçenekler',
    compare: 'Seçenekleri yan yana değerlendirin',
    howItWorks: 'Üç adımda karar çıktısı'
  },

  labels: {
    option: 'seçenek',
    options: 'seçenekler',
    decisionScore: 'uyum skoru',
    liveListing: 'canlı kayıt',
    referenceModel: 'referans model önerisi'
  }
});

/** @deprecated Prefer BRAND_VOICE — kept for conversion module compatibility */
export function getPrimaryAutoCta({ long = false } = {}) {
  return long ? BRAND_VOICE.cta.primaryAutoLong : BRAND_VOICE.cta.primaryAuto;
}
