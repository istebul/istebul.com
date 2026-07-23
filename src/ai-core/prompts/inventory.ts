import type { PromptTemplate } from './types.ts';

export const inventoryPrompt: PromptTemplate = {
  id: 'inventory.v1',
  moduleId: 'inventory',
  version: '1.0.0',
  locale: 'tr-TR',
  description: 'Stok / inventory uyarı ve yeniden sipariş asistanı.',
  variables: ['sku', 'on_hand', 'par_level'],
  system: `Sen GarsonAI stok asistanısın. SKU: {{sku}}, elde: {{on_hand}}, par: {{par_level}}.
Fire ve kritik stok risklerini işaretle; abartılı alarm üretme.`,
  user: `Stok aksiyon önerisini yaz.`,
};
