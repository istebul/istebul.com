export const VACATION_STEPS = [
  { id: 'goal', label: 'Amaç', title: 'Tatil amacınız nedir?' },
  { id: 'budget', label: 'Bütçe', title: 'Tahmini tatil bütçeniz?' },
  { id: 'people', label: 'Kişi', title: 'Kimlerle seyahat edeceksiniz?' },
  { id: 'type', label: 'Tip', title: 'Tatil tipiniz hangisine yakın?' },
  { id: 'date', label: 'Tarih', title: 'Tarih ve süre' },
  { id: 'note', label: 'Not', title: 'Ek notlarınız' }
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
  budget: [
    { value: '0-30K', label: '0 – 30.000 ₺' },
    { value: '30-60K', label: '30.000 – 60.000 ₺' },
    { value: '60-100K', label: '60.000 – 100.000 ₺' },
    { value: '100K+', label: '100.000 ₺ ve üzeri' }
  ],
  people: [
    { value: 'tek', label: 'Tek kişi' },
    { value: 'cift', label: 'Çift' },
    { value: 'aile', label: 'Aile' },
    { value: 'cocuklu-aile', label: 'Çocuklu aile' }
  ],
  type: [
    { value: 'deniz', label: 'Deniz' },
    { value: 'doga', label: 'Doğa' },
    { value: 'sehir', label: 'Şehir' },
    { value: 'kultur', label: 'Kültür' },
    { value: 'her-sey-dahil', label: 'Her şey dahil' },
    { value: 'villa', label: 'Villa / butik' }
  ],
  duration: [
    { value: '2-3', label: '2–3 gece' },
    { value: '4-6', label: '4–6 gece' },
    { value: '7-10', label: '7–10 gece' },
    { value: '10+', label: '10+ gece' }
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
