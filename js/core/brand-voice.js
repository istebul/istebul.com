/**
 * P4.6 — Single brand voice: premium, güvenilir, akıllı, net, profesyonel.
 * AI destekli karar zekası platformu tonu.
 */

export const BRAND_VOICE = Object.freeze({
  productName: 'isteBul',
  categoryLabel: 'AI destekli karar zekası',
  positioningLine: 'AI ile büyük satın alma kararlarını daha doğru ver',
  leadLine:
    'Araba, ev, tatil ve finans kararlarında toplam maliyeti, riskleri ve size en uygun seçenekleri analiz edin.',

  cta: {
    primaryDecision: 'Kararını analiz et',
    primaryDecisionFree: 'Ön değerlendirmeye başla',
    primaryAuto: 'Auto analizini dene',
    primaryAutoLegacy: 'Tam analize başla',
    primaryAutoLong: 'Tam analize başla',
    methodology: 'Metodolojiyi gör',
    plans: 'Planları incele',
    analysisStart: 'Ön değerlendirmeye başla',
    saveAnalysis: 'Analizini kaydet ve devam et',
    accountLogin: 'Giriş Yap',
    accountRegister: 'Analizini kaydet',
    addOption: 'Seçenek ekle',
    publishOption: 'Seçeneği kaydet',
    continueFree: 'Önizlemeyle devam et',
    detailReport: 'Detaylı raporu aç',
    partnerOffer: 'Partner teklifine yönlen',
    externalSource: 'Kaynağı görüntüle'
  },

  trust: {
    heroHint: 'Pilot aşama · ~2 dk · KVKK uyumlu',
    railLine:
      'Skor metodolojisi açık · AI skoru tek başına değiştirmez · şeffaf TCO',
    stickyLine:
      'Skor ve TCO kural tabanlı · AI yalnızca gerekçe · ödeme iyzico / PayTR',
    pricingLine:
      'Yanlış seçim maliyeti · 7 gün deneme · iptal tek tık',
    compliance:
      'Finansal tavsiye değildir. Skorlar bilgilendirme amaçlıdır; kesin sonuç veya getiri taahhüdü yoktur.',
    sampleNote:
      'Gösterim amaçlıdır; canlı analizde değerler girdilerinize göre hesaplanır.',
    pilotMetrics: {
      stage: 'Pilot aşama',
      region: 'İzmir odaklı ilk partner ağı',
      access: 'Erken erişim',
      infra: 'Gerçek veri entegrasyonları için hazırlanan altyapı'
    }
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
    category: 'Kategori çerçevesi',
    problem: 'Problem',
    aiEngine: 'Karar motoru',
    tco: 'Maliyet merceği'
  },

  headings: {
    trust: 'Güven katmanı — şeffaf karar desteği',
    options: 'Öne çıkan seçenekler',
    compare: 'Seçenekleri yan yana değerlendirin',
    howItWorks: 'isteBul nasıl karar verir?'
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
