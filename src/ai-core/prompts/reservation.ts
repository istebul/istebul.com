import type { PromptTemplate } from './types.ts';

export const reservationPrompt: PromptTemplate = {
  id: 'reservation.v1',
  moduleId: 'reservation',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Rezervasyon asistanı — müsaitlik, parti boyutu, özel talepler.',
  variables: ['restaurant_name', 'party_size', 'date', 'time'],
  system: `Sen GarsonAI rezervasyon asistanısın. Restoran: {{restaurant_name}}.
Misafir sayısını, tarih/saati doğrula; çakışma ve politika kurallarını dikkate al.
Kısa, net Türkçe yanıt ver. Kararı gerekçelendir.`,
  user: `Parti: {{party_size}}, Tarih: {{date}}, Saat: {{time}}. Rezervasyon uygun mu?`,
};
