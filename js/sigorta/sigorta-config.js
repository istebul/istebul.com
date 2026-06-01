export const SIGORTA_STEPS = [
  {
    id: 'type',
    label: 'Tür',
    title: 'Hangi sigorta korumasına ihtiyaç duyuyorsunuz?',
    subtitle: 'Analiz, seçtiğiniz ürün ailesine göre özelleştirilir.'
  },
  {
    id: 'profile',
    label: 'Profil',
    title: 'Yaş ve medeni durum',
    subtitle: 'Teminat ihtiyacı ve risk profili için temel girdiler.'
  },
  {
    id: 'household',
    label: 'Hane',
    title: 'Çocuk sayısı',
    subtitle: 'Aile koruması ve sağlık teminatı için önemlidir.'
  },
  {
    id: 'risk',
    label: 'Risk',
    title: 'Risk algınız',
    subtitle: 'Koruma seviyesi ve teminat derinliği bu tercihe göre ayarlanır.'
  },
  {
    id: 'budget',
    label: 'Bütçe',
    title: 'Bütçe seviyesi',
    subtitle: 'Prim–teminat dengesi ve maliyet verimliliği hesaplanır.'
  }
];

export const SIGORTA_OPTIONS = {
  insurance_type: [
    { value: 'arac', label: 'Araç', description: 'Trafik, kasko ve sorumluluk' },
    { value: 'konut', label: 'Konut', description: 'DASK, yangın ve eşya' },
    { value: 'saglik', label: 'Sağlık', description: 'Tamamlayıcı / özel sağlık' },
    { value: 'seyahat', label: 'Seyahat', description: 'Yurt içi / yurt dışı seyahat' }
  ],
  marital_status: [
    { value: 'bekar', label: 'Bekâr' },
    { value: 'evli', label: 'Evli' },
    { value: 'bosanmis', label: 'Boşanmış' },
    { value: 'diger', label: 'Diğer' }
  ],
  children_count: [
    { value: '0', label: 'Çocuk yok' },
    { value: '1', label: '1 çocuk' },
    { value: '2', label: '2 çocuk' },
    { value: '3plus', label: '3 ve üzeri' }
  ],
  risk_perception: [
    { value: 'dusuk', label: 'Düşük', description: 'Temel koruma yeterli' },
    { value: 'orta', label: 'Orta', description: 'Dengeli teminat' },
    { value: 'yuksek', label: 'Yüksek', description: 'Geniş kapsam tercih ederim' }
  ],
  budget_level: [
    { value: 'dusuk', label: 'Ekonomik', description: 'Zorunlu / temel paket' },
    { value: 'orta', label: 'Dengeli', description: 'Standart teminat' },
    { value: 'yuksek', label: 'Geniş', description: 'Üst segment koruma' }
  ]
};

export const SIGORTA_DISCLAIMER =
  'Sigorta analizi bilgilendirme amaçlıdır; bağlayıcı poliçe koşulları sigorta şirketine aittir. Finansal tavsiye değildir.';

export const SIGORTA_INTEREST_CTAS = [
  {
    id: 'quote',
    interestType: 'insurance_quote',
    label: 'Teklif al',
    description: 'Profilinize uygun prim bandı için bilgilendirme'
  },
  {
    id: 'review',
    interestType: 'insurance_review',
    label: 'Poliçe incelemesi',
    description: 'Mevcut poliçenizin teminat analizi'
  },
  {
    id: 'consultation',
    interestType: 'insurance_consultation',
    label: 'Danışman görüşmesi',
    description: 'Sigorta uzmanı ile kısa görüşme talebi'
  }
];
