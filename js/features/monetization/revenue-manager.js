import API from '../../core/api.js';
import { STORAGE_KEYS } from '../../core/storage-keys.js';
import { renderFeatureComparisonCards } from './pricing-comparison.js';
import {
  buildRoiSummaryCopy,
  calculatePricingRoi,
  formatTry,
  getAnnualSavingsFacts,
  PRICING_ROI_DEFAULTS
} from './pricing-roi.js';
import { AFFILIATE_DEFAULTS, FREE_LIMITS, PLANS, PRICING_MESSAGING, PRO_FEATURES } from './plans.js';
import { applyLocalizedPricingToPlans } from './pricing-localization.js';
import { isProSubscriptionStatus } from '../billing/pro-features.js';

function pt(key, vars = {}, fallback = '') {
  const fullKey = `pricingDynamic.${key}`;
  const translated = typeof window !== 'undefined' ? window.__ibI18n?.t(fullKey, vars) : null;
  if (translated && translated !== fullKey) return translated;
  return fallback || key;
}

function ptHighlights(key, fallback = []) {
  if (typeof window === 'undefined') return fallback;
  const lang = window.__ibI18n?.currentLang || 'tr';
  const list = window.__ibI18n?.translations?.[lang]?.pricingDynamic?.[key];
  return Array.isArray(list) && list.length ? list : fallback;
}

function ptMarketing(key, fallback = '') {
  const translated = typeof window !== 'undefined' ? window.__ibI18n?.t(key) : null;
  if (translated && translated !== key) return translated;
  return fallback;
}

