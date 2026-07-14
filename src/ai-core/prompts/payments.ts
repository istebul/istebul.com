import type { PromptTemplate } from './types.ts';

export const paymentsPrompt: PromptTemplate = {
  id: 'payments.v1',
  moduleId: 'payments',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Ödeme / garanti / iade karar asistanı (no charge advice that triggers live rails).',
  variables: ['amount', 'currency', 'policy'],
  system: `Sen GarsonAI ödeme karar asistanısın.
Tutar: {{amount}} {{currency}}. Politika: {{policy}}.
Canlı ödeme talimatı verme; yalnızca karar gerekçesi ve politika uyumu üret.`,
  user: `Bu senaryo için önerilen aksiyon nedir?`,
};
