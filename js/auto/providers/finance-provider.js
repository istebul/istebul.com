import { AutoProviderAdapter } from './base-provider.js';

export class FinanceProviderAdapter extends AutoProviderAdapter {
  constructor() {
    super({ id: 'finance', label: 'Finansman teklifleri', enabled: true, hasLiveApi: false });
  }

  buildCta() {
    return {
      ctaLabel: 'Finansman seçeneklerini gör',
      interestType: 'finance_review',
      microcopy: 'Simülasyon — banka onayı ayrıdır'
    };
  }
}
