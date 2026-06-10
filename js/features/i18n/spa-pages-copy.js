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
    ctaPrimary: 'Ücretsiz karar analizi başlat',
    ctaSecondary: 'Metodolojiyi incele'
  },
  premiumKarar: {
    heroLead: 'Kısa sorularla kategori ve ön değerlendirme sinyallerini görün; tam skor ve detaylı analiz ilgili kategori akışında hesaplanır.',
    roleNote: 'Karar Asistanı, hangi kategori analizine devam etmeniz gerektiğini belirler. Nihai skor ve detaylı analiz ilgili kategori akışında hesaplanır.',
    previewTitle: 'Ön değerlendirme',
    previewLead: 'Kısa sorularla kategori niyetinizi ve ön sinyalleri görün. Tam karar analizi için ilgili kategori wizard akışına devam edin.',
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
    heroLead: 'See category intent and pre-evaluation signals with short questions; full score and detailed analysis run in the category flow.',
    roleNote: 'The Decision Assistant identifies which category analysis to continue. Final score and detailed analysis are calculated in that category flow.',
    previewTitle: 'Pre-evaluation',
    previewLead: 'Answer a few questions to see category intent and early signals. Continue to the category wizard for full decision analysis.',
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
  },
  planlar: {
    kicker: 'الخطط',
    title: 'الخطط والأسعار',
    lead: 'ابدأ بملخص TCO مجاني. Pro يفتح مقارنات غير محدودة وتقارير قرار مميزة — دفع آمن عبر iyzico / PayTR.',
    starterBullet: 'البداية: تحليل محدود ومقارنتان',
    proBullet: 'Pro: TCO عميق، ملاحظات قرار AI، تصدير مميز',
    enterpriseBullet: 'Enterprise: API، webhook، SLA',
    cancelBullet: 'إلغاء في أي وقت',
    ctaPrimary: 'ابدأ تحليلًا مجانيًا',
    ctaSecondary: 'استكشف المنهجية'
  }
};

const it = {
  ...en,
  announcements: { ...en.announcements, kicker: 'Annunci', title: 'Annunci isteBul', backHome: '← Home', freeAnalysis: 'Analisi gratuita' },
  campaigns: { ...en.campaigns, kicker: 'Campagne', title: 'Campagne attive', backHome: '← Home', plans: 'Piani' },
  blog: { ...en.blog, kicker: 'Blog', title: 'Guide decisionali', backHome: '← Home', tcoGuide: 'Guida TCO' },
  planlar: {
    ...en.planlar,
    kicker: 'Piani',
    title: 'Piani e prezzi',
    ctaPrimary: 'Avvia analisi gratuita',
    ctaSecondary: 'Esplora la metodologia'
  }
};

const fr = {
  ...en,
  announcements: { ...en.announcements, kicker: 'Annonces', title: 'Annonces isteBul', backHome: '← Accueil', freeAnalysis: 'Analyse gratuite' },
  campaigns: { ...en.campaigns, kicker: 'Campagnes', title: 'Campagnes actives', backHome: '← Accueil', plans: 'Offres' },
  blog: { ...en.blog, kicker: 'Blog', title: 'Guides décisionnels', backHome: '← Accueil', tcoGuide: 'Guide TCO' },
  planlar: {
    ...en.planlar,
    kicker: 'Offres',
    title: 'Offres et tarifs',
    ctaPrimary: 'Lancer une analyse gratuite',
    ctaSecondary: 'Explorer la méthodologie'
  }
};

const es = {
  ...en,
  announcements: { ...en.announcements, kicker: 'Anuncios', title: 'Anuncios isteBul', backHome: '← Inicio', freeAnalysis: 'Análisis gratis' },
  campaigns: { ...en.campaigns, kicker: 'Campañas', title: 'Campañas activas', backHome: '← Inicio', plans: 'Planes' },
  blog: { ...en.blog, kicker: 'Blog', title: 'Guías de decisión', backHome: '← Inicio', tcoGuide: 'Guía TCO' },
  planlar: {
    ...en.planlar,
    kicker: 'Planes',
    title: 'Planes y precios',
    ctaPrimary: 'Iniciar análisis gratis',
    ctaSecondary: 'Explorar metodología'
  }
};

const ja = {
  ...en,
  announcements: { ...en.announcements, kicker: 'お知らせ', title: 'isteBul お知らせ', backHome: '← ホーム', freeAnalysis: '無料分析' },
  campaigns: { ...en.campaigns, kicker: 'キャンペーン', title: 'アクティブなキャンペーン', backHome: '← ホーム', plans: 'プラン' },
  blog: { ...en.blog, kicker: 'ブログ', title: '意思決定ガイド', backHome: '← ホーム', tcoGuide: 'TCOガイド' },
  planlar: {
    ...en.planlar,
    kicker: 'プラン',
    title: 'プランと料金',
    ctaPrimary: '無料分析を開始',
    ctaSecondary: '方法論を見る'
  }
};

const zh = {
  ...en,
  announcements: { ...en.announcements, kicker: '公告', title: 'isteBul 公告', backHome: '← 首页', freeAnalysis: '免费分析' },
  campaigns: { ...en.campaigns, kicker: '活动', title: '进行中的活动', backHome: '← 首页', plans: '方案' },
  blog: { ...en.blog, kicker: '博客', title: '决策指南', backHome: '← 首页', tcoGuide: 'TCO 指南' },
  planlar: {
    ...en.planlar,
    kicker: '方案',
    title: '方案与定价',
    ctaPrimary: '开始免费分析',
    ctaSecondary: '了解方法论'
  }
};

export const spaPagesCopy = { tr, en, de, ar, it, fr, es, ja, zh };
