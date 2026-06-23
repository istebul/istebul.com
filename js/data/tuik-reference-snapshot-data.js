/**
 * TÜİK manuel referans snapshot — statik veri (wrangler/Pages Functions uyumlu JS export).
 * Kaynak: data/snapshots/tuik-reference.json
 */

export const TUIK_REFERENCE_RAW = {
  sourceId: 'tuik',
  sourceName: 'Türkiye İstatistik Kurumu',
  status: 'manual_reference',
  lastReviewed: '2026-06-08',
  accessMode:
    'Manuel referans — resmi web yayınları periyodik gözden geçirilir; otomatik API beslemesi yoktur',
  officialUrl: 'https://www.tuik.gov.tr/',
  disclaimer:
    'Kaynak atıfı TÜİK yayın kurallarına uygun yapılır; ham veri yeniden satılmaz veya ticari olarak paketlenmez.',
  categories: [
    {
      id: 'tuketici_fiyat_endeksi',
      title: 'Tüketici fiyat endeksi (TÜFE)',
      relatedVerticals: ['finansman', 'auto'],
      usage:
        'Enflasyon ve satın alma gücü — finansman vadesi ve TCO projeksiyonlarında maliyet güncellemesi için manuel kalibrasyon referansı.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'yillik_enflasyon_oranlari',
      title: 'Yıllık enflasyon oranları',
      relatedVerticals: ['finansman', 'auto', 'konut', 'sigorta'],
      usage:
        'Makro enflasyon bağlamı — bütçe bandı ve maliyet varsayımlarının periyodik gözden geçirilmesi için referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'hanehalki_butce_istatistikleri',
      title: 'Hanehalkı bütçe istatistikleri',
      relatedVerticals: ['auto', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko'],
      usage:
        'Hane harcama yapısı — TCO ve bütçe bandı varsayımlarının segmentasyonu için destekleyici referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'konut_ve_ulastirma_harcama_paylari',
      title: 'Konut ve ulaştırma harcama payları',
      relatedVerticals: ['konut', 'auto', 'tatil'],
      usage:
        'Konut ve ulaştırma harcama payları — ödeme yükü ve seyahat bütçesi varsayımlarında makro referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'motorlu_kara_tasitlari_istatistikleri',
      title: 'Motorlu Kara Taşıtları İstatistikleri',
      relatedVerticals: ['auto'],
      usage:
        'Araç parkı, segment dağılımı ve kayıt verileri — TCO segment varsayımları ve ikinci el likidite sinyalleri için referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'karayolu_trafik_kaza_istatistikleri',
      title: 'Karayolu Trafik Kaza İstatistikleri',
      relatedVerticals: ['auto', 'sigorta'],
      usage:
        'Risk bandı ve sigorta maliyeti bağlamı — kaza yoğunluğu kullanıcıya açıklanabilir risk faktörü olarak yansıtılır.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'konut_satis_istatistikleri',
      title: 'Konut Satış İstatistikleri',
      relatedVerticals: ['konut'],
      usage:
        'Konut piyasası hacmi ve fiyat baskısı — ödeme yükü ve lokasyon kararlarında makro referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'turizm_istatistikleri',
      title: 'Turizm İstatistikleri',
      relatedVerticals: ['tatil'],
      usage:
        'Sezon, konaklama ve harcama eğilimleri — tatil bütçe bandı ve talep yoğunluğu kalibrasyonu için referans.',
      scoreImpact: false,
      aiNarrationAllowed: true
    },
    {
      id: 'nufus_ve_demografi_istatistikleri',
      title: 'Nüfus ve Demografi İstatistikleri',
      relatedVerticals: ['auto', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko'],
      usage:
        'Bölgesel talep ve hane profili — segmentasyon ve güven skoru bağlamında destekleyici sinyal.',
      scoreImpact: false,
      aiNarrationAllowed: true
    }
  ]
};

export default TUIK_REFERENCE_RAW;
