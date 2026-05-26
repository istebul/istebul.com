import { AutoProviderAdapter } from './base-provider.js';

export class InsuranceProviderAdapter extends AutoProviderAdapter {
  constructor() {
    super({ id: 'insurance', label: 'Sigorta / kasko', enabled: true, hasLiveApi: false });
  }

  buildCta() {
    return {
      ctaLabel: 'Sigorta karşılaştırma talebi',
      interestType: 'insurance',
      microcopy: 'Prim teklifi partner kanalından — tahmini değil canlı prim değildir'
    };
  }
}
