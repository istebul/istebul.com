export const VACATION_STEPS = [
  { id: 'goal', label: 'Amaç', title: 'Tatil amacınız nedir?' },
  { id: 'budget', label: 'Bütçe', title: 'Tatil bütçenizi nasıl planlıyorsunuz?' },
  {
    id: 'people',
    label: 'Kişi',
    title: 'Kimlerle seyahat edeceksiniz?',
    subtitle: 'Grup yapınıza göre konaklama ve ulaşım önerileri özelleştirilir.'
  },
  {
    id: 'type',
    label: 'Deneyim',
    title: 'Nasıl bir tatil deneyimi arıyorsunuz?',
    subtitle:
      'Konaklama, aktivite yoğunluğu ve beklentinize göre en uygun tatil modelini seçin.'
  },
  {
    id: 'date',
    label: 'Tarih',
    title: 'Seyahat tarihlerinizi belirleyin',
    subtitle: 'Net tarih girebilir veya yaklaşık dönem ile esneklik belirtebilirsiniz.'
  },
  {
    id: 'note',
    label: 'Beklenti',
    title: 'Özel beklentileriniz',
    subtitle: 'Sağlık, tempo, erişilebilirlik veya bütçe hassasiyetlerinizi paylaşın.'
  }
];

export const BUDGET_PLANS = [
  {
    value: 'ekonomik',
    label: 'Ekonomik Plan',
    description: 'Temel ihtiyaçları karşılayan, maliyet odaklı tatil.',
    range: '0 – 50.000 TL'
  },
  {
    value: 'dengeli',
    label: 'Dengeli Plan',
    description: 'Konfor ve bütçe dengesini koruyan tatil.',
    range: '50.000 – 120.000 TL'
  },
  {
    value: 'manuel',
    label: 'Manuel Bütçe',
    description: 'Kendi hedef bütçenizi girin.',
    range: null,
    manual: true
  }
];

export const STEP_OPTIONS = {
  goal: [
    { value: 'aile', label: 'Aile Tatili', icon: '👨‍👩‍👧' },
    { value: 'balayi', label: 'Balayı', icon: '💑' },
    { value: 'ekonomik', label: 'Ekonomik Tatil', icon: '💰' },
    { value: 'luks', label: 'Lüks Tatil', icon: '✨' },
    { value: 'yurtdisi', label: 'Yurt Dışı', icon: '✈️' },
    { value: 'kacamak', label: 'Kısa Kaçamak', icon: '⏱️' }
  ],
  people: [
    {
      value: 'tek',
      label: 'Tek başıma',
      description: 'Esnek tempo; bireysel konfor ve ulaşım önceliği.'
    },
    {
      value: 'cift',
      label: 'Çift olarak',
      description: 'Romantik veya sakin çift tatili; ortak bütçe planı.'
    },
    {
      value: 'aile',
      label: 'Aile ile',
      description: 'Yetişkin aile üyeleri; çocuksuz veya çocuklar ayrı planlanmış.'
    },
    {
      value: 'arkadas',
      label: 'Arkadaş grubuyla',
      description: 'Paylaşımlı konaklama ve aktivite odaklı plan.'
    },
    {
      value: 'cocuklu-aile',
      label: 'Çocuklu aile',
      description: 'Çocuk güvenliği, aktivite ve oda düzeni öncelikli.'
    },
    {
      value: 'yasli-aile',
      label: 'Yaşlı aile bireyiyle',
      description: 'Erişilebilirlik, sağlık ve düşük tempo öncelikli.'
    }
  ],
  type: [
    {
      value: 'deniz-resort',
      label: 'Deniz ve resort tatili',
      description: 'Sahil, havuz ve paket konforu; aileler için yaygın model.'
    },
    {
      value: 'doga',
      label: 'Doğa ve sakinlik',
      description: 'Yayla, orman veya sakin koy; düşük tempo.'
    },
    {
      value: 'kultur-sehir',
      label: 'Kültür ve şehir keşfi',
      description: 'Müze, gastronomi ve şehir merkezi konaklama.'
    },
    {
      value: 'luks',
      label: 'Lüks ve özel deneyim',
      description: 'Butik hizmet, özel transfer ve yüksek konfor beklentisi.'
    },
    {
      value: 'cocuk-dostu',
      label: 'Çocuk dostu otel',
      description: 'Kulüp, animasyon ve aile odası profili.'
    },
    {
      value: 'ekonomik-kacamak',
      label: 'Ekonomik kaçamak',
      description: 'Kısa süre, maliyet kontrollü kaçamak.'
    },
    {
      value: 'vizesiz-yurtdisi',
      label: 'Vizesiz yurt dışı',
      description: 'Yakın ülke veya vizesiz destinasyon odaklı plan.'
    },
    {
      value: 'villa-butik',
      label: 'Villa / butik konaklama',
      description: 'Mahremiyet ve özel alan; grup veya çift için.'
    }
  ],
  dateFlexibility: [
    { value: 'net', label: 'Net tarihlerim var' },
    { value: '1-2-days', label: '1–2 gün esneyebilir' },
    { value: '1-week', label: '1 hafta esneyebilir' },
    { value: 'undecided', label: 'Henüz karar vermedim' }
  ]
};

export const DEFAULT_SETTINGS = {
  vacation_enabled: 'true',
  vacation_ai_enabled: 'true',
  vacation_partner_cta_enabled: 'false',
  vacation_default_budget_note: 'Tahminler sezon ve doluluğa göre değişebilir.',
  vacation_disclaimer_text:
    'Fiyatlar ve uygunluk tahminidir; sezon, doluluk ve partner bilgilerine göre değişebilir.'
};

export const RESULT_BADGES = {
  logical: { label: 'En Mantıklı Seçenek', className: 'is-logical' },
  economic: { label: 'En Ekonomik Seçenek', className: 'is-economic' },
  comfort: { label: 'En Konforlu Seçenek', className: 'is-comfort' }
};
