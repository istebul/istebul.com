import type { BusinessDashboardMockData } from '../types/dashboard-mock';

/** Dashboard MVP mock verisi — API / auth bağlantısı yok. */
export const BUSINESS_DASHBOARD_MOCK: BusinessDashboardMockData = Object.freeze({
  summary: Object.freeze({
    greeting: 'İyi günler',
    headline: 'Bugünkü iş özeti hazır',
    body: 'Mock verilerle günlük performans, aktivite ve AI önerileri önizleniyor. Canlı veri bağlantısı sonraki sprintlerde aktifleşecek.',
    dateLabel: '22 Temmuz 2026'
  }),
  kpis: Object.freeze([
    Object.freeze({
      id: 'aktif-analiz',
      label: 'Aktif Analiz',
      value: '12',
      delta: '+3',
      trend: 'up' as const,
      hint: 'Son 7 gün'
    }),
    Object.freeze({
      id: 'tamamlanan-rapor',
      label: 'Tamamlanan Rapor',
      value: '8',
      delta: '+1',
      trend: 'up' as const,
      hint: 'Bu hafta'
    }),
    Object.freeze({
      id: 'ai-onerisi',
      label: 'AI Önerisi',
      value: '5',
      delta: '0',
      trend: 'flat' as const,
      hint: 'Bekleyen'
    }),
    Object.freeze({
      id: 'acik-uyari',
      label: 'Açık Uyarı',
      value: '2',
      delta: '-1',
      trend: 'down' as const,
      hint: 'Öncelikli'
    })
  ]),
  activities: Object.freeze([
    Object.freeze({
      id: 'act-1',
      title: 'Satış özeti analizi güncellendi',
      detail: 'Q2 satış veri seti yeniden işlendi.',
      timeLabel: '14 dk önce'
    }),
    Object.freeze({
      id: 'act-2',
      title: 'Haftalık operasyon raporu oluşturuldu',
      detail: 'Taslak rapor paylaşıma hazır.',
      timeLabel: '1 sa önce'
    }),
    Object.freeze({
      id: 'act-3',
      title: 'AI danışman önerisi üretildi',
      detail: 'Stok dönüş hızı için 3 aksiyon önerildi.',
      timeLabel: '3 sa önce'
    }),
    Object.freeze({
      id: 'act-4',
      title: 'Bildirim kuralı kaydedildi',
      detail: 'Kritik KPI eşiği güncellendi.',
      timeLabel: 'Dün'
    })
  ]),
  aiSuggestions: Object.freeze([
    Object.freeze({
      id: 'ai-1',
      title: 'Marj baskısını izleyin',
      body: 'Son 14 günde maliyet artışı marjı %2.1 daralttı. Detaylı analiz için Analizler modülünü açın.'
    }),
    Object.freeze({
      id: 'ai-2',
      title: 'Rapor otomasyonu önerisi',
      body: 'Haftalık özet raporunuz her Pazartesi otomatik üretilebilir. Ayarlar’dan zamanlama ekleyebilirsiniz.'
    }),
    Object.freeze({
      id: 'ai-3',
      title: 'Placeholder içgörü',
      body: 'Canlı AI bağlantısı henüz aktif değil. Bu kartlar MVP iskeleti için örnek önerilerdir.'
    })
  ]),
  quickActions: Object.freeze([
    Object.freeze({
      id: 'qa-analiz',
      label: 'Yeni analiz',
      href: '/business/analizler/'
    }),
    Object.freeze({
      id: 'qa-rapor',
      label: 'Rapor oluştur',
      href: '/business/raporlar/'
    }),
    Object.freeze({
      id: 'qa-danisman',
      label: 'Danışmana sor',
      href: '/business/danisman/'
    }),
    Object.freeze({
      id: 'qa-ayarlar',
      label: 'Ayarları aç',
      href: '/business/ayarlar/'
    })
  ])
});

export default BUSINESS_DASHBOARD_MOCK;
