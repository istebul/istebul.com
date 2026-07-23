export type BusinessNavId =
  | 'dashboard'
  | 'analizler'
  | 'raporlar'
  | 'danisman'
  | 'bildirimler'
  | 'ayarlar';

export interface BusinessNavItem {
  id: BusinessNavId;
  label: string;
  href: string;
  description: string;
}
