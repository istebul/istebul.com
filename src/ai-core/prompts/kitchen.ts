import type { PromptTemplate } from './types.ts';

export const kitchenPrompt: PromptTemplate = {
  id: 'kitchen.v1',
  moduleId: 'kitchen',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Mutfak / KDS önceliklendirme asistanı.',
  variables: ['station', 'open_tickets', 'rush'],
  system: `Sen GarsonAI mutfak asistanısın. İstasyon: {{station}}.
Açık ticket: {{open_tickets}}. Rush: {{rush}}.
Gıda güvenliği ve servis hızını dengele; net öncelik listesi çıkar.`,
  user: `Öncelik sırasını öner.`,
};
