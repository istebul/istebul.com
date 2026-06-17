/** Dynamic pricing cards, ROI calculator, reassurance — merged into marketing-copy.js */
const tr = {
  popularBadge: 'En popüler',
  subhead:
    'Bakım, yakıt, kredi, sigorta ve değer kaybı birlikte düşünülmezse “ucuz araç” pahalıya çıkar. isteBul karar altyapısı: ücretsiz temel analiz; Pro ile senaryo karşılaştırma ve gelişmiş AI açıklaması.',
  roiTitle: 'Karar maliyeti hesabı',
  roiLead:
    'Bütçeniz ve makul bir TCO sapması varsayımıyla Pro maliyetini yanlış seçim riskiyle kıyaslayın.',
  roiDisclaimer:
    'Örnek senaryo; gerçek TCO sapması bütçe, kullanım ve piyasa koşullarına göre değişir. Getiri veya tasarruf garantisi verilmez.',
  budgetLabel: 'Araç bütçesi (örnek)',
  driftLabel: 'TCO sapması varsayımı',
  driftCostLabel: 'Örnek sapma maliyeti',
  proYearlyLabel: 'Pro (yıllık, seçili dönem)',
  proMonthlyApprox: '≈ {amount} / ay',
  roiSummaryNear:
    'Örnek senaryoda {driftCost} TCO sapması, yıllık Pro maliyetine ({proYearlyCost}) yakın — tek net karar döngüsünde bile maliyet görünürlüğü anlamlı olabilir.',
  roiSummaryExceeds:
    'Örnek senaryoda {driftCost} TCO sapması, yıllık Pro ({proYearlyCost}) maliyetini {multiple} karşılar — abonelik değil, yanlış seçim maliyetini küçültme çerçevesi.',
  roiSummaryMultiple: 'birden fazla kez',
  annualSavings:
    'Yıllık faturalama: 12× aylık listeye göre {amount} daha az ({percent}% — listelenen fiyatlar).',
  reassuranceAria: 'Ödeme ve iptal güvencesi',
  paymentTitle: 'Ödeme durumu',
  paymentDesc:
    'Ödeme altyapısı hazırlandı. Sağlayıcı aktivasyonu tamamlandığında ödeme alınabilecektir; kart bilgileri sunucularımızda tutulmaz.',
  cancelTitle: 'İptal',
  cancelDescHtml:
    'Pro abonelik iptali için <a href="mailto:info@istebul.com?subject=Pro%20Abonelik%20%C4%B0ptali">info@istebul.com</a> veya <a href="/iletisim.html?konu=abonelik">destek</a> kanalını kullanın. E-posta pazarlama çıkışı: <a href="/abonelik-iptal.html">e-posta tercihleri</a>.',
  trialTitle: 'Pro erken erişim',
  trialDesc:
    'Pro özellikleri pilot erişim sürecindedir. Ödeme sağlayıcı aktivasyonu tamamlandığında bilgilendirme yapılır.',
  billingToggleAria: 'Faturalama dönemi',
  plansAria: 'Plan seçenekleri',
  badgeIndividual: 'Bireysel',
  badgeEnterprise: 'Kurumsal',
  freeName: 'Başlangıç',
  freePrice: 'Ücretsiz',
  freeDesc: 'Temel analiz — TCO özeti ve önizleme; üyelik zorunlu değil',
  freeCta: 'Ön değerlendirmeye başla',
  proName: 'isteBul Pro',
  proDesc: 'Detaylı TCO, senaryo karşılaştırma, gelişmiş AI açıklama ve premium rapor',
  proSecondaryCta: 'Önce ön değerlendirmeye başla',
  proPriceHint: 'Pilot erişim · aktivasyon sonrası bilgilendirme',
  trialHint: ' · Ödeme aktivasyonu sonrası',
  savingsFact: '12 aylık aylık ödemeye göre {amount} daha az (listelenen fiyat)',
  billingMonthly: 'Aylık',
  billingAnnual: 'Yıllık',
  billingAnnualSavings: '12 aylık ödemeye göre daha az',
  billingAnnualEquiv: ' · 12 ay {twelveMonthly} yerine {annual}',
  enterpriseName: 'Enterprise',
  enterprisePrice: 'Özel teklif',
  enterpriseDesc: 'Sıcak lead, CRM, webhook/API ve pilot partner operasyonları',
  enterpriseCta: 'Kurumsal teklif al',
  trustTrial: 'Pro pilot erişim',
  trustPayment: 'Ödeme aktivasyonu sonrası',
  trustCancel: 'Destek kanalından iptal',
  trustDisclaimer: 'Skorlar bilgilendirme amaçlıdır',
  trustNoteHtml:
    'Analiz ve uyum skorları metodolojik destek sunar; kesin sonuç veya getiri taahhüdü değildir. <a href="/kvkk.html">KVKK</a> · <a href="/gizlilik.html">Gizlilik</a> · <a href="/metodoloji">Metodoloji</a>',
  complianceHtml:
    'Skorlar bilgilendirme amaçlıdır; kesin sonuç veya getiri taahhüdü değildir. <a href="/kvkk.html">KVKK</a> · <a href="/gizlilik.html">Gizlilik</a> · <a href="/metodoloji">Metodoloji</a>',
  freeHighlights: [
    'Temel TCO ve uyum skoru',
    '2 araç karşılaştırma',
    'Karar önizlemesi',
    'Saatlik AI gerekçe kotası'
  ],
  proHighlights: [
    'Sınırsız karşılaştırma',
    'Premium karar raporu',
    'Derin TCO kırılımı',
    'AI karar özeti (skoru değiştirmez)',
    'Finans partner eşleşmesi',
    'Öncelikli destek ve müzakere içgörüleri',
    'Premium export / raporlama'
  ],
  enterpriseHighlights: [
    'Skorlu sıcak lead',
    'CRM ve webhook/API',
    'Pilot çalışma ve SLA',
    'Özel metodoloji',
    'Kurumsal destek'
  ]
};

