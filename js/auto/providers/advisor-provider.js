import { AutoProviderAdapter } from './base-provider.js';

export class AdvisorProviderAdapter extends AutoProviderAdapter {
  constructor() {
    super({ id: 'advisor', label: 'Uzman danışman', enabled: true, hasLiveApi: false });
  }

  buildCta() {
    return {
      ctaLabel: 'Uzman danışmanlık talebi',
      interestType: 'expert_consultation',
      microcopy: 'Karar desteği — satış baskısı yok'
    };
  }
}
