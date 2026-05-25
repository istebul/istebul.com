/**
 * Contextual upsell engine — placement-aware Pro offers without modal spam.
 */
import { analytics } from '../../core/analytics.js';
import { trackProUpsellImpression } from '../revenue/revenue-ops-client.js';
import { revenueManager } from './revenue-manager.js';
import { FREE_LIMITS, PLANS } from './plans.js';

const SESSION_PREFIX = 'istebul_upsell';
const MAX_VIEWS_PER_SESSION = 5;
const LAST_ATTRIBUTION_KEY = `${SESSION_PREFIX}:last_click`;

export const UPSELL_OFFERS = Object.freeze({
  advanced_ai_summary: {
    id: 'advanced_ai_summary',
    feature: 'advanced_ai_summary',
    title: 'Detaylı AI danışman özeti',
    body: 'Pro ile rafine yorumlar, chip önerileri ve şeffaf gerekçe metni açın — skor ve fiyat kural motorundan gelir.',
    cta: 'Danışmanı aç',
    paywallKey: 'ai_summary'
  },
  comparison_unlimited: {
    id: 'comparison_unlimited',
    feature: 'comparison_unlimited',
    title: 'Gelişmiş karşılaştırma',
    body: `Ücretsiz planda ${FREE_LIMITS.maxComparisons} model. Pro ile 4 modele kadar yan yana TCO ve skor analizi.`,
    cta: 'Karşılaştırmayı genişlet',
    paywallKey: 'comparison'
  },
  decision_export: {
    id: 'decision_export',
    feature: 'decision_export',
    title: 'PDF export',
    body: 'Karar özetinizi paylaşılabilir PDF olarak indirin — danışman veya eşinizle kolay paylaşım.',
    cta: 'Export\'u aç',
    paywallKey: 'premium_report'
  },
  advisor_mode: {
    id: 'advisor_mode',
    feature: 'advanced_ai_summary',
    title: 'Advisor mode',
    body: 'Özel sorularla yorumu yeniden şekillendirin; Pro danışman modu bağlamınızı hatırlar.',
    cta: 'Advisor\'ı dene',
    paywallKey: 'ai_summary'
  },
  decision_history: {
    id: 'decision_history',
    feature: 'decision_export',
    title: 'Geçmiş karar kayıtları',
    body: 'Tüm Auto ve karar asistanı oturumlarınızı saklayın, tekrar açın ve karşılaştırın.',
    cta: 'Geçmişi aç',
    paywallKey: 'default'
  },
  premium_finance: {
    id: 'premium_finance',
    feature: 'premium_report',
    title: 'Premium finans analizi',
    body: 'Banka senaryolarını Pro raporuyla birleştirin: aylık yük, toplam geri ödeme ve hassasiyet notları.',
    cta: 'Finans Pro\'yu gör',
    paywallKey: 'premium_report'
  }
});

function sessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function viewCount() {
  return Number(sessionGet(`${SESSION_PREFIX}:views`) || 0);
}

function bumpViewCount() {
  sessionSet(`${SESSION_PREFIX}:views`, String(viewCount() + 1));
}

export function shouldShowUpsell(offerId) {
  if (revenueManager.isPremium) return false;
  if (!UPSELL_OFFERS[offerId]) return false;
  if (sessionGet(`${SESSION_PREFIX}:seen:${offerId}`)) return false;
  if (viewCount() >= MAX_VIEWS_PER_SESSION) return false;
  return true;
}

export function trackUpsellView(offerId, placement, properties = {}) {
  const offer = UPSELL_OFFERS[offerId];
  if (!offer) return;

  sessionSet(`${SESSION_PREFIX}:seen:${offerId}`, '1');
  bumpViewCount();

  analytics.track(
    'upsell_view',
    { offer_id: offerId, placement, feature: offer.feature, ...properties },
    {
      category: 'revenue',
      funnel: 'upsell',
      funnel_step: placement,
      force: false
    }
  );
  trackProUpsellImpression({ placement, offer_id: offerId });
}

export function rememberUpsellClick(offerId, placement) {
  sessionSet(
    LAST_ATTRIBUTION_KEY,
    JSON.stringify({
      offer_id: offerId,
      placement,
      at: new Date().toISOString()
    })
  );
}

export function trackUpsellClick(offerId, placement, properties = {}) {
  const offer = UPSELL_OFFERS[offerId];
  if (!offer) return;

  rememberUpsellClick(offerId, placement);

  analytics.track(
    'upsell_click',
    { offer_id: offerId, placement, feature: offer.feature, ...properties },
    {
      category: 'revenue',
      funnel: 'upsell',
      funnel_step: `${placement}:click`
    }
  );
}

export function trackUpsellConversion(offerId, placement, properties = {}) {
  const offer = UPSELL_OFFERS[offerId];
  analytics.track(
    'upsell_conversion',
    {
      offer_id: offerId,
      placement: placement || 'unknown',
      feature: offer?.feature,
      ...properties
    },
    {
      category: 'revenue',
      funnel: 'upsell',
      funnel_step: 'conversion'
    }
  );
  sessionSet(LAST_ATTRIBUTION_KEY, '');
}

