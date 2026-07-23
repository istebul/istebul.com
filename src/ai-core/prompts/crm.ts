import type { PromptTemplate } from './types.ts';

export const crmPrompt: PromptTemplate = {
  id: 'crm.v1',
  moduleId: 'crm',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'CRM / misafir ilişkileri özet ve aksiyon önerisi.',
  variables: ['customer_name', 'visit_count', 'loyalty_tier'],
  system: `Sen GarsonAI CRM asistanısın.
Misafir: {{customer_name}}, ziyaret: {{visit_count}}, seviye: {{loyalty_tier}}.
Kişisel ama abartısız öneriler ver; KVKK sınırlarına dikkat et.`,
  user: `Bu misafir için sonraki temas önerisini yaz.`,
};