const en = {
  popularBadge: 'Most popular',
  subhead:
    'Without maintenance, fuel, loan, insurance and depreciation together, a “cheap car” gets expensive. isteBul: free baseline analysis; Pro adds scenario comparison and advanced AI explanation.',
  roiTitle: 'Decision cost calculator',
  roiLead: 'Compare Pro cost to wrong-choice risk using your budget and a reasonable TCO drift assumption.',
  roiDisclaimer:
    'Illustrative scenario; actual TCO drift varies by budget, usage and market. No return or savings guarantee.',
  budgetLabel: 'Vehicle budget (example)',
  driftLabel: 'TCO drift assumption',
  driftCostLabel: 'Example drift cost',
  proYearlyLabel: 'Pro (yearly, selected period)',
  proMonthlyApprox: '≈ {amount} / mo',
  roiSummaryNear:
    'In this example, {driftCost} TCO drift is close to annual Pro cost ({proYearlyCost}) — visibility alone can matter in one clear decision cycle.',
  roiSummaryExceeds:
    'In this example, {driftCost} TCO drift covers annual Pro ({proYearlyCost}) {multiple} — framing wrong-choice cost, not the subscription.',
  roiSummaryMultiple: 'multiple times',
  annualSavings:
    'Annual billing: {amount} less vs 12× monthly list ({percent}% — listed prices).',
  reassuranceAria: 'Payment and cancellation assurance',
  paymentTitle: 'iyzico · PayTR',
  paymentDesc:
    'Payments via iyzico (primary) and PayTR (fallback); card data is not stored on our servers.',
  cancelTitle: 'Cancel',
  cancelDescHtml:
    'Cancel anytime from your account or via support. <a href="/abonelik-iptal.html">Cancellation guide</a>',
  trialTitle: 'Pro checkout',
  trialDesc:
    'When payment providers are active, Pro subscriptions and premium reports checkout through iyzico / PayTR.',
  billingToggleAria: 'Billing period',
  plansAria: 'Plan options',
  badgeIndividual: 'Individual',
  badgeEnterprise: 'Enterprise',
  freeName: 'Starter',
  freePrice: 'Free',
  freeDesc: 'Basic analysis — TCO summary and preview; no account required',
  freeCta: 'Start TCO analysis',
  proName: 'isteBul Pro',
  proDesc: 'Detailed TCO, scenario comparison, advanced AI explanation and premium report',
  proSecondaryCta: 'Try free TCO analysis first',
  proPriceHint: 'iyzico / PayTR · cancel anytime',
  trialHint: ' · Turkey payment rails',
  savingsFact: '{amount} less vs 12 monthly payments (listed price)',
  billingMonthly: 'Monthly',
  billingAnnual: 'Annual',
  billingAnnualSavings: 'Less vs 12 monthly payments',
  billingAnnualEquiv: ' · {annual} instead of {twelveMonthly} over 12 months',
  enterpriseName: 'Enterprise',
  enterprisePrice: 'Custom quote',
  enterpriseDesc: 'Qualified leads, CRM, webhook/API and pilot partner operations',
  enterpriseCta: 'Request enterprise quote',
  trustTrial: 'Turkey payment infrastructure (iyzico / PayTR)',
  trustPayment: 'Secure iyzico / PayTR checkout',
  trustCancel: 'Cancel from dashboard — no lock-in',
  trustDisclaimer: 'Scores are informational',
  trustNoteHtml:
    'Analysis and fit scores provide methodological support; not guaranteed outcomes or returns. <a href="/kvkk.html">Privacy</a> · <a href="/gizlilik.html">Privacy policy</a> · <a href="/metodoloji">Methodology</a>',
  complianceHtml:
    'Scores are informational; not guaranteed outcomes or returns. <a href="/kvkk.html">Privacy</a> · <a href="/gizlilik.html">Privacy policy</a> · <a href="/metodoloji">Methodology</a>',
  freeHighlights: [
    'Basic TCO and fit score',
    '2 vehicle comparisons',
    'Decision preview',
    'Hourly AI rationale quota'
  ],
  proHighlights: [
    'Unlimited comparisons',
    'Premium decision report',
    'Deep TCO breakdown',
    'AI decision summary (does not change score)',
    'Finance partner matching',
    'Priority support and negotiation insights',
    'Premium export / reporting'
  ],
  enterpriseHighlights: [
    'Scored qualified leads',
    'CRM and webhook/API',
    'Pilot rollout and SLA',
    'Custom methodology',
    'Enterprise support'
  ]
};

