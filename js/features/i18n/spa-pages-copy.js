/** SPA inner pages — announcements, campaigns, blog, planlar prerender shells */
const tr = {
  announcements: {
    kicker: 'Duyurular',
    title: 'isteBul duyuruları',
    lead: 'Ürün güncellemeleri, metodoloji notları ve operasyonel bilgilendirmeler — bağlayıcı teklif değildir.',
    backHome: '← Ana sayfa',
    freeAnalysis: 'Ücretsiz analiz'
  },
  campaigns: {
    kicker: 'Kampanyalar',
    title: 'Aktif kampanyalar',
    lead: 'Pro deneme, ücretsiz Auto analizi ve pilot partner fırsatları. Koşullar değişebilir; finansal taahhüt içermez.',
    backHome: '← Ana sayfa',
    plans: 'Planlar'
  },
  blog: {
    kicker: 'Blog',
    title: 'Karar rehberleri',
    lead: 'TCO, finansman ve araç alım kararı — bilgilendirme amaçlı; yatırım veya kredi tavsiyesi değildir.',
    backHome: '← Ana sayfa',
    tcoGuide: 'TCO rehberi'
  },
  planlar: {
    kicker: 'Planlar',
    title: 'Planlar ve fiyatlandırma',
    lead: 'Ücretsiz TCO özeti ile başlayın. Pro ile sınırsız karşılaştırma, premium karar raporu ve partner eşleşmesi — iyzico / PayTR ile güvenli ödeme.',
    starterBullet: 'Başlangıç: sınırlı analiz ve 2 karşılaştırma',
    proBullet: 'Pro: derin TCO, AI karar notu, premium export',
    enterpriseBullet: 'Enterprise: API, webhook, SLA',
    cancelBullet: 'İstediğiniz zaman iptal',
    ctaPrimary: 'Ücretsiz analiz başlat',
    ctaSecondary: 'Metodolojiyi incele'
  },
  premiumKarar: {
    previewTitle: 'Karar önizlemesi',
    previewLead: 'Kısa sorularla maliyet sinyallerini görün. Tam TCO analizi ve sıralama için Auto akışını kullanın.',
    compareTitle: 'İki seçeneği yan yana görün',
    compareLead: 'Pro ile 4 modele kadar detaylı karşılaştırma; ücretsiz planda 2 model.',
    trustKvkk: 'KVKK uyumlu',
    trustTls: 'TLS şifreleme',
    trustScoring: 'Açık skorlama',
    trustNoPressure: 'Satıcı baskısı yok'
  },
  premiumMetodoloji: {
    title: 'Karar metodolojisi',
    lead: 'Skor, TCO ve AI gerekçesi nasıl üretilir — şeffaf sınırlarla.',
    stepsTitle: 'Beş adımlı süreç',
    limitsTitle: 'Sınırlar ve sorumluluk'
  }
};

const en = {
  announcements: {
    kicker: 'Announcements',
    title: 'isteBul announcements',
    lead: 'Product updates, methodology notes and operational notices — not a binding offer.',
    backHome: '← Home',
    freeAnalysis: 'Free analysis'
  },
  campaigns: {
    kicker: 'Campaigns',
    title: 'Active campaigns',
    lead: 'Pro trial, free Auto analysis and pilot partner opportunities. Terms may change; no financial commitment.',
    backHome: '← Home',
    plans: 'Plans'
  },
  blog: {
    kicker: 'Blog',
    title: 'Decision guides',
    lead: 'TCO, finance and vehicle purchase decisions — informational only; not investment or loan advice.',
    backHome: '← Home',
    tcoGuide: 'TCO guide'
  },
  planlar: {
    kicker: 'Plans',
    title: 'Plans and pricing',
    lead: 'Start with a free TCO summary. Pro unlocks unlimited comparisons, premium decision reports and partner matching — secure iyzico / PayTR checkout.',
    starterBullet: 'Starter: limited analysis and 2 comparisons',
    proBullet: 'Pro: deep TCO, AI decision notes, premium export',
    enterpriseBullet: 'Enterprise: API, webhook, SLA',
    cancelBullet: 'Cancel anytime',
    ctaPrimary: 'Start free analysis',
    ctaSecondary: 'Explore methodology'
  },
  premiumKarar: {
    previewTitle: 'Decision preview',
    previewLead: 'See cost signals with a short questionnaire. Use Auto flow for full TCO ranking.',
    compareTitle: 'Compare two options side by side',
    compareLead: 'Pro supports up to 4 models; free plan includes 2.',
    trustKvkk: 'Privacy compliant',
    trustTls: 'TLS encryption',
    trustScoring: 'Transparent scoring',
    trustNoPressure: 'No seller pressure'
  },
  premiumMetodoloji: {
    title: 'Decision methodology',
    lead: 'How score, TCO and AI rationale are produced — with clear limits.',
    stepsTitle: 'Five-step process',
    limitsTitle: 'Limits and responsibility'
  }
};

const de = {
  ...en,
  announcements: {
    kicker: 'Ankündigungen',
    title: 'isteBul Ankündigungen',
    lead: 'Produktupdates, Methodik-Hinweise und operative Mitteilungen — kein bindendes Angebot.',
    backHome: '← Startseite',
    freeAnalysis: 'Kostenlose Analyse'
  },
  campaigns: {
    kicker: 'Kampagnen',
    title: 'Aktive Kampagnen',
    lead: 'Pro-Testphase, kostenlose Auto-Analyse und Pilot-Partnerangebote. Bedingungen können sich ändern.',
    backHome: '← Startseite',
    plans: 'Pläne'
  },
  blog: {
    kicker: 'Blog',
    title: 'Entscheidungsleitfäden',
    lead: 'TCO, Finanzierung und Fahrzeugkauf — nur zur Information; keine Anlage- oder Kreditberatung.',
    backHome: '← Startseite',
    tcoGuide: 'TCO-Leitfaden'
  },
  planlar: {
    ...en.planlar,
    kicker: 'Pläne',
    title: 'Pläne und Preise',
    lead: 'Starten Sie mit einer kostenlosen TCO-Zusammenfassung. Pro bietet unbegrenzte Vergleiche und Premium-Berichte — sichere iyzico / PayTR-Zahlung.',
    ctaPrimary: 'Kostenlose Analyse starten',
    ctaSecondary: 'Methodik ansehen'
  }
};

const ar = {
  ...en,
  announcements: {
    kicker: 'الإعلانات',
    title: 'إعلانات isteBul',
    lead: 'تحديثات المنتج وملاحظات المنهجية — ليست عرضًا ملزمًا.',
    backHome: '← الرئيسية',
    freeAnalysis: 'تحليل مجاني'
  },
  campaigns: {
    kicker: 'الحملات',
    title: 'الحملات النشطة',
    lead: 'تجربة Pro وتحليل Auto مجاني وفرص شركاء تجريبيين. الشروط قابلة للتغيير.',
    backHome: '← الرئيسية',
    plans: 'الخطط'
  },
  blog: {
    kicker: 'المدونة',
    title: 'أدلة القرار',
    lead: 'TCO والتمويل وشراء المركبات — للمعلومات فقط.',
    backHome: '← الرئيسية',
    tcoGuide: 'دليل TCO'
  }
};

export const spaPagesCopy = { tr, en, de, ar };