export function flushUpsellConversion(extra = {}) {
  if (!revenueManager.isPremium) return;

  const raw = sessionGet(LAST_ATTRIBUTION_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    if (parsed?.offer_id) {
      trackUpsellConversion(parsed.offer_id, parsed.placement, extra);
    }
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} offerId
 * @param {string} placement
 */
export function renderContextualUpsellCard(offerId, placement) {
  const offer = UPSELL_OFFERS[offerId];
  if (!offer || !shouldShowUpsell(offerId)) return '';

  return `
    <aside class="contextual-upsell" data-contextual-upsell data-upsell-offer="${offer.id}" data-upsell-placement="${placement}" role="complementary">
      <div class="contextual-upsell-body">
        <span class="contextual-upsell-kicker">isteBul Pro · ${PLANS.pro.trialLabel}</span>
        <h4>${offer.title}</h4>
        <p>${offer.body}</p>
        <div class="contextual-upsell-actions">
          <button type="button" class="btn btn-primary btn-sm" data-upsell-cta data-upsell-action="checkout">${offer.cta}</button>
          <a href="/planlar" class="btn btn-outline btn-sm" data-upsell-cta data-upsell-action="plans">Planlar</a>
          <button type="button" class="contextual-upsell-dismiss" data-upsell-dismiss aria-label="Kapat">×</button>
        </div>
      </div>
    </aside>
  `;
}

/**
 * @param {ParentNode} root
 * @param {{ onCheckout?: () => void }} [options]
 */
export function bindContextualUpsell(root, options = {}) {
  if (!root) return;

  root.querySelectorAll('[data-contextual-upsell]').forEach((card) => {
    const offerId = card.dataset.upsellOffer;
    const placement = card.dataset.upsellPlacement || 'unknown';
    if (!offerId || card.dataset.upsellBound === '1') return;

    card.dataset.upsellBound = '1';
    trackUpsellView(offerId, placement);

    card.querySelector('[data-upsell-dismiss]')?.addEventListener('click', () => {
      card.remove();
    });

    card.querySelectorAll('[data-upsell-cta]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const offer = UPSELL_OFFERS[offerId];
        if (!offer) return;

        trackUpsellClick(offerId, placement, {
          action: btn.dataset.upsellAction || 'checkout'
        });

        if (btn.dataset.upsellAction === 'plans') {
          return;
        }

        event.preventDefault();
        if (typeof options.onCheckout === 'function') {
          options.onCheckout(offer);
          return;
        }

        openUpsellCheckout(offerId, placement, { feature: offer.paywallKey });
      });
    });
  });
}

/**
 * @param {string} offerId
 * @param {string} placement
 * @param {{ feature?: string, modal?: boolean }} [options]
 */
export function openUpsellCheckout(offerId, placement, options = {}) {
  const offer = UPSELL_OFFERS[offerId];
  if (!offer) return;

  trackUpsellClick(offerId, placement, { surface: 'checkout' });

  if (options.modal !== false && options.feature) {
    revenueManager.mountPaywall(options.feature || offer.paywallKey);
    return;
  }

  window.location.assign('/planlar?checkout=pro');
}

/**
 * Compact feature chips for results footer (max 3).
 * @param {string} placement
 */
export function renderUpsellFeatureChips(placement = 'auto_results') {
  if (revenueManager.isPremium || viewCount() >= MAX_VIEWS_PER_SESSION) return '';

  const ids = ['advanced_ai_summary', 'comparison_unlimited', 'premium_finance'];
  return `
    <div class="contextual-upsell-chips" data-upsell-chips data-upsell-placement="${placement}">
      <span class="contextual-upsell-chips-label">Pro ile açılır</span>
      ${ids.map((id) => {
        const offer = UPSELL_OFFERS[id];
        return `<button type="button" class="contextual-upsell-chip" data-upsell-chip="${id}">${offer.title}</button>`;
      }).join('')}
    </div>
  `;
}

export function bindUpsellFeatureChips(root) {
  if (!root) return;

  root.querySelectorAll('[data-upsell-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const offerId = chip.dataset.upsellChip;
      const placement =
        chip.closest('[data-upsell-placement]')?.dataset?.upsellPlacement || 'auto_results';
      const offer = UPSELL_OFFERS[offerId];
      if (!offer) return;

      const host = chip.closest('[data-upsell-chips]');
      if (host && !host.nextElementSibling?.matches('[data-contextual-upsell]')) {
        const card = document.createElement('div');
        card.innerHTML = renderContextualUpsellCard(offerId, placement);
        const el = card.firstElementChild;
        if (el) {
          host.insertAdjacentElement('afterend', el);
          bindContextualUpsell(host.parentElement);
        }
      } else {
        openUpsellCheckout(offerId, placement, { feature: offer.paywallKey, modal: true });
      }
    });
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('revenueStateChanged', (event) => {
    if (event.detail?.isPremium) {
      flushUpsellConversion({ source: 'revenue_state' });
    }
  });
}
