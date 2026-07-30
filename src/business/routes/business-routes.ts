export type BusinessRouteName =
  | 'business-dashboard'
  | 'business-veri-merkezi'
  | 'business-analizler'
  | 'business-raporlar'
  | 'business-danisman'
  | 'business-bildirimler'
  | 'business-ayarlar';

export type BusinessPageId =
  | 'BusinessDashboardPage'
  | 'BusinessImportCenterPage'
  | 'BusinessAnalysesPage'
  | 'BusinessReportsPage'
  | 'BusinessAiAdvisorPage'
  | 'BusinessNotificationsPage'
  | 'BusinessSettingsPage';

export interface BusinessRouteDefinition {
  path: string;
  name: BusinessRouteName;
  page: BusinessPageId;
  navId: import('../types/business-nav').BusinessNavId;
  title: string;
  description: string;
}

export const BUSINESS_ROUTES: readonly BusinessRouteDefinition[] = Object.freeze([
  {
    path: '/business',
    name: 'business-dashboard',
    page: 'BusinessDashboardPage',
    navId: 'dashboard',
    title: 'Dashboard',
    description: 'Günlük özet, KPI kartları ve hızlı işlemler.'
  },
  {
    path: '/business/veri-merkezi',
    name: 'business-veri-merkezi',
    page: 'BusinessImportCenterPage',
    navId: 'veri-merkezi',
    title: 'Veri Merkezi',
    description: 'İşletme verilerinizi yükleyin ve analiz oluşturmaya başlayın.'
  },
  {
    path: '/business/analizler',
    name: 'business-analizler',
    page: 'BusinessAnalysesPage',
    navId: 'analizler',
    title: 'Analizler',
    description: 'İş analizi ve içgörü çalışmaları.'
  },
  {
    path: '/business/raporlar',
    name: 'business-raporlar',
    page: 'BusinessReportsPage',
    navId: 'raporlar',
    title: 'Raporlar',
    description: 'Periyodik ve özel raporlar.'
  },
  {
    path: '/business/danisman',
    name: 'business-danisman',
    page: 'BusinessAiAdvisorPage',
    navId: 'danisman',
    title: 'Yapay Zekâ Danışmanı',
    description: 'AI destekli iş danışmanlığı.'
  },
  {
    path: '/business/bildirimler',
    name: 'business-bildirimler',
    page: 'BusinessNotificationsPage',
    navId: 'bildirimler',
    title: 'Bildirimler',
    description: 'Uyarılar ve sistem bildirimleri.'
  },
  {
    path: '/business/ayarlar',
    name: 'business-ayarlar',
    page: 'BusinessSettingsPage',
    navId: 'ayarlar',
    title: 'Ayarlar',
    description: 'Çalışma alanı ve tercih ayarları.'
  }
]);

export function normalizeBusinessPath(pathname: string): string {
  const trimmed = pathname.replace(/\/$/, '') || '/';
  return trimmed;
}

export function getBusinessRouteByPath(pathname: string): BusinessRouteDefinition | null {
  const normalized = normalizeBusinessPath(pathname);
  return BUSINESS_ROUTES.find((route) => route.path === normalized) ?? null;
}

export function getBusinessRouteByNavId(
  navId: import('../types/business-nav').BusinessNavId
): BusinessRouteDefinition | null {
  return BUSINESS_ROUTES.find((route) => route.navId === navId) ?? null;
}

export default BUSINESS_ROUTES;
