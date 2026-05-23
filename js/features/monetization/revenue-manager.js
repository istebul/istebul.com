import API from '../../core/api.js';
import { AFFILIATE_DEFAULTS, FREE_LIMITS, PLANS, PRO_FEATURES } from './plans.js';

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export class RevenueManager {
  constructor() {
    this.subscription = null;
    this.isPremium = false;
    this.loading = false;
  }

  async refresh(userId) {
    if (!userId) {
      this.subscription = null;
      this.isPremium = false;
      return null;
    }

    this.loading = true;

    try {
      const sub = await API.getSubscription(userId);
      this.subscription = sub;
      this.isPremium = Boolean(sub && ACTIVE_STATUSES.has(sub.status));

      if (typeof localStorage !== 'undefined') {
        if (this.isPremium) {
          localStorage.setItem('istebul_pro_active', '1');
        } else {
          localStorage.removeItem('istebul_pro_active');
        }
      }

      return sub;
    } catch {
      this.subscription = null;
      this.isPremium = false;
      return null;
    } finally {
      this.loading = false;
      document.dispatchEvent(new CustomEvent('revenueStateChanged', {
        detail: { isPremium: this.isPremium, subscription: this.subscription }
      }));
    }
  }

  canAccess(feature) {
    if (this.isPremium) return true;

    switch (feature) {
      case 'comparison_unlimited':
        return false;
      case 'premium_report':
      case 'advanced_ai_summary':
      case 'priority_partner':
      case 'decision_export':
        return false;
      default:
        return true;
    }
  }

  getComparisonLimit() {
    return this.isPremium ? 4 : FREE_LIMITS.maxComparisons;
  }

  getAutoResultsLimit() {
    return this.isPremium ? 999 : FREE_LIMITS.maxAutoResultsPreview;
  }

  getFeatureLabel(feature) {
    return PRO_FEATURES[feature] || 'Pro özellik';
  }

  buildAffiliateUrl(url, options = {}) {
    if (!url || typeof url !== 'string') return url;

    try {
      const parsed = new URL(url, window.location.origin);
      const host = parsed.hostname;

      if (!/^https?:$/i.test(parsed.protocol)) {
        return url;
      }

      parsed.searchParams.set('utm_source', options.source || AFFILIATE_DEFAULTS.source);
      parsed.searchParams.set('utm_medium', options.medium || AFFILIATE_DEFAULTS.medium);
      parsed.searchParams.set('utm_campaign', options.campaign || AFFILIATE_DEFAULTS.campaign);

      if (options.content) {
        parsed.searchParams.set('utm_content', options.content);
      }

      if (host.includes('sahibinden')) {
        parsed.searchParams.set('utm_term', options.term || 'listing_cta');
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  renderUpgradeBanner(reason = 'default', { compact = false } = {}) {
    const copy = this.getUpgradeCopy(reason);

    return `
      <aside class="revenue-upgrade-banner${compact ? ' revenue-upgrade-banner--compact' : ''}" data-revenue-banner="${reason}">
        <div class="revenue-upgrade-copy">
          <span class="revenue-upgrade-kicker">isteBul Pro</span>
          <strong>${copy.title}</strong>
          <p>${copy.body}</p>
        </div>
        <div class="revenue-upgrade-actions">
          <button type="button" class="btn btn-primary" data-upgrade-checkout>${PLANS.pro.cta}</button>
          <a href="/#pricing" class="btn btn-outline" data-native-route>Planları incele</a>
        </div>
      </aside>
    `;
  }

  renderPaywallModal(feature) {
    const label = this.getFeatureLabel(feature);

    return `
      <div class="revenue-paywall" role="dialog" aria-labelledby="revenue-paywall-title">
        <div class="revenue-paywall-card">
          <button type="button" class="revenue-paywall-close" data-revenue-paywall-close aria-label="Kapat">×</button>
          <span class="revenue-upgrade-kicker">Pro özellik</span>
          <h3 id="revenue-paywall-title">${label}</h3>
          <p>Bu özellik Pro abonelik ile açılır. Karar sürecinizi hızlandırır ve partner eşleşmesinde öncelik sağlar.</p>
          <ul class="revenue-paywall-list">
            ${PLANS.pro.highlights.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}
          </ul>
          <div class="revenue-upgrade-actions">
            <button type="button" class="btn btn-primary" data-upgrade-checkout>${PLANS.pro.cta}</button>
            <button type="button" class="btn btn-outline" data-revenue-paywall-close>Şimdilik ücretsiz devam et</button>
          </div>
          <p class="revenue-paywall-note">İstediğiniz zaman iptal edebilirsiniz. Ödeme Stripe ile güvenli şekilde alınır.</p>
        </div>
      </div>
    `;
  }

  mountPaywall(feature) {
    const existing = document.getElementById('revenue-paywall-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'revenue-paywall-root';
    root.innerHTML = this.renderPaywallModal(feature);
    document.body.appendChild(root);
    document.body.classList.add('revenue-paywall-open');

    const close = () => {
      root.remove();
      document.body.classList.remove('revenue-paywall-open');
    };

    root.querySelectorAll('[data-revenue-paywall-close]').forEach((el) => {
      el.addEventListener('click', close);
    });

    root.addEventListener('click', (event) => {
      if (event.target === root.firstElementChild?.parentElement || event.target.classList.contains('revenue-paywall')) {
        close();
      }
    });
  }

  getUpgradeCopy(reason) {
    const map = {
      premium_report: {
        title: 'Detaylı karar raporunu açın',
        body: 'Pro ile PDF benzeri özet, finansman senaryoları ve öncelikli partner yönlendirmesi alın.'
      },
      comparison: {
        title: 'Daha fazla aracı yan yana karşılaştırın',
        body: `Ücretsiz planda ${FREE_LIMITS.maxComparisons} araç karşılaştırabilirsiniz. Pro ile 4\'e kadar detaylı analiz.`
      },
      ai_summary: {
        title: 'Gelişmiş AI karar özetini görün',
        body: 'Pro, karşılaştırmalı senaryo yorumu ve aksiyon önerilerini tam metin sunar.'
      },
      default: {
        title: 'Karar sürecinizi Pro ile hızlandırın',
        body: 'Sınırsız karşılaştırma, premium rapor ve öncelikli partner eşleşmesi tek abonelikte.'
      }
    };

    return map[reason] || map.default;
  }

  renderPricingCards() {
    return `
      <div class="revenue-pricing-grid">
        <article class="revenue-plan-card">
          <span class="revenue-plan-badge">Bireysel</span>
          <h3>${PLANS.free.name}</h3>
          <p class="revenue-plan-price">${PLANS.free.priceLabel}</p>
          <p class="revenue-plan-desc">${PLANS.free.description}</p>
          <ul>${PLANS.free.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
          <a href="/auto" class="btn btn-outline" data-native-route>Analize başla</a>
        </article>
        <article class="revenue-plan-card revenue-plan-card--featured">
          <span class="revenue-plan-badge revenue-plan-badge--pro">Önerilen</span>
          <h3>${PLANS.pro.name}</h3>
          <p class="revenue-plan-price">${PLANS.pro.priceLabel}</p>
          <p class="revenue-plan-desc">${PLANS.pro.description}</p>
          <ul>${PLANS.pro.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
          <button type="button" class="btn btn-primary" data-upgrade-checkout>${PLANS.pro.cta}</button>
          <p class="revenue-plan-hint">${PLANS.pro.priceHint}</p>
        </article>
      </div>
    `;
  }

  renderProfileSubscriptionBlock() {
    if (this.isPremium) {
      const end = this.subscription?.current_period_end
        ? new Date(this.subscription.current_period_end).toLocaleDateString('tr-TR')
        : null;

      return `
        <div class="revenue-subscription-card revenue-subscription-card--active">
          <span class="revenue-upgrade-kicker">Aktif abonelik</span>
          <h3>isteBul Pro</h3>
          <p>Tüm premium özellikler açık${end ? ` · Dönem sonu: ${end}` : ''}.</p>
          <button type="button" class="btn btn-outline" id="premium-checkout-btn">Aboneliği yönet</button>
        </div>
      `;
    }

    return `
      <div class="revenue-subscription-card">
        <span class="revenue-upgrade-kicker">Yükseltme</span>
        <h3>Pro ile daha hızlı karar verin</h3>
        <p>Sınırsız karşılaştırma, premium rapor ve öncelikli partner yönlendirmesi.</p>
        <button type="button" class="btn btn-primary" id="premium-checkout-btn" data-upgrade-checkout>${PLANS.pro.cta}</button>
        <a href="/#pricing" class="btn btn-ghost btn-sm" data-native-route>Plan detayları</a>
      </div>
    `;
  }
}

export const revenueManager = new RevenueManager();
export default revenueManager;
