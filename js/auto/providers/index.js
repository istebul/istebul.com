import { FinanceProviderAdapter } from './finance-provider.js';
import { InsuranceProviderAdapter } from './insurance-provider.js';
import { AdvisorProviderAdapter } from './advisor-provider.js';
import { DealerProviderAdapter } from './dealer-provider.js';

const PROVIDERS = [
  new FinanceProviderAdapter(),
  new InsuranceProviderAdapter(),
  new AdvisorProviderAdapter(),
  new DealerProviderAdapter()
];

export function getAutoProviders() {
  return PROVIDERS;
}

/**
 * @param {object} context
 * @param {(s: string) => string} escapeHtml
 */
export function renderProviderCtaStrip(context = {}, escapeHtml = (s) => String(s ?? '')) {
  const esc = escapeHtml;
  const vehicle = context.vehicleName || 'Seçilen model';

  return `
    <section class="ib-auto-provider-strip" aria-label="Partner köprüsü" data-auto-provider-strip>
      <header>
        <h4>Karar sonrası adımlar</h4>
        <p class="text-muted-sm">Canlı teklif gösterilmez — talep toplanır, partner yönlendirmesi şeffaftır.</p>
      </header>
      <div class="ib-auto-provider-grid">
        ${PROVIDERS.map((provider) => {
          const avail = provider.availability();
          const cta = provider.buildCta(context);
          return `
          <article class="ib-auto-provider-card" data-provider="${esc(provider.id)}">
            <h5>${esc(provider.label)}</h5>
            <p class="text-muted-sm">${esc(avail.reason || cta.microcopy)}</p>
            <button
              type="button"
              class="btn secondary auto-interest-btn ib-auto-provider-cta"
              data-interest="${esc(cta.interestType)}"
              data-vehicle="${esc(vehicle)}"
              data-provider-id="${esc(provider.id)}"
              ${avail.available ? '' : 'data-provider-placeholder="1"'}
            >
              ${esc(cta.ctaLabel)}
            </button>
          </article>`;
        }).join('')}
      </div>
    </section>`;
}
