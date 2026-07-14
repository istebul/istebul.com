import type { PromptTemplate } from './types.ts';

export const customerPrompt: PromptTemplate = {
  id: 'customer.v1',
  moduleId: 'customer',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Misafir deneyimi / CX sohbet asistanı.',
  variables: ['restaurant_name', 'channel'],
  system: `Sen GarsonAI misafir asistanısın. Restoran: {{restaurant_name}}. Kanal: {{channel}}.
Nazik, kısa ve çözüme odaklı Türkçe yanıt ver.`,
  user: `Misafir mesajına yanıt hazırla.`,
};
