/** Vertical wizard UI copy — merged into locale bundles via marketing-copy.js */

export const wizardCopy = {
  tr: {
    common: {
      unspecified: 'Belirtilmedi',
      back: 'Geri',
      continue: 'Devam et →',
      showResults: 'Sonuçları gör',
      resultsDisclaimer:
        'Tahmini skor ve maliyet aralıkları bilgilendirme amaçlıdır; kesin teklif taahhüdü değildir.',
      topPick: 'Öne çıkan',
      estimated: 'Tahmini',
      suitability: 'Uygunluk',
      whyRecommended: 'Neden önerildi?',
      pros: 'Artılar',
      cautions: 'Dikkat',
      selected: '✓ Seçildi',
      selectOption: 'Bu seçeneği seç',
      pickHint: 'Devam etmek için bir senaryo seçin.',
      yourPick: 'Seçiminiz',
      confirmSelection: 'Seçimi onayla ve devam et',
      changeSelection: '← Seçimi değiştir',
      confirmedScenario: 'Onayladığınız senaryo',
      contactOptional: 'İletişim (isteğe bağlı)',
      namePlaceholder: 'Ad soyad',
      phonePlaceholder: 'Telefon',
      emailPlaceholder: 'E-posta',
      sendRequest: 'Talebi gönder',
      resultsKicker: 'Karar analizi tamamlandı',
      resultsTitle: 'Kişiselleştirilmiş öneriler',
      nextStepDefault: 'Bir senaryo seçin ve iletişim adımına geçin.',
      manualBudgetLabel: 'Toplam bütçe hedefi',
      manualBudgetPlaceholder: 'Örn: 5.500.000 ₺',
      fixedCostsHint: 'Sabit gider beklentileri (en az 1)'
    },
    konut: {
      resultsTitle: 'Konut karar önerileri',
      steps: {
        profile: { label: 'Profil', title: 'Konut kararınızın amacı nedir?', subtitle: 'Oturum, kiralama veya yatırım hedefine göre maliyet ve risk modeli uyarlanır.' },
        budget: { label: 'Bütçe', title: 'Bütçe ve ödeme kapasiteniz', subtitle: 'Peşinat, aylık ödeme limiti ve toplam bütçe çerçevesi.' },
        property: { label: 'Konut tipi', title: 'Hangi konut tipini değerlendiriyorsunuz?', subtitle: 'Tip; aidat, bakım ve finansman yapısını etkiler.' },
        location: { label: 'Lokasyon', title: 'Lokasyon tercihiniz', subtitle: 'Bölge; ulaşım, likidite ve risk skoruna yansır.' },
        financing: { label: 'Finansman', title: 'Kredi ve sabit giderler', subtitle: 'İpotek ihtiyacı ile aidat, vergi ve bakım yükü birlikte değerlendirilir.' },
        risks: { label: 'Riskler', title: 'Öncelikli risk alanlarınız', subtitle: 'En fazla 5 risk faktörü seçebilirsiniz.' }
      }
    },
    finans: {
      resultsTitle: 'Finansman senaryoları',
      steps: {
        purpose: { label: 'Amaç', title: 'Finansman amacınız nedir?', subtitle: 'Kredi yapısı seçtiğiniz varlık bağlamına göre modellenir.' },
        amount: { label: 'Tutar', title: 'İhtiyaç duyduğunuz tutar', subtitle: 'Çekilecek kredi veya finansman tutarı.' },
        term: { label: 'Vade', title: 'Tercih ettiğiniz vade', subtitle: 'Vade uzadıkça aylık ödeme düşer, toplam maliyet artabilir.' },
        capacity: { label: 'Kapasite', title: 'Aylık ödeme kapasiteniz', subtitle: 'Net nakit akışınıza göre sürdürülebilir taksit bandı.' },
        cashflow: { label: 'Nakit akışı', title: 'Gelir, gider ve mevcut borç profili', subtitle: 'Aylık gelir/gider dengesi borçlanma skorunu belirler.' },
        sensitivity: { label: 'Hassasiyet', title: 'Vade tercihi, faiz hassasiyeti ve risk seviyesi', subtitle: 'Son adım — borçlanma skoru ve alternatif senaryolar üretilir.' }
      }
    },
    tatil: {
      steps: {
        goal: { label: 'Tatil tipi', title: 'Nasıl bir tatil deneyimi arıyorsunuz?', subtitle: 'Seçiminize göre deneyim kalitesi, maliyet ve risk modeli uyarlanır.' },
        people: { label: 'Kişi', title: 'Kimlerle seyahat edeceksiniz?', subtitle: 'Grup yapınıza göre konaklama ve ulaşım önerileri özelleştirilir.' },
        budget: { label: 'Bütçe', title: 'Bütçe modelinizi seçin', subtitle: 'Toplam maliyet, kişi başı maliyet ve gizli giderler bu modelle hesaplanır.' },
        date: { label: 'Tarih', title: 'Seyahat tarihlerini planlayın', subtitle: 'Yoğun sezon, hava ve fiyat avantajı analizi tarih verisiyle hesaplanır.' },
        preferences: { label: 'Tercihler', title: 'Ulaşım ve konfor beklentiniz', subtitle: 'Transfer, uçuş ve konaklama konforu skoru etkiler.' },
        expectations: { label: 'Beklentiler', title: 'Önceliklerinizi işaretleyin', subtitle: 'AI skoru için en fazla 5 beklenti seçebilirsiniz.' },
        note: { label: 'Profil notu', title: 'Ek not eklemek ister misiniz?', subtitle: 'Sağlık, tempo, özel ihtiyaç veya rota beklentinizi ekleyebilirsiniz.' }
      }
    }
  },
  en: {
    common: {
      unspecified: 'Not specified',
      back: 'Back',
      continue: 'Continue →',
      showResults: 'See results',
      resultsDisclaimer:
        'Estimated scores and cost ranges are for information only; not a binding offer.',
      topPick: 'Top pick',
      estimated: 'Estimated',
      suitability: 'Fit',
      whyRecommended: 'Why recommended?',
      pros: 'Pros',
      cautions: 'Cautions',
      selected: '✓ Selected',
      selectOption: 'Select this option',
      pickHint: 'Select a scenario to continue.',
      yourPick: 'Your selection',
      confirmSelection: 'Confirm and continue',
      changeSelection: '← Change selection',
      confirmedScenario: 'Confirmed scenario',
      contactOptional: 'Contact (optional)',
      namePlaceholder: 'Full name',
      phonePlaceholder: 'Phone',
      emailPlaceholder: 'Email',
      sendRequest: 'Send request',
      resultsKicker: 'Decision analysis complete',
      resultsTitle: 'Personalized recommendations',
      nextStepDefault: 'Pick a scenario and continue to contact.',
      manualBudgetLabel: 'Total budget target',
      manualBudgetPlaceholder: 'e.g. ₺5,500,000',
      fixedCostsHint: 'Fixed cost expectations (at least 1)'
    },
    konut: {
      resultsTitle: 'Housing decision recommendations',
      steps: {
        profile: { label: 'Profile', title: 'What is your housing goal?', subtitle: 'Cost and risk models adapt to live-in, rent, or investment intent.' },
        budget: { label: 'Budget', title: 'Budget and payment capacity', subtitle: 'Down payment, monthly limit, and total budget range.' },
        property: { label: 'Property type', title: 'Which property type are you considering?', subtitle: 'Type affects fees, maintenance, and financing structure.' },
        location: { label: 'Location', title: 'Location preference', subtitle: 'Area affects commute, liquidity, and risk score.' },
        financing: { label: 'Financing', title: 'Mortgage and fixed costs', subtitle: 'Mortgage need plus fees, tax, and maintenance load together.' },
        risks: { label: 'Risks', title: 'Priority risk areas', subtitle: 'Select up to 5 risk factors.' }
      }
    },
    finans: {
      resultsTitle: 'Financing scenarios',
      steps: {
        purpose: { label: 'Purpose', title: 'What is your financing goal?', subtitle: 'Loan structure is modeled for your asset context.' },
        amount: { label: 'Amount', title: 'Amount you need', subtitle: 'Loan or financing principal.' },
        term: { label: 'Term', title: 'Preferred term', subtitle: 'Longer terms lower monthly payments but may raise total cost.' },
        capacity: { label: 'Capacity', title: 'Monthly payment capacity', subtitle: 'Sustainable installment band from net cash flow.' },
        cashflow: { label: 'Cash flow', title: 'Income, expenses, and existing debt', subtitle: 'Monthly balance drives borrowing score.' },
        sensitivity: { label: 'Sensitivity', title: 'Term preference, rate sensitivity, and risk', subtitle: 'Final step — borrowing score and scenarios.' }
      }
    },
    tatil: {
      steps: {
        goal: { label: 'Trip type', title: 'What kind of trip are you planning?', subtitle: 'Experience quality, cost, and risk adapt to your choice.' },
        people: { label: 'Travelers', title: 'Who is traveling?', subtitle: 'Group shape customizes lodging and transport suggestions.' },
        budget: { label: 'Budget', title: 'Choose your budget model', subtitle: 'Total cost, per-person cost, and hidden fees use this model.' },
        date: { label: 'Dates', title: 'Plan travel dates', subtitle: 'Peak season, weather, and price advantage use date data.' },
        preferences: { label: 'Preferences', title: 'Transport and comfort expectations', subtitle: 'Transfer, flight, and lodging comfort affect score.' },
        expectations: { label: 'Expectations', title: 'Mark your priorities', subtitle: 'Select up to 5 expectations for the AI score.' },
        note: { label: 'Profile note', title: 'Add an optional note?', subtitle: 'Health, pace, special needs, or route expectations.' }
      }
    }
  }
};
