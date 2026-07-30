export type BusinessNavId =
  | 'dashboard'
  | 'veri-merkezi'
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