const de = {
  ...en,
  popularBadge: 'Am beliebtesten',
  subhead:
    'Ohne Wartung, Kraftstoff, Kredit, Versicherung und Wertverlust zusammen wird ein „günstiges Auto“ teuer. isteBul: kostenlose Basisanalyse; Pro mit Szenariovergleich und erweiterter KI-Erklärung.',
  roiTitle: 'Entscheidungskosten-Rechner',
  roiLead:
    'Vergleichen Sie Pro-Kosten mit dem Risiko falscher Wahl anhand Ihres Budgets und einer plausiblen TCO-Abweichung.',
  roiDisclaimer:
    'Beispielszenario; echte TCO-Abweichung variiert. Keine Rendite- oder Spar-Garantie.',
  budgetLabel: 'Fahrzeugbudget (Beispiel)',
  driftLabel: 'TCO-Abweichungsannahme',
  driftCostLabel: 'Beispiel-Abweichungskosten',
  proYearlyLabel: 'Pro (jährlich, gewählter Zeitraum)',
  proMonthlyApprox: '≈ {amount} / Monat',
  reassuranceAria: 'Zahlungs- und Kündigungssicherheit',
  cancelTitle: 'Kündigung',
  cancelDescHtml:
    'Kündigung jederzeit im Konto oder über den Support. <a href="/abonelik-iptal.html">Kündigungsleitfaden</a>',
  paymentTitle: 'iyzico · PayTR',
  paymentDesc: 'Zahlung über iyzico (primär) und PayTR (Fallback); keine Kartenspeicherung bei uns.',
  trustPayment: 'Sichere Zahlung via iyzico / PayTR',
  trialTitle: 'Testphase',
  billingToggleAria: 'Abrechnungszeitraum',
  plansAria: 'Planoptionen',
  badgeIndividual: 'Einzelperson',
  badgeEnterprise: 'Unternehmen',
  freeName: 'Starter',
  freePrice: 'Kostenlos',
  freeCta: 'TCO-Analyse starten',
  proSecondaryCta: 'Zuerst kostenlose TCO-Analyse',
  enterprisePrice: 'Individuelles Angebot',
  enterpriseCta: 'Enterprise-Angebot anfragen',
  trustCancel: 'Im Dashboard kündigen — ohne Bindung',
  trustDisclaimer: 'Scores sind informativ'
};

const ar = {
  ...en,
  popularBadge: 'الأكثر شيوعًا',
  roiTitle: 'حاسبة تكلفة القرار',
  roiLead: 'قارن تكلفة Pro مع مخاطر الخيار الخاطئ باستخدام ميزانيتك وافتراض انحراف TCO معقول.',
  budgetLabel: 'ميزانية السيارة (مثال)',
  driftLabel: 'افتراض انحراف TCO',
  driftCostLabel: 'تكلفة الانحراف (مثال)',
  proYearlyLabel: 'Pro (سنوي، الفترة المختارة)',
  proMonthlyApprox: '≈ {amount} / شهر',
  reassuranceAria: 'ضمان الدفع والإلغاء',
  paymentTitle: 'iyzico · PayTR',
  paymentDesc: 'الدفع عبر iyzico (أساسي) وPayTR (احتياطي)؛ لا نخزّن بيانات البطاقة على خوادمنا.',
  cancelTitle: 'إلغاء',
  trialTitle: 'تجربة',
  billingToggleAria: 'فترة الفوترة',
  plansAria: 'خيارات الخطة',
  badgeIndividual: 'فردي',
  badgeEnterprise: 'مؤسسي',
  freeName: 'البداية',
  freePrice: 'مجاني',
  freeCta: 'ابدأ تحليل TCO',
  proSecondaryCta: 'جرّب تحليل TCO المجاني أولًا',
  enterprisePrice: 'عرض مخصص',
  enterpriseCta: 'اطلب عرضًا مؤسسيًا',
  trustPayment: 'دفع آمن عبر iyzico / PayTR',
  trustCancel: 'إلغاء من لوحة التحكم — بدون التزام',
  trustDisclaimer: 'الدرجات للمعلومات فقط'
};

export const pricingDynamicCopy = { tr, en, de, ar };
