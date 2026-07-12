/** GarsonAI admin panel — route and navigation constants. */

export const GARSON_ADMIN_PANEL_PATH = '/garson/panel/';
export const GARSON_ADMIN_LOGIN_PATH = '/garson/giris/';

/** @type {readonly { id: string, label: string, href: string, icon?: string }[]} */
export const ADMIN_NAV_ITEMS = Object.freeze([
  { id: 'dashboard', label: 'Özet', href: '/garson/panel/' },
  { id: 'siparisler', label: 'Siparişler', href: '/garson/panel/siparisler/' },
  { id: 'rezervasyonlar', label: 'Rezervasyonlar', href: '/garson/panel/rezervasyonlar/' },
  { id: 'musteriler', label: 'Müşteriler', href: '/garson/panel/musteriler/' },
  { id: 'menu', label: 'Menü', href: '/garson/panel/menu/' },
  { id: 'masalar', label: 'Masalar', href: '/garson/panel/masalar/' },
  { id: 'mutfak', label: 'Mutfak', href: '/garson/panel/mutfak/' },
  { id: 'whatsapp', label: 'WhatsApp', href: '/garson/panel/whatsapp/' },
  { id: 'analitik', label: 'Analitik', href: '/garson/panel/analitik/' },
  { id: 'bildirimler', label: 'Bildirimler', href: '/garson/panel/bildirimler/' },
  { id: 'ayarlar', label: 'Ayarlar', href: '/garson/panel/ayarlar/' }
]);

/** @type {Record<string, string>} */
export const ORDER_STATUS_LABELS = Object.freeze({
  pending: 'Bekliyor',
  submitted: 'Alındı',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  served: 'Teslim edildi',
  completed: 'Tamamlandı',
  cancelled: 'İptal'
});

/** @type {Record<string, string>} */
export const KITCHEN_STATUS_LABELS = Object.freeze({
  pending: 'Bekliyor',
  submitted: 'Yeni',
  preparing: 'Hazırlanıyor',
  ready: 'Hazır',
  served: 'Teslim edildi',
  completed: 'Tamamlandı'
});
