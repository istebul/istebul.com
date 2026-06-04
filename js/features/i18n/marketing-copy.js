/** Marketing + vertical shell copy — merged into translations.js */
import { marketingSections } from './marketing-sections.js';
import { newLocaleOverrides } from './new-locale-overrides.js';
import { pricingDynamicCopy } from './pricing-dynamic-copy.js';
import { spaPagesCopy } from './spa-pages-copy.js';
import { wizardCopy } from './wizard-copy.js';

function deepMerge(target, ...sources) {
  const output = { ...(target || {}) };
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        output[key] = deepMerge(output[key], value);
      } else {
        output[key] = value;
      }
    }
  }
  return output;
}

const baseMarketingCopy = {
  tr: {
    nav: {
      products: 'Ürünler',
      howItWorks: 'Nasıl Çalışır?',
      methodology: 'Metodoloji',
      pricing: 'Fiyatlandırma',
      about: 'Hakkımızda',
      contact: 'İletişim',
      resources: 'Kaynaklar',
      login: 'Giriş Yap',
      partnerApply: 'Partner başvurusu',
      getStarted: 'Hemen Başla',
      sampleAnalysis: 'Örnek analiz',
      blog: 'Blog',
      announcements: 'Duyurular',
      campaigns: 'Kampanyalar',
      dataSources: 'Veri Kaynakları',
      security: 'Güvenlik / KVKK',
      faq: 'SSS',
      catAuto: 'Araba',
      catKonut: 'Konut',
      catTatil: 'Tatil',
      catFinans: 'Finansman',
      catSigorta: 'Sigorta',
      catKasko: 'Kasko',
      allCategories: 'Tüm kategoriler',
      home: 'Ana sayfa',
      productsMenu: 'Ürünler menüsü',
      resourcesMenu: 'Kaynaklar menüsü',
      dashboard: 'Dashboard',
      myAccount: 'Hesabım',
      myOptions: 'Seçeneklerim',
      comparisons: 'Karşılaştırmalar',
      messages: 'Mesajlar',
      logout: 'Oturumu kapat'
    },
    home: {
      heroEyebrow: 'AI destekli karar platformu',
      heroTitle:
        'Büyük kararları verirken <span class="ib-hero-gradient-text">yalnız değilsiniz.</span>',
      heroDesc:
        'Aracınızdan tatilinize, konuttan finansman ve sigortaya kadar — yapay zeka destekli analiz ile en doğru seçimi yapın.',
      ctaAnalyze: 'Kararımı Analiz Et',
      ctaHow: 'Nasıl Çalışır?',
      disclaimer: 'Örnek skor ve maliyetler gösterim amaçlıdır · finansal tavsiye değildir',
      dashTitle: 'AI Öneri Özeti',
      dashScoreLabel: 'Genel uygunluk skoru',
      dashTier: 'Çok İyi',
      totalCost: 'Toplam Maliyet',
      riskLevel: 'Risk Seviyesi',
      suitability: 'Uygunluk',
      trustScore: 'Güven Skoru',
      viewDetails: 'Detayları Gör',
      costDistribution: 'Maliyet dağılımı',
      costTrend: '5 yıllık toplam maliyet projeksiyonu',
      analyzeLink: 'Analiz Et →',
      analyzeAction: 'Analiz et',
      soon: 'Yakında',
      categoriesGridAria: 'Karar kategorileri',
      categoriesSoonAria: 'Yakında açılacak kategoriler'
    },
    features: {
      stripAria: 'Platform özellikleri',
      costTitle: 'Gerçek Toplam Maliyet',
      costDesc: 'Gizli maliyetler dahil gerçekçi analiz',
      aiTitle: 'AI Destekli Analiz',
      aiDesc: 'Gelişmiş yapay zeka algoritmaları ile kişiselleştirilmiş öneriler',
      compareTitle: 'Tarafsız Karşılaştırma',
      compareDesc: 'Bağımsız ve objektif değerlendirme',
      secureTitle: 'Güvenli & Şeffaf',
      secureDesc: 'Verileriniz güvende, sonuçlar şeffaf'
    },
    how: {
      kicker: 'Nasıl çalışır',
      title: 'Nasıl çalışır?',
      step1Title: 'Soruları cevapla',
      step1Desc: 'İhtiyacınızı ve tercihlerinizi birkaç adımda belirtin.',
      step2Title: 'Analiz yapılsın',
      step2Desc: 'AI motoru toplam maliyet, risk ve uygunluk hesaplarını üretir.',
      step3Title: 'En doğru kararı gör',
      step3Desc: 'Skor, maliyet, risk ve AI yorumu tek panelde sunulur.'
    },
    footer: {
      newsletterTitle: 'Karar içgörüleri',
      newsletterDesc: 'Seçilmiş piyasa ve TCO güncellemeleri — yalnızca onayladığınızda.',
      emailPlaceholder: 'E-posta adresiniz',
      subscribe: 'Abone Ol',
      consent: 'Pazarlama e-postası almayı kabul ediyorum.',
      privacyLink: 'Gizlilik politikası',
      disclaimer: 'isteBul karar destek platformudur; nihai karar kullanıcıya aittir.',
      freeAnalysis: 'Ücretsiz analiz başlat',
      cookieText: 'Analitik çerezleri yalnızca ürün deneyimini iyileştirmek için kullanırız; veri satışı yapılmaz.',
      cookiePolicy: 'Çerez politikası',
      cookieDecline: 'Reddet',
      cookieAccept: 'Kabul Et',
      metaData: 'Veri minimizasyonu',
      metaKvkk: 'KVKK & gizlilik politikaları',
      metaSupport: 'Kurumsal destek hattı',
      copyright: 'Tüm hakları saklıdır.',
      stickyCta: 'Karar analizini başlat',
      consentHtml:
        'Pazarlama e-postası almayı kabul ediyorum. <a href="/gizlilik.html" target="_blank" rel="noopener">Gizlilik politikası</a>.',
      cookieHtml:
        'Analitik ve isteğe bağlı oturum kaydı (ör. Microsoft Clarity), GA4 ve Cloudflare ölçümü yalnızca <strong>Kabul Et</strong> sonrası çalışır; veri satışı yapılmaz. <a href="/cerez-politikasi.html">Çerez politikası</a>'
    },
    categories: {
      araba: {
        name: 'Otomobil',
        desc: 'TCO, kredi ve yakıt — tek skorda birleşir.'
      },
      konut: {
        name: 'Konut',
        desc: 'Lokasyon, aidat ve kredi yükü bir arada.'
      },
      tatil: {
        name: 'Tatil',
        desc: 'Bütçe, sezon ve konaklama dengesi.'
      },
      finansman: {
        name: 'Finans',
        desc: 'Vade, faiz ve nakit akışı net görünür.'
      },
      sigorta: {
        name: 'Sigorta',
        desc: 'Koruma, teminat ve prim dengesi — canlı analiz.'
      },
      kasko: {
        name: 'Kasko',
        desc: 'Teminat, prim ve araç profili değerlendirmesi.'
      }
    },
    vertical: {
      konutHeroBadge: 'AI destekli konut karar motoru',
      konutHeroTitle: 'Yapay zekâ destekli konut karar asistanı',
      konutHeroDesc:
        'Bütçe, lokasyon, kredi yükü, aidat, ulaşım, deprem riski ve yaşam beklentilerini birlikte analiz ederek sizin için en doğru konut kararını görün.',
      konutCtaPrimary: 'Konut kararımı analiz et',
      konutCtaSecondary: 'AI önerilerini gör',
      auto: 'Auto',
      tatil: 'Tatil',
      finans: 'Finansman',
      konut: 'Konut'
    }
  },
  en: {
    nav: {
      products: 'Products',
      howItWorks: 'How it works?',
      methodology: 'Methodology',
      pricing: 'Pricing',
      about: 'About us',
      contact: 'Contact',
      resources: 'Resources',
      login: 'Log in',
      partnerApply: 'Partner apply',
      getStarted: 'Get started',
      sampleAnalysis: 'Sample analysis',
      blog: 'Blog',
      announcements: 'Announcements',
      campaigns: 'Campaigns',
      dataSources: 'Data sources',
      security: 'Security / GDPR',
      faq: 'FAQ',
      catAuto: 'Auto',
      catKonut: 'Housing',
      catTatil: 'Travel',
      catFinans: 'Finance',
      catSigorta: 'Insurance',
      catKasko: 'Comprehensive (Soon)',
      allCategories: 'All categories',
      home: 'Home',
      productsMenu: 'Products menu',
      resourcesMenu: 'Resources menu',
      dashboard: 'Dashboard',
      myAccount: 'My account',
      myOptions: 'My options',
      comparisons: 'Comparisons',
      messages: 'Messages',
      logout: 'Log out'
    },
    home: {
      heroEyebrow: 'AI-powered decision platform',
      heroTitle:
        'When making big decisions, <span class="ib-hero-gradient-text">you are not alone.</span>',
      heroDesc:
        'From your car to your vacation, housing to financing — make the right choice with AI-powered analysis.',
      ctaAnalyze: 'Analyze my decision',
      ctaHow: 'How it works?',
      disclaimer: 'Sample scores and costs are illustrative · not financial advice',
      dashTitle: 'AI recommendation summary',
      dashScoreLabel: 'Overall fit score',
      dashTier: 'Very good',
      totalCost: 'Total cost',
      riskLevel: 'Risk level',
      suitability: 'Suitability',
      trustScore: 'Trust score',
      viewDetails: 'View details',
      costDistribution: 'Cost breakdown',
      costTrend: '5-year total cost projection',
      analyzeLink: 'Analyze →',
      analyzeAction: 'Analyze',
      soon: 'Coming soon',
      categoriesGridAria: 'Decision categories',
      categoriesSoonAria: 'Categories launching soon'
    },
    features: {
      stripAria: 'Platform features',
      costTitle: 'True total cost',
      costDesc: 'Realistic analysis including hidden costs',
      aiTitle: 'AI-powered analysis',
      aiDesc: 'Personalized recommendations with advanced AI',
      compareTitle: 'Impartial comparison',
      compareDesc: 'Independent and objective evaluation',
      secureTitle: 'Secure & transparent',
      secureDesc: 'Your data is safe, results are transparent'
    },
    how: {
      kicker: 'How it works',
      title: 'How it works?',
      step1Title: 'Answer questions',
      step1Desc: 'Share your needs and preferences in a few steps.',
      step2Title: 'Get analysis',
      step2Desc: 'The AI engine calculates total cost, risk and fit.',
      step3Title: 'See the best decision',
      step3Desc: 'Score, cost, risk and AI insight in one panel.'
    },
    footer: {
      newsletterTitle: 'Decision insights',
      newsletterDesc: 'Curated market and TCO updates — only when you opt in.',
      emailPlaceholder: 'Your email address',
      subscribe: 'Subscribe',
      consent: 'I agree to receive marketing emails.',
      privacyLink: 'Privacy policy',
      disclaimer: 'isteBul is a decision support platform; the final choice is yours.',
      freeAnalysis: 'Start free analysis',
      cookieText: 'We use analytics cookies only to improve the product; we do not sell data.',
      cookiePolicy: 'Cookie policy',
      cookieDecline: 'Decline',
      cookieAccept: 'Accept',
      metaData: 'Data minimization',
      metaKvkk: 'GDPR & privacy policies',
      metaSupport: 'Enterprise support line',
      copyright: 'All rights reserved.',
      stickyCta: 'Start decision analysis',
      consentHtml:
        'I agree to receive marketing emails. <a href="/gizlilik.html" target="_blank" rel="noopener">Privacy policy</a>.',
      cookieHtml:
        'Analytics and optional session replay (e.g. Microsoft Clarity), GA4, and Cloudflare measurement load only after <strong>Accept</strong>; we do not sell data. <a href="/cerez-politikasi.html">Cookie policy</a>'
    },
    categories: {
      araba: {
        name: 'Automobile',
        desc: 'TCO, loan and fuel — in one score.'
      },
      konut: {
        name: 'Housing',
        desc: 'Location, fees and mortgage load together.'
      },
      tatil: {
        name: 'Travel',
        desc: 'Budget, season and stay balance.'
      },
      finansman: {
        name: 'Finance',
        desc: 'Term, rate and cash flow made clear.'
      },
      sigorta: {
        name: 'Insurance',
        desc: 'Policy coverage and premium balance.'
      },
      kasko: {
        name: 'Comprehensive',
        desc: 'Coverage, premium and vehicle profile.'
      }
    },
    vertical: {
      konutHeroBadge: 'AI-powered housing decision engine',
      konutHeroTitle: 'AI housing decision assistant',
      konutHeroDesc:
        'Analyze budget, location, mortgage load, fees, transport, earthquake risk and lifestyle expectations to find your best housing decision.',
      konutCtaPrimary: 'Analyze my housing decision',
      konutCtaSecondary: 'See AI recommendations',
      auto: 'Auto',
      tatil: 'Travel',
      finans: 'Finance',
      konut: 'Housing'
    }
  },
  de: {
    nav: {
      products: 'Produkte',
      howItWorks: 'So funktioniert es',
      methodology: 'Methodik',
      pricing: 'Preise',
      about: 'Über uns',
      contact: 'Kontakt',
      resources: 'Ressourcen',
      login: 'Anmelden',
      partnerApply: 'Partner werden',
      getStarted: 'Jetzt starten',
      sampleAnalysis: 'Beispielanalyse',
      blog: 'Blog',
      announcements: 'Ankündigungen',
      campaigns: 'Kampagnen',
      dataSources: 'Datenquellen',
      security: 'Sicherheit / DSGVO',
      faq: 'FAQ',
      catAuto: 'Auto',
      catKonut: 'Immobilie',
      catTatil: 'Reise',
      catFinans: 'Finanzierung',
      catSigorta: 'Versicherung',
      catKasko: 'Kasko (Bald)',
      allCategories: 'Alle Kategorien',
      home: 'Startseite',
      productsMenu: 'Produkte-Menü',
      resourcesMenu: 'Ressourcen-Menü',
      dashboard: 'Dashboard',
      myAccount: 'Mein Konto',
      myOptions: 'Meine Optionen',
      comparisons: 'Vergleiche',
      messages: 'Nachrichten',
      logout: 'Abmelden'
    },
    home: {
      heroEyebrow: 'KI-gestützte Entscheidungsplattform',
      heroTitle:
        'Bei großen Entscheidungen <span class="ib-hero-gradient-text">sind Sie nicht allein.</span>',
      heroDesc:
        'Vom Auto bis zur Reise, Immobilie und Finanzierung — treffen Sie die richtige Wahl mit KI-Analyse.',
      ctaAnalyze: 'Meine Entscheidung analysieren',
      ctaHow: 'So funktioniert es',
      disclaimer: 'Beispielwerte dienen der Illustration · keine Finanzberatung',
      dashTitle: 'KI-Empfehlungsübersicht',
      dashScoreLabel: 'Gesamt-Eignungsscore',
      dashTier: 'Sehr gut',
      totalCost: 'Gesamtkosten',
      riskLevel: 'Risikoniveau',
      suitability: 'Eignung',
      trustScore: 'Vertrauensscore',
      viewDetails: 'Details ansehen',
      costDistribution: 'Kostenverteilung',
      costTrend: '5-Jahres-Gesamtkostenprognose',
      analyzeLink: 'Analysieren →',
      analyzeAction: 'Analysieren',
      soon: 'Demnächst',
      categoriesGridAria: 'Entscheidungskategorien',
      categoriesSoonAria: 'Demnächst verfügbare Kategorien'
    },
    features: {
      stripAria: 'Plattformfunktionen',
      costTitle: 'Echte Gesamtkosten',
      costDesc: 'Realistische Analyse inkl. versteckter Kosten',
      aiTitle: 'KI-gestützte Analyse',
      aiDesc: 'Personalisierte Empfehlungen mit fortschrittlicher KI',
      compareTitle: 'Unabhängiger Vergleich',
      compareDesc: 'Objektive und neutrale Bewertung',
      secureTitle: 'Sicher & transparent',
      secureDesc: 'Ihre Daten sind sicher, Ergebnisse transparent'
    },
    how: {
      kicker: 'So funktioniert es',
      title: 'So funktioniert es?',
      step1Title: 'Fragen beantworten',
      step1Desc: 'Geben Sie Bedürfnisse und Präferenzen in wenigen Schritten an.',
      step2Title: 'Analyse erhalten',
      step2Desc: 'Die KI berechnet Gesamtkosten, Risiko und Eignung.',
      step3Title: 'Beste Entscheidung sehen',
      step3Desc: 'Score, Kosten, Risiko und KI-Erklärung in einem Panel.'
    },
    footer: {
      newsletterTitle: 'Entscheidungseinblicke',
      newsletterDesc: 'Ausgewählte Markt- und TCO-Updates — nur mit Ihrer Zustimmung.',
      emailPlaceholder: 'Ihre E-Mail-Adresse',
      subscribe: 'Abonnieren',
      consent: 'Ich stimme Marketing-E-Mails zu.',
      privacyLink: 'Datenschutz',
      cookieText: 'Analyse-Cookies nur zur Produktverbesserung; kein Datenverkauf.',
      cookiePolicy: 'Cookie-Richtlinie',
      cookieDecline: 'Ablehnen',
      cookieAccept: 'Akzeptieren',
      metaData: 'Datenminimierung',
      metaKvkk: 'DSGVO & Datenschutz',
      metaSupport: 'Enterprise-Support',
      copyright: 'Alle Rechte vorbehalten.',
      stickyCta: 'Entscheidungsanalyse starten',
      consentHtml:
        'Ich stimme Marketing-E-Mails zu. <a href="/gizlilik.html" target="_blank" rel="noopener">Datenschutzrichtlinie</a>.',
      cookieHtml:
        'Analyse und optionale Sitzungsaufzeichnung (z. B. Microsoft Clarity), GA4 und Cloudflare nur nach <strong>Akzeptieren</strong>; kein Datenverkauf. <a href="/cerez-politikasi.html">Cookie-Richtlinie</a>'
    },
    categories: {
      araba: { name: 'Automobil', desc: 'TCO, Kredit und Kraftstoff — ein Score.' },
      konut: { name: 'Immobilie', desc: 'Lage, Nebenkosten und Kreditlast zusammen.' },
      tatil: { name: 'Reise', desc: 'Budget, Saison und Unterkunft im Gleichgewicht.' },
      finansman: { name: 'Finanzierung', desc: 'Laufzeit, Zins und Cashflow klar sehen.' },
      sigorta: { name: 'Versicherung', desc: 'Deckung und Prämienbalance analysieren.' },
      kasko: { name: 'Kasko', desc: 'Deckung, Prämie und Fahrzeugprofil bewerten.' }
    },
    vertical: {
      konutHeroBadge: 'KI-gestützter Immobilien-Entscheidungsmotor',
      konutHeroTitle: 'KI-Immobilien-Entscheidungsassistent',
      konutHeroDesc:
        'Analysieren Sie Budget, Lage, Kreditlast, Nebenkosten, Verkehr und Risiko für die beste Immobilienentscheidung.',
      konutCtaPrimary: 'Immobilienentscheidung analysieren',
      konutCtaSecondary: 'KI-Empfehlungen ansehen',
      auto: 'Auto',
      tatil: 'Reise',
      finans: 'Finanzierung',
      konut: 'Immobilie'
    }
  },
  ar: {
    nav: {
      products: 'المنتجات',
      howItWorks: 'كيف يعمل؟',
      methodology: 'المنهجية',
      pricing: 'الأسعار',
      about: 'من نحن',
      contact: 'اتصل بنا',
      resources: 'الموارد',
      login: 'تسجيل الدخول',
      partnerApply: 'طلب الشراكة',
      getStarted: 'ابدأ الآن',
      sampleAnalysis: 'تحليل نموذجي',
      blog: 'المدونة',
      announcements: 'الإعلانات',
      campaigns: 'الحملات',
      dataSources: 'مصادر البيانات',
      security: 'الأمان / GDPR',
      faq: 'الأسئلة الشائعة',
      catAuto: 'السيارات',
      catKonut: 'السكن',
      catTatil: 'السفر',
      catFinans: 'التمويل',
      catSigorta: 'التأمين',
      catKasko: 'تأمين شامل (قريباً)',
      allCategories: 'جميع الفئات',
      home: 'الرئيسية',
      productsMenu: 'قائمة المنتجات',
      resourcesMenu: 'قائمة الموارد',
      dashboard: 'لوحة التحكم',
      myAccount: 'حسابي',
      myOptions: 'خياراتي',
      comparisons: 'المقارنات',
      messages: 'الرسائل',
      logout: 'تسجيل الخروج'
    },
    home: {
      heroEyebrow: 'منصة قرارات مدعومة بالذكاء الاصطناعي',
      heroTitle:
        'عند اتخاذ قرارات كبيرة <span class="ib-hero-gradient-text">لست وحدك.</span>',
      heroDesc:
        'من سيارتك إلى إجازتك، السكن والتمويل — اتخذ القرار الأفضل بتحليل مدعوم بالذكاء الاصطناعي.',
      ctaAnalyze: 'حلّل قراري',
      ctaHow: 'كيف يعمل؟',
      disclaimer: 'الدرجات والتكاليف النموذجية للعرض فقط · ليست نصيحة مالية',
      dashTitle: 'ملخص توصيات الذكاء الاصطناعي',
      dashScoreLabel: 'درجة الملاءمة العامة',
      dashTier: 'جيد جداً',
      totalCost: 'التكلفة الإجمالية',
      riskLevel: 'مستوى المخاطر',
      suitability: 'الملاءمة',
      trustScore: 'درجة الثقة',
      viewDetails: 'عرض التفاصيل',
      costDistribution: 'توزيع التكلفة',
      costTrend: 'توقعات التكلفة لـ 5 سنوات',
      analyzeLink: 'تحليل ←',
      analyzeAction: 'تحليل',
      soon: 'قريباً',
      categoriesGridAria: 'فئات القرار',
      categoriesSoonAria: 'فئات قادمة قريباً'
    },
    features: {
      stripAria: 'ميزات المنصة',
      costTitle: 'التكلفة الإجمالية الحقيقية',
      costDesc: 'تحليل واقعي يشمل التكاليف الخفية',
      aiTitle: 'تحليل بالذكاء الاصطناعي',
      aiDesc: 'توصيات مخصصة بخوارزميات متقدمة',
      compareTitle: 'مقارنة محايدة',
      compareDesc: 'تقييم مستقل وموضوعي',
      secureTitle: 'آمن وشفاف',
      secureDesc: 'بياناتك آمنة والنتائج شفافة'
    },
    how: {
      kicker: 'كيف يعمل',
      title: 'كيف يعمل؟',
      step1Title: 'أجب على الأسئلة',
      step1Desc: 'حدّد احتياجاتك وتفضيلاتك في خطوات قليلة.',
      step2Title: 'احصل على التحليل',
      step2Desc: 'يحسب المحرك التكلفة والمخاطر والملاءمة.',
      step3Title: 'شاهد أفضل قرار',
      step3Desc: 'الدرجة والتكلفة والمخاطر ورؤية الذكاء الاصطناعي في لوحة واحدة.'
    },
    footer: {
      newsletterTitle: 'رؤى القرار',
      newsletterDesc: 'تحديثات السوق وTCO المختارة — فقط بموافقتك.',
      emailPlaceholder: 'بريدك الإلكتروني',
      subscribe: 'اشتراك',
      consent: 'أوافق على رسائل التسويق.',
      privacyLink: 'سياسة الخصوصية',
      disclaimer: 'isteBul منصة دعم قرارات؛ القرار النهائي لك.',
      freeAnalysis: 'ابدأ تحليلاً مجانياً',
      cookieText: 'نستخدم ملفات التحليل لتحسين المنتج فقط؛ لا نبيع البيانات.',
      cookiePolicy: 'سياسة ملفات الارتباط',
      cookieDecline: 'رفض',
      cookieAccept: 'قبول',
      metaData: 'تقليل البيانات',
      metaKvkk: 'GDPR وسياسات الخصوصية',
      metaSupport: 'خط دعم المؤسسات',
      copyright: 'جميع الحقوق محفوظة.',
      stickyCta: 'ابدأ تحليل القرار',
      consentHtml:
        'أوافق على تلقي رسائل تسويقية. <a href="/gizlilik.html" target="_blank" rel="noopener">سياسة الخصوصية</a>.',
      cookieHtml:
        'نستخدم ملفات تعريف الارتباط التحليلية لتحسين المنتج فقط؛ لا نبيع البيانات. <a href="/cerez-politikasi.html">سياسة ملفات تعريف الارتباط</a>'
    },
    categories: {
      araba: { name: 'السيارات', desc: 'TCO والقرض والوقود — في درجة واحدة.' },
      konut: { name: 'السكن', desc: 'الموقع والرسوم وعبء القرض معاً.' },
      tatil: { name: 'السفر', desc: 'توازن الميزانية والموسم والإقامة.' },
      finansman: { name: 'التمويل', desc: 'المدة والفائدة والتدفق النقدي بوضوح.' },
      sigorta: { name: 'التأمين', desc: 'تحليل التغطية وتوازن القسط.' },
      kasko: { name: 'تأمين شامل', desc: 'التغطية والقسط وملف المركبة.' }
    },
    vertical: {
      konutHeroBadge: 'محرك قرارات السكن بالذكاء الاصطناعي',
      konutHeroTitle: 'مساعد قرارات السكن بالذكاء الاصطناعي',
      konutHeroDesc:
        'حلّل الميزانية والموقع وعبء القرض والرسوم والنقل ومخاطر الزلازل لتجد أفضل قرار سكن.',
      konutCtaPrimary: 'حلّل قرار السكن',
      konutCtaSecondary: 'عرض توصيات الذكاء الاصطناعي',
      auto: 'السيارات',
      tatil: 'السفر',
      finans: 'التمويل',
      konut: 'السكن'
    }
  }
};

const CLONED_LOCALE_IDS = ['it', 'fr', 'es', 'ja', 'zh'];
const SECTION_LOCALE_IDS = ['tr', 'en', 'de', 'ar', ...CLONED_LOCALE_IDS];

export const marketingCopy = Object.fromEntries(
  SECTION_LOCALE_IDS.map((localeId) => {
    if (CLONED_LOCALE_IDS.includes(localeId)) {
      return [
        localeId,
        deepMerge(
          baseMarketingCopy.en,
          newLocaleOverrides[localeId],
          marketingSections[localeId],
          { pricingDynamic: pricingDynamicCopy.en },
          { spaPages: spaPagesCopy[localeId] || spaPagesCopy.en },
          { wizard: wizardCopy.en }
        )
      ];
    }
    return [
      localeId,
      deepMerge(
        baseMarketingCopy[localeId],
        marketingSections[localeId],
        { pricingDynamic: pricingDynamicCopy[localeId] || pricingDynamicCopy.en },
        { spaPages: spaPagesCopy[localeId] || spaPagesCopy.en },
        { wizard: wizardCopy[localeId] || wizardCopy.en }
      )
    ];
  })
);
