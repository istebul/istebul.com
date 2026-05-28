export const KONUT_STEPS = [
  {
    id: 'profile',
    label: 'Profil',
    title: 'Konut kararınızın amacı nedir?',
    subtitle: 'Oturum, kiralama veya yatırım hedefine göre maliyet ve risk modeli uyarlanır.'
  },
  {
    id: 'budget',
    label: 'Bütçe',
    title: 'Bütçe ve ödeme kapasiteniz',
    subtitle: 'Peşinat, aylık ödeme limiti ve toplam bütçe çerçevesi.'
  },
  {
    id: 'property',
    label: 'Konut tipi',
    title: 'Hangi konut tipini değerlendiriyorsunuz?',
    subtitle: 'Tip; aidat, bakım ve finansman yapısını etkiler.'
  },
  {
    id: 'location',
    label: 'Lokasyon',
    title: 'Lokasyon tercihiniz',
    subtitle: 'Bölge; ulaşım, likidite ve risk skoruna yansır.'
  },
  {
    id: 'financing',
    label: 'Finansman',
    title: 'Kredi ve sabit giderler',
    subtitle: 'İpotek ihtiyacı ile aidat, vergi ve bakım yükü birlikte değerlendirilir.'
  },
  {
    id: 'risks',
    label: 'Riskler',
    title: 'Öncelikli risk alanlarınız',
    subtitle: 'En fazla 5 risk faktörü seçebilirsiniz.'
  }
];

export const KONUT_OPTIONS = {
  profile: [
    { value: 'satin-alma', label: 'Ev satın alma', description: 'Oturmak veya uzun vadeli sahiplik' },
    { value: 'kiralama', label: 'Kiralama', description: 'Aylık kira yükü ve esneklik odaklı' },
    { value: 'yatirim', label: 'Yatırım', description: 'Kira getirisi ve değer artışı odaklı' }
  ],
  budget: [
    { value: 'giris', label: 'Giriş segmenti', range: '₺2M – ₺4M', description: 'İlk konut / kompakt segment' },
    { value: 'orta', label: 'Orta segment', range: '₺4M – ₺8M', description: 'Aile konutu ve şehir içi' },
    { value: 'ust', label: 'Üst segment', range: '₺8M – ₺15M', description: 'Geniş metrekare / iyi lokasyon' },
    { value: 'premium', label: 'Premium', range: '₺15M+', description: 'Üst segment ve özel projeler' },
    { value: 'manuel', label: 'Manuel bütçe', range: null, description: 'Toplam bütçenizi girin', manual: true }
  ],
  property: [
    { value: 'daire', label: 'Daire', description: 'Aidat ve site yönetimi dahil' },
    { value: 'mustakil', label: 'Müstakil', description: 'Bahçe ve bakım maliyeti ayrı' },
    { value: 'arsa', label: 'Arsa', description: 'İmar ve inşaat riski yüksek' },
    { value: 'yatirim-ticari', label: 'Ticari / karma', description: 'Kira ve likidite odaklı' }
  ],
  location: [
    { value: 'istanbul', label: 'İstanbul', description: 'Yüksek likidite, yüksek yük' },
    { value: 'ankara', label: 'Ankara', description: 'Dengeli talep ve maliyet' },
    { value: 'izmir', label: 'İzmir', description: 'Sahil ve merkez alternatifleri' },
    { value: 'antalya', label: 'Antalya', description: 'Turizm ve ikamet karışımı' },
    { value: 'esnek', label: 'Esnek / karşılaştırmalı', description: 'Birden fazla şehir' }
  ],
  financing: [
    { value: 'ipotek-agir', label: 'Ağırlıklı ipotek', description: 'Düşük peşinat, yüksek taksit' },
    { value: 'dengeli', label: 'Dengeli finansman', description: 'Peşinat + makul vade' },
    { value: 'nakit-agir', label: 'Nakit ağırlıklı', description: 'Düşük faiz riski' },
    { value: 'belirsiz', label: 'Henüz net değil', description: 'Senaryo karşılaştırması' }
  ],
  costLevel: [
    { value: 'dusuk-aidat', label: 'Düşük aidat beklentisi' },
    { value: 'orta-aidat', label: 'Orta aidat' },
    { value: 'yuksek-aidat', label: 'Yüksek aidat / site' },
    { value: 'vergi-farkinda', label: 'Vergi yükü önemli' },
    { value: 'bakim-yuksek', label: 'Bakım / tadilat riski' }
  ],
  risks: [
    { value: 'deprem', label: 'Deprem / yapı güvenliği' },
    { value: 'lokasyon', label: 'Lokasyon / ulaşım' },
    { value: 'kira-getirisi', label: 'Kira getirisi' },
    { value: 'likidite', label: 'Satış / likidite' },
    { value: 'faiz', label: 'Faiz artışı' },
    { value: 'aidat', label: 'Aidat artışı' }
  ]
};

export const KONUT_DISCLAIMER =
  'Bu analiz bilgilendirme amaçlıdır; finansal, hukuki veya yatırım tavsiyesi değildir. Kesin fiyat ve kredi koşulları kuruma göre değişir.';
