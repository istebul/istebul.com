export type BusinessModuleStatus = 'yakinda';

export type BusinessModuleId =
  | 'ai-analiz-merkezi'
  | 'dashboard-merkezi'
  | 'rapor-merkezi'
  | 'dokuman-merkezi'
  | 'sablon-merkezi'
  | 'entegrasyonlar';

export interface BusinessModule {
  id: BusinessModuleId;
  title: string;
  description: string;
  status: BusinessModuleStatus;
  statusLabel: string;
}
