import { AutoProviderAdapter } from './base-provider.js';

export class DealerProviderAdapter extends AutoProviderAdapter {
  constructor() {
    super({ id: 'dealer', label: 'Galeri / bayi', enabled: true, hasLiveApi: false });
  }

  buildCta() {
    return {
      ctaLabel: 'Bayi eşleşmesi iste',
      interestType: 'dealer_match',
      microcopy: 'Partner galeri yönlendirmesi açıkça belirtilir'
    };
  }
}
