import type { BusinessNavItem } from '../types/business-nav';

export const BUSINESS_NAV_ITEMS: readonly BusinessNavItem[] = Object.freeze([
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/business/',
    description: 'Günlük özet ve KPI görünümü'
  },
  {
    id: 'analizler',
    label: 'Analizler',
    href: '/business/analizler/',
    description: 'İş analizi ve içgörü çalışmaları'
  },
  {
    id: 'raporlar',
    label: 'Raporlar',
    href: '/business/raporlar/',
    description: 'Periyodik ve özel raporlar'
  },
  {
    id: 'danisman',
    label: 'Yapay Zekâ Danışmanı',
    href: '/business/danisman/',
    description: 'AI destekli iş danışmanlığı'
  },
  {
    id: 'bildirimler',
    label: 'Bildirimler',
    href: '/business/bildirimler/',
    description: 'Uyarılar ve sistem bildirimleri'
  },
  {
    id: 'ayarlar',
    label: 'Ayarlar',
    href: '/business/ayarlar/',
    description: 'Çalışma alanı ve tercih ayarları'
  }
]);

export default BUSINESS_NAV_ITEMS;