function getLocalizedPlans() {
  const localeId = typeof window !== 'undefined' ? window.__ibI18n?.currentLang || 'tr' : 'tr';
  return applyLocalizedPricingToPlans(PLANS, localeId);
}

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

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
      const profilePremium =
        profile?.plan === 'pro' && isProSubscriptionStatus(profile?.subscription_status);
      this.isPremium = subPremium || referralPremium || profilePremium;
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
      case 'comparison_advanced':
        return false;
      case 'premium_report':
      case 'premium_pdf_report':
      case 'pdf_history':
      case 'scenario_analysis':
      case 'unlimited_analysis':
      case 'favorites_history':
        return false;
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

  renderPricingRoiCalculator(billing = this.selectedBilling) {
    const result = calculatePricingRoi({
      purchaseBudget: PRICING_ROI_DEFAULTS.purchaseBudget,
      costDriftPercent: PRICING_ROI_DEFAULTS.costDriftPercent,
      billing
    });
    const summary = buildRoiSummaryCopy(result, {
      t: (key, vars) => pt(key, vars),
      formatAmount: formatTry
    });
    const savings = getAnnualSavingsFacts();

    return `
      <section class="revenue-roi-panel" data-pricing-roi-panel aria-labelledby="pricing-roi-title">
        <div class="revenue-roi-panel-head">
          <h3 id="pricing-roi-title">${pt('roiTitle', {}, PRICING_MESSAGING.roiTitle)}</h3>
          <p class="revenue-roi-panel-lead">${pt('roiLead', {}, 'Bütçeniz ve makul bir TCO sapması varsayımıyla Pro maliyetini yanlış seçim riskiyle kıyaslayın.')}</p>
        </div>
        <div class="revenue-roi-controls">
          <label class="revenue-roi-field">
            <span>${pt('budgetLabel', {}, 'Araç bütçesi (örnek)')}</span>
            <input type="range" min="${PRICING_ROI_DEFAULTS.budgetMin}" max="${PRICING_ROI_DEFAULTS.budgetMax}" step="${PRICING_ROI_DEFAULTS.budgetStep}" value="${PRICING_ROI_DEFAULTS.purchaseBudget}" data-roi-budget>
            <output data-roi-budget-display>${formatTry(PRICING_ROI_DEFAULTS.purchaseBudget)}</output>
          </label>
          <label class="revenue-roi-field">
            <span>${pt('driftLabel', {}, 'TCO sapması varsayımı')}</span>
            <input type="range" min="${PRICING_ROI_DEFAULTS.minPercent}" max="${PRICING_ROI_DEFAULTS.maxPercent}" step="0.5" value="${PRICING_ROI_DEFAULTS.costDriftPercent}" data-roi-drift>
            <output data-roi-drift-display>%${PRICING_ROI_DEFAULTS.costDriftPercent}</output>
          </label>
        </div>
        <div class="revenue-roi-results" data-roi-results>
          <div class="revenue-roi-stat">
            <span class="revenue-roi-stat-label">${pt('driftCostLabel', {}, 'Örnek sapma maliyeti')}</span>
            <strong data-roi-drift-cost>${formatTry(result.driftCost)}</strong>
          </div>
          <div class="revenue-roi-stat">
            <span class="revenue-roi-stat-label">${pt('proYearlyLabel', {}, 'Pro (yıllık, seçili dönem)')}</span>
            <strong data-roi-pro-cost>${formatTry(result.proYearlyCost)}</strong>
            <small data-roi-pro-monthly>${pt('proMonthlyApprox', { amount: formatTry(result.proMonthlyCost) }, `≈ ${formatTry(result.proMonthlyCost)} / ay`)}</small>
          </div>
        </div>
        <p class="revenue-roi-summary" data-roi-summary>${summary}</p>
        <p class="revenue-roi-savings" data-roi-savings hidden>
          ${pt(
            'annualSavings',
            { amount: formatTry(savings.savingsAmount), percent: savings.savingsPercent },
            `Yıllık faturalama: 12× aylık listeye göre ${formatTry(savings.savingsAmount)} daha az (${savings.savingsPercent}% — listelenen fiyatlar).`
          )}
        </p>
        <p class="revenue-roi-disclaimer">${pt('roiDisclaimer', {}, PRICING_MESSAGING.roiDisclaimer)}</p>
      </section>`;
  }

  renderPricingReassurance() {
    return `
      <div class="revenue-pricing-reassurance" role="region" aria-label="${pt('reassuranceAria', {}, 'Ödeme ve iptal güvencesi')}">
        <div class="revenue-pricing-reassurance-item">
          <strong>${pt('stripeTitle', {}, 'Stripe · PCI')}</strong>
          <p>${pt('stripeDesc', {}, 'Ödeme Stripe üzerinden; kart bilgileri sunucularımızda saklanmaz.')}</p>
        </div>
        <div class="revenue-pricing-reassurance-item">
          <strong>${pt('cancelTitle', {}, 'İptal')}</strong>
          <p>${pt('cancelDescHtml', {}, 'Aboneliği Stripe müşteri panelinden veya hesabınızdan istediğiniz zaman sonlandırın. <a href="/abonelik-iptal.html">İptal rehberi</a>')}</p>
        </div>
        <div class="revenue-pricing-reassurance-item">
          <strong>${pt('trialTitle', {}, 'Deneme')}</strong>
          <p>${pt('trialDesc', { days: PLANS.pro.trialDays }, `İlk Pro aboneliğinde ${PLANS.pro.trialDays} gün ücretsiz; deneme bitiminde seçtiğiniz dönem ücretlendirilir — sürpriz yok.`)}</p>
        </div>
      </div>`;
  }

  getSelectedBillingOption() {
    const plans = getLocalizedPlans();
    return plans.pro.billing[this.selectedBilling] || plans.pro.billing.monthly;
  }

  renderPlanFeatureList(highlights = []) {
    return highlights
      .map(
        (h) =>
          `<li class="revenue-plan-feature"><span class="revenue-plan-feature-icon" aria-hidden="true">✓</span><span>${h}</span></li>`
      )
      .join('');
  }

  renderPricingCards({ layout = 'default' } = {}) {
    const plans = getLocalizedPlans();
    const monthly = plans.pro.billing.monthly;
    const annual = plans.pro.billing.annual;
    const savingsFacts = getAnnualSavingsFacts();
    const trialBadge = this.trialEligible
      ? `<span class="revenue-trial-badge">${ptMarketing('pricing.trialBadge', PLANS.pro.trialLabel)}</span>`
      : '';
    const enterprise = plans.enterprise;
    const roiBlock = this.renderPricingRoiCalculator(this.selectedBilling);
    const compareBlock = layout === 'premium' ? renderFeatureComparisonCards() : '';
    const reassuranceBlock = this.renderPricingReassurance();
    const freeHighlights = ptHighlights('freeHighlights', PLANS.free.highlights);
    const proHighlights = ptHighlights('proHighlights', PLANS.pro.highlights);
    const enterpriseHighlights = ptHighlights('enterpriseHighlights', enterprise?.highlights || []);

    const billingToggle = `
      <div class="revenue-billing-toggle" role="radiogroup" aria-label="${pt('billingToggleAria', {}, 'Faturalama dönemi')}">
        <label class="revenue-billing-option">
          <input type="radio" name="billing-interval" value="monthly" checked>
          <span>${pt('billingMonthly', {}, monthly.label)}</span>
          <strong>${monthly.priceDisplay}<small>${monthly.periodLabel}</small></strong>
        </label>
        <label class="revenue-billing-option revenue-billing-option--annual">
          <input type="radio" name="billing-interval" value="annual">
          <span>${pt('billingAnnual', {}, annual.label)} <em>${pt('billingAnnualSavings', {}, annual.savingsLabel)}</em></span>
          <strong>${annual.priceDisplay}<small>${annual.periodLabel}</small></strong>
          <small class="revenue-billing-equiv">${annual.monthlyEquivalent}${pt('billingAnnualEquiv', { twelveMonthly: formatTry(savingsFacts.twelveMonthly), annual: formatTry(savingsFacts.annual) }, ` · 12 ay ${formatTry(savingsFacts.twelveMonthly)} yerine ${formatTry(savingsFacts.annual)}`)}</small>
        </label>
      </div>`;

    const enterpriseCard = enterprise
      ? `
        <article class="revenue-plan-card revenue-plan-card--enterprise" role="listitem">
          <div class="revenue-plan-card-head">
            <span class="revenue-plan-badge">${pt('badgeEnterprise', {}, 'Kurumsal')}</span>
            <h3 class="revenue-plan-title">${pt('enterpriseName', {}, enterprise.name)}</h3>
            <p class="revenue-plan-price">${pt('enterprisePrice', {}, enterprise.priceLabel)}</p>
          </div>
          <p class="revenue-plan-desc">${pt('enterpriseDesc', {}, enterprise.description)}</p>
          <ul class="revenue-plan-features">${this.renderPlanFeatureList(enterpriseHighlights)}</ul>
          <div class="revenue-plan-card-foot">
            <a href="${enterprise.contactHref}" class="btn btn-outline btn-block">${pt('enterpriseCta', {}, enterprise.cta)}</a>
          </div>
        </article>`
      : '';

    const gridClass = 'revenue-pricing-grid revenue-pricing-grid--triple revenue-pricing-grid--cards';

    const planCards = `
      <div class="${gridClass}" role="list" aria-label="${pt('plansAria', {}, 'Plan seçenekleri')}">
        <article class="revenue-plan-card" role="listitem">
          <div class="revenue-plan-card-head">
            <span class="revenue-plan-badge">${pt('badgeIndividual', {}, 'Bireysel')}</span>
            <h3 class="revenue-plan-title">${pt('freeName', {}, plans.free.name)}</h3>
            <p class="revenue-plan-price">${pt('freePrice', {}, plans.free.priceLabel)}</p>
          </div>
          <p class="revenue-plan-desc">${pt('freeDesc', {}, plans.free.description)}</p>
          <ul class="revenue-plan-features">${this.renderPlanFeatureList(freeHighlights)}</ul>
          <div class="revenue-plan-card-foot">
            <a href="/auto/" class="btn btn-outline btn-block" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_dynamic_free">${pt('freeCta', {}, 'TCO analizini başlat')}</a>
          </div>
        </article>
        <article class="revenue-plan-card revenue-plan-card--featured" data-revenue-plan-pro role="listitem">
          <div class="revenue-plan-card-head">
            <span class="revenue-plan-badge revenue-plan-badge--popular">${pt('popularBadge', {}, PRICING_MESSAGING.popularBadge)}</span>
            ${trialBadge}
            <h3 class="revenue-plan-title">${pt('proName', {}, plans.pro.name)}</h3>
            <p class="revenue-plan-price" data-revenue-price-display>${monthly.priceDisplay}<small data-revenue-price-period>${monthly.periodLabel}</small></p>
            <p class="revenue-plan-equiv" data-revenue-price-equiv hidden>${annual.monthlyEquivalent} · ${pt('billingAnnualSavings', {}, annual.savingsLabel)}</p>
            <p class="revenue-plan-savings-fact" data-revenue-savings-fact hidden>${pt('savingsFact', { amount: formatTry(savingsFacts.savingsAmount) }, `12 aylık aylık ödemeye göre ${formatTry(savingsFacts.savingsAmount)} daha az (listelenen fiyat)`)}</p>
          </div>
          <p class="revenue-plan-desc">${pt('proDesc', {}, plans.pro.description)}</p>
          <ul class="revenue-plan-features">${this.renderPlanFeatureList(proHighlights)}</ul>
          <div class="revenue-plan-card-foot">
            <div class="revenue-plan-cta-stack">
              <button type="button" class="btn btn-primary btn-lg btn-block" data-upgrade-checkout data-billing="monthly" data-trial="1" data-revenue-checkout-cta data-analytics-cta="cta_primary_checkout" data-analytics-placement="pricing_dynamic_pro">${this.getCheckoutCtaLabel('monthly')}</button>
              <a href="/auto/" class="btn btn-ghost btn-sm" data-analytics-cta="cta_primary_auto" data-analytics-placement="pricing_pro_secondary">${pt('proSecondaryCta', {}, 'Önce ücretsiz TCO analizi')}</a>
            </div>
            <p class="revenue-plan-hint">${pt('proPriceHint', {}, PLANS.pro.priceHint)}${this.trialEligible ? pt('trialHint', { days: PLANS.pro.trialDays }, ` · İlk abonelikte ${PLANS.pro.trialDays} gün ücretsiz`) : ''}</p>
          </div>
        </article>
        ${enterpriseCard}
      </div>`;

    const trustFooter = `
      <p class="revenue-risk-reversal" role="note">
        <span>${pt('trustTrial', { days: PLANS.pro.trialDays }, `${PLANS.pro.trialDays} gün ücretsiz deneme (ilk abonelik)`)}</span>
        <span>${pt('trustStripe', {}, 'Stripe ile güvenli ödeme')}</span>
        <span>${pt('trustCancel', {}, 'Panelden iptal — taahhütsüz')}</span>
        <span>${pt('trustDisclaimer', {}, 'Skorlar bilgilendirme amaçlıdır')}</span>
      </p>
      <p class="pricing-trust-note" role="note">
        ${pt('trustNoteHtml', {}, 'Analiz ve uyum skorları metodolojik destek sunar; kesin sonuç veya getiri taahhüdü değildir. <a href="/kvkk.html">KVKK</a> · <a href="/gizlilik.html">Gizlilik</a> · <a href="/metodoloji">Metodoloji</a>')}
      </p>`;

    const shellModifier = layout === 'premium' ? 'ib-pricing-shell--page' : 'ib-pricing-shell--home';

    return `
      <div class="ib-pricing-shell ${shellModifier}" data-pricing-layout="${layout}">
        ${
          layout === 'premium'
            ? `<header class="ib-pricing-intro">
          <p class="revenue-pricing-value-prop">${pt('subhead', {}, PRICING_MESSAGING.subhead)}</p>
        </header>`
            : ''
        }
        <div class="ib-pricing-cards-stage">
          ${billingToggle}
          ${planCards}
        </div>
        <div class="ib-pricing-roi-stage">
          ${roiBlock}
        </div>
        ${compareBlock}
        ${layout === 'premium' ? '' : reassuranceBlock}
        ${
          layout === 'premium'
            ? `<p class="ib-pricing-compliance" role="note">
          ${pt('complianceHtml', {}, 'Skorlar bilgilendirme amaçlıdır; kesin sonuç veya getiri taahhüdü değildir. <a href="/kvkk.html">KVKK</a> · <a href="/gizlilik.html">Gizlilik</a> · <a href="/metodoloji">Metodoloji</a>')}
        </p>`
            : trustFooter
        }
      </div>`;
  }

  initPricingControls(root = document.getElementById('pricing-plans-root')) {
    if (!root) return;

    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('ib:pricing-rendered', { bubbles: true }));
    }

    const radios = root.querySelectorAll('input[name="billing-interval"]');
    const priceDisplay = root.querySelector('[data-revenue-price-display]');
    const priceEquiv = root.querySelector('[data-revenue-price-equiv]');
    const savingsFact = root.querySelector('[data-revenue-savings-fact]');
    const checkoutCta = root.querySelector('[data-revenue-checkout-cta]');
    const roiPanel = root.querySelector('[data-pricing-roi-panel]');

    const syncRoi = (billing) => {
      if (!roiPanel) return;

      const budgetInput = roiPanel.querySelector('[data-roi-budget]');
      const driftInput = roiPanel.querySelector('[data-roi-drift]');
      const purchaseBudget = Number(budgetInput?.value) || PRICING_ROI_DEFAULTS.purchaseBudget;
      const costDriftPercent = Number(driftInput?.value) || PRICING_ROI_DEFAULTS.costDriftPercent;
      const result = calculatePricingRoi({ purchaseBudget, costDriftPercent, billing });
      const savings = getAnnualSavingsFacts();

      const budgetOut = roiPanel.querySelector('[data-roi-budget-display]');
      const driftOut = roiPanel.querySelector('[data-roi-drift-display]');
      const driftCostEl = roiPanel.querySelector('[data-roi-drift-cost]');
      const proCostEl = roiPanel.querySelector('[data-roi-pro-cost]');
      const proMonthlyEl = roiPanel.querySelector('[data-roi-pro-monthly]');
      const summaryEl = roiPanel.querySelector('[data-roi-summary]');
      const savingsEl = roiPanel.querySelector('[data-roi-savings]');

      if (budgetOut) budgetOut.textContent = formatTry(purchaseBudget);
      if (driftOut) driftOut.textContent = `%${costDriftPercent}`;
      if (driftCostEl) driftCostEl.textContent = formatTry(result.driftCost);
      if (proCostEl) proCostEl.textContent = formatTry(result.proYearlyCost);
      if (proMonthlyEl) {
        proMonthlyEl.textContent = pt(
          'proMonthlyApprox',
          { amount: formatTry(result.proMonthlyCost) },
          `≈ ${formatTry(result.proMonthlyCost)} / ay`
        );
      }
      if (summaryEl) {
        summaryEl.textContent = buildRoiSummaryCopy(result, {
          t: (key, vars) => pt(key, vars),
          formatAmount: formatTry
        });
      }
      if (savingsEl) {
        savingsEl.hidden = billing !== 'annual';
        if (billing === 'annual') {
          savingsEl.textContent = pt(
            'annualSavings',
            { amount: formatTry(savings.savingsAmount), percent: savings.savingsPercent },
            `Yıllık faturalama: 12× aylık listeye göre ${formatTry(savings.savingsAmount)} daha az (${savings.savingsPercent}% — listelenen fiyatlar).`
          );
        }
      }
    };

    const sync = () => {
      const plans = getLocalizedPlans();
      const annual = plans.pro.billing.annual;
      const selected = root.querySelector('input[name="billing-interval"]:checked')?.value || 'monthly';
      this.selectedBilling = selected;
      const plan = this.getSelectedBillingOption();

      if (priceDisplay) {
        priceDisplay.innerHTML = `${plan.priceDisplay}<small data-revenue-price-period>${plan.periodLabel}</small>`;
      }

      if (priceEquiv) {
        if (selected === 'annual') {
          priceEquiv.textContent = `${annual.monthlyEquivalent} · ${pt('billingAnnualSavings', {}, annual.savingsLabel)}`;
          priceEquiv.hidden = false;
        } else {
          priceEquiv.hidden = true;
        }
      }

      if (savingsFact) {
        const savings = getAnnualSavingsFacts();
        savingsFact.textContent = pt(
          'savingsFact',
          { amount: formatTry(savings.savingsAmount) },
          `12 aylık aylık ödemeye göre ${formatTry(savings.savingsAmount)} daha az (listelenen fiyat)`
        );
        savingsFact.hidden = selected !== 'annual';
      }

      if (checkoutCta) {
        checkoutCta.textContent = this.getCheckoutCtaLabel(selected);
        checkoutCta.dataset.billing = selected;
      }

      syncRoi(selected);
    };

    radios.forEach((radio) => {
      radio.addEventListener('change', sync);
    });

    document.addEventListener('ib:locale-changed', sync);

    if (roiPanel) {
      const budgetInput = roiPanel.querySelector('[data-roi-budget]');
      const driftInput = roiPanel.querySelector('[data-roi-drift]');
      const onRoiInput = () => syncRoi(
        root.querySelector('input[name="billing-interval"]:checked')?.value || 'monthly'
      );
      budgetInput?.addEventListener('input', onRoiInput);
      driftInput?.addEventListener('input', onRoiInput);
    }

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
            ? 'Son ödeme alınamadı. Pro özellikler geçici olarak sınırlı; kartınızı güncelleyin veya planınızı yönetin.'
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
