import API from '../../core/api.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { AFFILIATE_DEFAULTS, FREE_LIMITS, PLANS, PRO_FEATURES } from './plans.js';

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

function hasActiveReferralPro(entitlements = {}) {
  const until = entitlements?.pro_until;
  if (!until) return false;
  return new Date(until).getTime() > Date.now();
}

export class RevenueManager {
  constructor() {
    this.subscription = null;
    this.referralEntitlements = {};
    this.isPremium = false;
    this.trialEligible = true;
    this.selectedBilling = 'monthly';
    this.loading = false;
  }

  async refresh(userId) {
    if (!userId) {
      this.subscription = null;
      this.referralEntitlements = {};
      this.isPremium = false;
      this.trialEligible = true;
      return null;
    }

    this.loading = true;

    try {
      const [sub, trialEligible, profile] = await Promise.all([
        API.getSubscription(userId),
        API.isTrialEligible(userId),
        API.getProfile(userId).catch(() => null)
      ]);
      this.subscription = sub;
      this.referralEntitlements = profile?.referral_entitlements || {};
      const subPremium = Boolean(sub && ACTIVE_STATUSES.has(sub.status));
      const referralPremium = hasActiveReferralPro(this.referralEntitlements);
      this.isPremium = subPremium || referralPremium;
      this.trialEligible = trialEligible && !subPremium;

      if (typeof localStorage !== 'undefined') {
        if (this.isPremium) {
          localStorage.setItem(STORAGE_KEYS.PRO_ACTIVE, '1');
        } else {
          localStorage.removeItem(STORAGE_KEYS.PRO_ACTIVE);
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
        return Boolean(this.referralEntitlements?.premium_explanation_unlock);
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
    const bonus = Number(this.referralEntitlements?.extra_auto_analyses || 0);
    return this.isPremium ? 999 : FREE_LIMITS.maxAutoResultsPreview + bonus;
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
          <button type="button" class="btn btn-primary" data-upgrade-checkout data-billing="monthly" data-trial="1" data-analytics-cta="cta_primary_checkout" data-analytics-placement="paywall_banner">${this.getCheckoutCtaLabel()}</button>
          <a href="/planlar" class="btn btn-outline" data-native-route data-analytics-cta="cta_secondary_plans" data-analytics-placement="paywall_banner">Planları incele</a>
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
            <button type="button" class="btn btn-primary" data-upgrade-checkout data-billing="monthly" data-trial="1" data-analytics-cta="cta_primary_checkout" data-analytics-placement="paywall_compact">${this.getCheckoutCtaLabel()}</button>
            <button type="button" class="btn btn-outline" data-revenue-paywall-close>Şimdilik ücretsiz devam et</button>
          </div>
          <p class="revenue-paywall-note">İstediğiniz zaman iptal edebilirsiniz. Ödeme Stripe ile güvenli şekilde alınır.</p>
        </div>
      </div>
    `;
  }

  mountPaywall(feature) {
    import('./upsell-engine.js').then(({ trackUpsellClick, UPSELL_OFFERS }) => {
      const match = Object.values(UPSELL_OFFERS).find((o) => o.paywallKey === feature);
      if (match) {
        trackUpsellClick(match.id, 'paywall_modal', { feature });
      }
    }).catch(() => {});

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
        title: 'Maliyet gerekçesini tam metin görün',
        body: 'Pro, TCO ve skor kartlarına dayalı şeffaf AI özeti sunar — sıralamayı değiştirmez, kararınızı netleştirir.'
      },
      default: {
        title: 'Toplam maliyeti Pro ile derinleştirin',
        body: 'Sınırsız TCO karşılaştırma, premium rapor ve öncelikli partner yönlendirmesi tek abonelikte.'
      }
    };

    return map[reason] || map.default;
  }

  getCheckoutCtaLabel(billing = this.selectedBilling) {
    const plan = PLANS.pro.billing[billing] || PLANS.pro.billing.monthly;

    if (this.trialEligible) {
      return PLANS.pro.trialLabel;
    }

    return plan.checkoutLabel;
  }

  getSelectedBillingOption() {
    return PLANS.pro.billing[this.selectedBilling] || PLANS.pro.billing.monthly;
  }

  renderPricingCards({ layout = 'default' } = {}) {
    const monthly = PLANS.pro.billing.monthly;
    const annual = PLANS.pro.billing.annual;
    const trialBadge = this.trialEligible
      ? `<span class="revenue-trial-badge">${PLANS.pro.trialLabel}</span>`
      : '';
    const enterprise = PLANS.enterprise;

    const billingToggle = `
      <div class="revenue-billing-toggle" role="radiogroup" aria-label="Faturalama dönemi">
        <label class="revenue-billing-option">
          <input type="radio" name="billing-interval" value="monthly" checked>
          <span>${monthly.label}</span>
          <strong>${monthly.priceDisplay}<small>${monthly.periodLabel}</small></strong>
        </label>
        <label class="revenue-billing-option revenue-billing-option--annual">
          <input type="radio" name="billing-interval" value="annual">
          <span>${annual.label} <em>${annual.savingsLabel}</em></span>
          <strong>${annual.priceDisplay}<small>${annual.periodLabel}</small></strong>
          <small class="revenue-billing-equiv">${annual.monthlyEquivalent}</small>
        </label>
      </div>`;

    const enterpriseCard = enterprise ? `
        <article class="revenue-plan-card revenue-plan-card--enterprise">
          <span class="revenue-plan-badge">Kurumsal</span>
          <h3>${enterprise.name}</h3>
          <p class="revenue-plan-price">${enterprise.priceLabel}</p>
          <p class="revenue-plan-desc">${enterprise.description}</p>
          <ul>${enterprise.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
          <a href="${enterprise.contactHref}" class="btn btn-outline">${enterprise.cta}</a>
        </article>` : '';

    const gridClass = layout === 'premium'
      ? 'revenue-pricing-grid revenue-pricing-grid--triple'
      : 'revenue-pricing-grid';

    return `
      ${billingToggle}
      <div class="${gridClass}">
        <article class="revenue-plan-card">
          <span class="revenue-plan-badge">Bireysel</span>
          <h3>${PLANS.free.name}</h3>
          <p class="revenue-plan-price">${PLANS.free.priceLabel}</p>
          <p class="revenue-plan-desc">${PLANS.free.description}</p>
          <ul>${PLANS.free.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
          <a href="/auto/" class="btn btn-outline" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_dynamic_free">Ücretsiz maliyet analizi</a>
        </article>
        <article class="revenue-plan-card revenue-plan-card--featured">
          <span class="revenue-plan-badge revenue-plan-badge--pro">Önerilen</span>
          ${trialBadge}
          <h3>${PLANS.pro.name}</h3>
          <p class="revenue-plan-price" data-revenue-price-display>${monthly.priceDisplay}<small data-revenue-price-period>${monthly.periodLabel}</small></p>
          <p class="revenue-plan-equiv" data-revenue-price-equiv hidden>${annual.monthlyEquivalent} · ${annual.savingsLabel}</p>
          <p class="revenue-plan-desc">${PLANS.pro.description}</p>
          <ul>${PLANS.pro.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>
          <button type="button" class="btn btn-primary" data-upgrade-checkout data-billing="monthly" data-trial="1" data-revenue-checkout-cta data-analytics-cta="cta_primary_checkout" data-analytics-placement="pricing_dynamic_pro">${this.getCheckoutCtaLabel('monthly')}</button>
          <p class="revenue-plan-hint">${PLANS.pro.priceHint}${this.trialEligible ? ` · İlk abonelikte ${PLANS.pro.trialDays} gün ücretsiz` : ''}</p>
        </article>
        ${enterpriseCard}
      </div>
      <p class="revenue-risk-reversal" role="note">
        <span>7 gün ücretsiz deneme</span>
        <span>Stripe ile güvenli ödeme</span>
        <span>İstediğiniz zaman iptal</span>
        <span>Skorlar bilgilendirme amaçlıdır</span>
      </p>
      <p class="pricing-trust-note" role="note">
        Analiz ve uyum skorları metodolojik destek sunar; kesin sonuç veya getiri taahhüdü değildir.
        <a href="/kvkk.html">KVKK</a> · <a href="/gizlilik.html">Gizlilik</a> · <a href="/metodoloji">Metodoloji</a>
      </p>
    `;
  }

  initPricingControls(root = document.getElementById('pricing-plans-root')) {
    if (!root) return;

    const radios = root.querySelectorAll('input[name="billing-interval"]');
    const priceDisplay = root.querySelector('[data-revenue-price-display]');
    const pricePeriod = root.querySelector('[data-revenue-price-period]');
    const priceEquiv = root.querySelector('[data-revenue-price-equiv]');
    const checkoutCta = root.querySelector('[data-revenue-checkout-cta]');

    const sync = () => {
      const selected = root.querySelector('input[name="billing-interval"]:checked')?.value || 'monthly';
      this.selectedBilling = selected;
      const plan = this.getSelectedBillingOption();

      if (priceDisplay) {
        priceDisplay.innerHTML = `${plan.priceDisplay}<small data-revenue-price-period>${plan.periodLabel}</small>`;
      }

      if (priceEquiv) {
        if (selected === 'annual') {
          priceEquiv.textContent = `${PLANS.pro.billing.annual.monthlyEquivalent} · ${PLANS.pro.billing.annual.savingsLabel}`;
          priceEquiv.hidden = false;
        } else {
          priceEquiv.hidden = true;
        }
      }

      if (checkoutCta) {
        checkoutCta.textContent = this.getCheckoutCtaLabel(selected);
        checkoutCta.dataset.billing = selected;
      }
    };

    radios.forEach((radio) => {
      radio.addEventListener('change', sync);
    });

    sync();
  }

  renderProfileSubscriptionBlock() {
    const status = this.subscription?.status;
    const canManage = ['active', 'trialing', 'past_due', 'canceled'].includes(status);

    if (this.isPremium || status === 'past_due') {
      const end = this.subscription?.current_period_end
        ? new Date(this.subscription.current_period_end).toLocaleDateString('tr-TR')
        : null;
      const isTrialing = status === 'trialing';
      const isPastDue = status === 'past_due';

      return `
        <div class="revenue-subscription-card revenue-subscription-card--active${isPastDue ? ' revenue-subscription-card--past-due' : ''}">
          <span class="revenue-upgrade-kicker">${isPastDue ? 'Ödeme gerekli' : isTrialing ? 'Deneme süresi' : 'Aktif abonelik'}</span>
          <h3>isteBul Pro</h3>
          <p>${isPastDue
            ? 'Son ödeme alınamadı. Stripe panelinden kartınızı güncelleyin veya planınızı yönetin.'
            : isTrialing
              ? `${PLANS.pro.trialDays} günlük ücretsiz deneme aktif. Deneme bitiminde seçtiğiniz plan üzerinden ücretlendirilirsiniz.`
              : `Tüm premium özellikler açık${end ? ` · Dönem sonu: ${end}` : ''}.`}</p>
          ${canManage ? `
          <button type="button" class="btn btn-primary" data-billing-portal>Aboneliği yönet</button>
          <p class="revenue-plan-hint">Kart güncelle · faturalar · plan değiştir · iptal — Stripe panelinde</p>
          ` : ''}
        </div>
      `;
    }

    return `
      <div class="revenue-subscription-card">
        <span class="revenue-upgrade-kicker">Yükseltme</span>
        <h3>Pro ile daha hızlı karar verin</h3>
        <p>Sınırsız karşılaştırma, premium rapor ve öncelikli partner yönlendirmesi.${this.trialEligible ? ` İlk kez abone olanlara <strong>${PLANS.pro.trialDays} gün ücretsiz</strong>.` : ''}</p>
        <div class="revenue-profile-billing">
          <label><input type="radio" name="profile-billing-interval" value="monthly" checked> Aylık (${PLANS.pro.billing.monthly.priceDisplay})</label>
          <label><input type="radio" name="profile-billing-interval" value="annual"> Yıllık (${PLANS.pro.billing.annual.savingsLabel})</label>
        </div>
        <button type="button" class="btn btn-primary" id="premium-checkout-btn" data-upgrade-checkout data-billing="monthly" data-trial="1" data-analytics-cta="cta_primary_checkout" data-analytics-placement="profile_upgrade">${this.getCheckoutCtaLabel('monthly')}</button>
        <a href="/planlar" class="btn btn-ghost btn-sm" data-native-route>Plan detayları</a>
      </div>
    `;
  }

  initProfileBillingControls(root = document.getElementById('profil')) {
    if (!root) return;

    const checkoutBtn = root.querySelector('#premium-checkout-btn[data-upgrade-checkout]');
    const radios = root.querySelectorAll('input[name="profile-billing-interval"]');

    if (!checkoutBtn || !radios.length) return;

    const sync = () => {
      const selected = root.querySelector('input[name="profile-billing-interval"]:checked')?.value || 'monthly';
      this.selectedBilling = selected;
      checkoutBtn.dataset.billing = selected;
      checkoutBtn.textContent = this.getCheckoutCtaLabel(selected);
    };

    radios.forEach((radio) => radio.addEventListener('change', sync));
    sync();
  }
}

export const revenueManager = new RevenueManager();
export default revenueManager;
