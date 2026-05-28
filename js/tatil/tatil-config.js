export const VACATION_STEPS = [
  {
    id: 'goal',
    label: 'Tatil tipi',
    title: 'Nasıl bir tatil deneyimi arıyorsunuz?',
    subtitle: 'Seçiminize göre deneyim kalitesi, maliyet ve risk modeli uyarlanır.'
  },
  {
    id: 'people',
    label: 'Kişi',
    title: 'Kimlerle seyahat edeceksiniz?',
    subtitle: 'Grup yapınıza göre konaklama ve ulaşım önerileri özelleştirilir.'
  },
  {
    id: 'budget',
    label: 'Bütçe',
    title: 'Bütçe modelinizi seçin',
    subtitle: 'Toplam maliyet, kişi başı maliyet ve gizli giderler bu modelle hesaplanır.'
  },
  {
    id: 'date',
    label: 'Tarih',
    title: 'Seyahat tarihlerini planlayın',
    subtitle: 'Yoğun sezon, hava ve fiyat avantajı analizi tarih verisiyle hesaplanır.'
  },
  {
    id: 'preferences',
    label: 'Tercihler',
    title: 'Ulaşım ve konfor beklentiniz',
    subtitle: 'Transfer, uçuş ve konaklama konforu skoru etkiler.'
  },
  {
    id: 'expectations',
    label: 'Beklentiler',
    title: 'Önceliklerinizi işaretleyin',
    subtitle: 'AI skoru için en fazla 5 beklenti seçebilirsiniz.'
  },
  {
    id: 'note',
    label: 'Profil notu',
    title: 'Ek not eklemek ister misiniz?',
    subtitle:
      'Sağlık, tempo, özel ihtiyaç veya rota beklentinizi ekleyebilirsiniz.'
  }
];

export const BUDGET_PLANS = [
  {
    value: 'ekonomik',
    label: 'Ekonomik',
    description: 'Maliyet odaklı, temel konfor seviyesinde plan.',
    range: '₺20.000 – ₺60.000'
  },
  {
    value: 'dengeli',
    label: 'Dengeli',
    description: 'Bütçe, kalite ve deneyim dengesini koruyan plan.',
    range: '₺60.000 – ₺140.000'
  },
  {
    value: 'premium',
    label: 'Premium',
    description: 'Yüksek konfor, daha iyi konaklama ve deneyim odaklı.',
    range: '₺140.000 – ₺260.000'
  },
  {
    value: 'ultra',
    label: 'Ultra Luxury',
    description: 'Özel transfer, premium lokasyon ve üst segment hizmet.',
    range: '₺260.000+'
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
    { value: 'deniz', label: 'Deniz tatili', icon: '🏖️', fit: 'Aileler ve dinlenme odaklı profiller' },
    { value: 'sehir', label: 'Şehir gezisi', icon: '🌆', fit: 'Kültür ve gastronomi sevenler' },
    { value: 'doga', label: 'Doğa kaçamağı', icon: '🌲', fit: 'Sakinlik ve doğa deneyimi arayanlar' },
    { value: 'luks-resort', label: 'Lüks resort', icon: '✨', fit: 'Konfor ve servis kalitesine odaklananlar' },
    { value: 'balayi', label: 'Balayı', icon: '💍', fit: 'Özel deneyim isteyen çiftler' },
    { value: 'cocuklu-aile', label: 'Çocuklu aile tatili', icon: '👨‍👩‍👧‍👦', fit: 'Çocuk güvenliği ve aktivite arayanlar' },
    { value: 'wellness', label: 'Wellness / spa', icon: '🧖', fit: 'Rahatlama ve bakım odaklı gezginler' },
    { value: 'kultur', label: 'Kültür turu', icon: '🏛️', fit: 'Tarihi rota ve keşif severler' }
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
      label: 'Geniş aile',
      description: 'Çok kişili konaklama ve ortak plan odaklı seyahat.'
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
      value: 'is-tatil',
      label: 'İş + tatil',
      description: 'Workation uyumu, internet kalitesi ve erişim öncelikli.'
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
  expectations: [
    'Sessizlik',
    'Çocuk dostu',
    'Gece hayatı',
    'Doğa',
    'Instagramlık yerler',
    'Gastronomi',
    'Güvenlik',
    'Uygun fiyat',
    'Lüks deneyim',
    'Spa',
    'Macera'
  ],
  dateFlexibility: [
    { value: 'net', label: 'Net tarihlerim var' },
    { value: '1-2-days', label: '1–2 gün esneyebilir' },
    { value: '1-week', label: '1 hafta esneyebilir' },
    { value: 'undecided', label: 'Henüz karar vermedim' }
  ],
  transport: [
    { value: 'ucak', label: 'Uçak', description: 'Hızlı ulaşım, havalimanı transferi' },
    { value: 'otobus', label: 'Otobüs / tren', description: 'Ekonomik kara ulaşımı' },
    { value: 'arac', label: 'Kendi aracım', description: 'Esnek rota, yakıt maliyeti dahil' },
    { value: 'karma', label: 'Karma', description: 'Uçuş + yerel transfer kombinasyonu' }
  ],
  comfort: [
    { value: 'temel', label: 'Temel konfor', description: 'Temiz konaklama, bütçe odaklı' },
    { value: 'dengeli', label: 'Dengeli', description: 'Konfor/fiyat dengesi' },
    { value: 'premium', label: 'Premium', description: 'Geniş oda, iyi hizmet' },
    { value: 'luks', label: 'Lüks', description: 'Üst segment konaklama ve transfer' }
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
