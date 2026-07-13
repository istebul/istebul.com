import type { BusinessModule } from '../types/business-module';

export const BUSINESS_MODULES: readonly BusinessModule[] = Object.freeze([
  {
    id: 'ai-analiz-merkezi',
    title: 'AI Analiz Merkezi',
    description: 'İş verileriniz için yapay zekâ destekli içgörü ve karar özetleri.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  },
  {
    id: 'dashboard-merkezi',
    title: 'Dashboard Merkezi',
    description: 'Operasyonel ve yönetimsel göstergeleri tek panelde izleme.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  },
  {
    id: 'rapor-merkezi',
    title: 'Rapor Merkezi',
    description: 'Periyodik ve özel raporların üretimi ve paylaşımı.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  },
  {
    id: 'dokuman-merkezi',
    title: 'Doküman Merkezi',
    description: 'İş dokümanlarının düzenlenmesi ve güvenli erişim yönetimi.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  },
  {
    id: 'sablon-merkezi',
    title: 'Şablon Merkezi',
    description: 'Tekrarlayan iş süreçleri için hazır şablon kütüphanesi.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  },
  {
    id: 'entegrasyonlar',
    title: 'Entegrasyonlar',
    description: 'Mevcut araçlarınızla güvenli ve kontrollü bağlantılar.',
    status: 'yakinda',
    statusLabel: 'Yakında'
  }
]);

export default BUSINESS_MODULES;
