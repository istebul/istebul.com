export const FINANS_STEPS = [
  {
    id: 'purpose',
    label: 'Amaç',
    title: 'Finansman amacınız nedir?',
    subtitle: 'Kredi yapısı seçtiğiniz varlık bağlamına göre modellenir.'
  },
  {
    id: 'amount',
    label: 'Tutar',
    title: 'İhtiyaç duyduğunuz tutar',
    subtitle: 'Çekilecek kredi veya finansman tutarı.'
  },
  {
    id: 'term',
    label: 'Vade',
    title: 'Tercih ettiğiniz vade',
    subtitle: 'Vade uzadıkça aylık ödeme düşer, toplam maliyet artabilir.'
  },
  {
    id: 'capacity',
    label: 'Kapasite',
    title: 'Aylık ödeme kapasiteniz',
    subtitle: 'Net nakit akışınıza göre sürdürülebilir taksit bandı.'
  },
  {
    id: 'cashflow',
    label: 'Nakit akışı',
    title: 'Gelir, gider ve mevcut borç profili',
    subtitle: 'Aylık gelir/gider dengesi borçlanma skorunu belirler.'
  },
  {
    id: 'sensitivity',
    label: 'Hassasiyet',
    title: 'Vade tercihi, faiz hassasiyeti ve risk seviyesi',
    subtitle: 'Son adım — borçlanma skoru ve alternatif senaryolar üretilir.'
  }
];

export const FINANS_OPTIONS = {
  purpose: [
    { value: 'arac', label: 'Araç', description: 'Taşıt kredisi bağlamı' },
    { value: 'konut', label: 'Konut', description: 'İpotek / konut kredisi' },
    { value: 'tatil', label: 'Tatil / seyahat', description: 'Tatil ve seyahat harcamaları finansmanı' },
    { value: 'ihtiyac', label: 'İhtiyaç kredisi', description: 'Genel tüketici kredisi' },
    { value: 'isletme', label: 'İşletme', description: 'Ticari nakit akışı' }
  ],
  amount: [
    { value: '250k', label: '₺250.000 altı', mid: 200_000 },
    { value: '500k', label: '₺250K – ₺500K', mid: 375_000 },
    { value: '1m', label: '₺500K – ₺1M', mid: 750_000 },
    { value: '2m', label: '₺1M – ₺2M', mid: 1_500_000 },
    { value: 'manuel', label: 'Manuel tutar', manual: true }
  ],
  term: [
    { value: '12', label: '12 ay', months: 12 },
    { value: '24', label: '24 ay', months: 24 },
    { value: '36', label: '36 ay', months: 36 },
    { value: '48', label: '48 ay', months: 48 },
    { value: '60', label: '60 ay', months: 60 }
  ],
  capacity: [
    { value: '15k', label: '₺15.000 altı / ay', cap: 12_000 },
    { value: '25k', label: '₺15K – ₺25K / ay', cap: 20_000 },
    { value: '40k', label: '₺25K – ₺40K / ay', cap: 32_000 },
    { value: '60k', label: '₺40K+ / ay', cap: 50_000 },
    { value: 'manuel', label: 'Manuel kapasite', manual: true }
  ],
  income: [
    { value: 'stabil', label: 'Stabil gelir', description: 'Maaş / düzenli nakit akışı' },
    { value: 'degisken', label: 'Değişken gelir', description: 'Serbest / komisyon' },
    { value: 'karma', label: 'Karma', description: 'Sabit + değişken bileşen' }
  ],
  earlyPayment: [
    { value: 'yuksek', label: 'Erken ödeme olası', description: '6–12 ay içinde kapama ihtimali' },
    { value: 'belki', label: 'Belki', description: 'Kısmi erken ödeme' },
    { value: 'dusuk', label: 'Düşük ihtimal', description: 'Vade sonuna yakın plan' }
  ],
  rateSensitivity: [
    { value: 'dusuk', label: 'Düşük', description: 'Faiz artışı sınırlı etki' },
    { value: 'orta', label: 'Orta', description: 'Dengeli hassasiyet' },
    { value: 'yuksek', label: 'Yüksek', description: 'Faiz artışı kritik' }
  ],
  riskTolerance: [
    { value: 'muhafazakar', label: 'Muhafazakar', description: 'Düşük risk, sabit plan' },
    { value: 'dengeli', label: 'Dengeli', description: 'Orta risk / getiri' },
    { value: 'agresif', label: 'Agresif', description: 'Yüksek risk toleransı' }
  ]
};

export const FINANS_DISCLAIMER =
  'Bu analiz bilgilendirme amaçlıdır; kredi onayı, faiz oranı veya finansal tavsiye taahhüdü değildir. Kesin teklif banka ve kurum onayına bağlıdır.';
