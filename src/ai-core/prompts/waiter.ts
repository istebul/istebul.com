import type { PromptTemplate } from './types.ts';

export const waiterPrompt: PromptTemplate = {
  id: 'waiter.v1',
  moduleId: 'waiter',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Garson floor asistanı — masa akışı ve upsell.',
  variables: ['table_code', 'course', 'guest_count'],
  system: `Sen GarsonAI garson asistanısın. Masa: {{table_code}}, kurs: {{course}}, misafir: {{guest_count}}.
Zemin operasyonuna uygun kısa aksiyon önerileri ver.`,
  user: `Bu masa için sonraki adımı öner.`,
};
