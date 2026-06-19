/**
 * Partner provider adapter base — enterprise-ready; no fake live offers.
 */
export class AutoProviderAdapter {
  constructor(config = {}) {
    this.id = config.id || 'base';
    this.label = config.label || 'Partner';
    this.enabled = Boolean(config.enabled);
    this.hasLiveApi = Boolean(config.hasLiveApi);
  }

  /** @returns {{ available: boolean, reason: string }} */
  availability() {
    if (!this.enabled) {
      return { available: false, reason: 'Pilot aşama — entegrasyon hazırlanıyor' };
    }
    if (!this.hasLiveApi) {
      return { available: false, reason: 'Canlı teklif API bağlantısı yok — yönlendirme talebi alınır' };
    }
    return { available: true, reason: '' };
  }

  /**
   * @param {object} _context
   * @returns {{ ctaLabel: string, interestType: string, microcopy: string }}
   */
  buildCta(_context = {}) {
    return {
      ctaLabel: `${this.label} talebi`,
      interestType: 'vehicle_offer',
      microcopy: 'Bağlayıcı teklif değil — partner yönlendirmesi'
    };
  }
}
