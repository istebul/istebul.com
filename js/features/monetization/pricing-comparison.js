/** Feature matrix for pricing conversion — card layout per plan tier. */

export const PRICING_FEATURE_ROWS = Object.freeze([
  {
    label: 'Auto TCO maliyet analizi',
    hint: '5 adımlı rehberli özet',
    free: true,
    pro: true,
    enterprise: true
  },
  {
    label: 'Araç karşılaştırma',
    free: '2 model',
    pro: 'Sınırsız',
    enterprise: 'Sınırsız + API'
  },
  {
    label: 'Premium karar raporu',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Şeffaf AI gerekçe özeti',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Öncelikli partner yönlendirme',
    free: false,
    pro: true,
    enterprise: 'SLA ile'
  },
  {
    label: 'Karar geçmişi & export',
    free: false,
    pro: true,
    enterprise: true
  },
  {
    label: 'Kurumsal SLA & çoklu kullanıcı',
    free: false,
    pro: false,
    enterprise: true
  }
]);

const COMPARE_PLANS = Object.freeze([
  {
    id: 'free',
    tier: 'free',
    badge: 'Bireysel',
    name: 'Başlangıç',
    priceHint: 'Ücretsiz',
    featured: false,
    ctaHref: '/auto/',
    ctaLabel: 'Ücretsiz maliyet analizi',
    ctaClass: 'btn btn-outline btn-block'
  },
  {
    id: 'pro',
    tier: 'pro',
    badge: 'En popüler',
    name: 'isteBul Pro',
    priceHint: '₺299 / ay',
    featured: true,
    ctaHref: '/planlar?checkout=pro',
    ctaLabel: 'Pro’yu dene',
    ctaClass: 'btn btn-primary btn-block'
  },
  {
    id: 'enterprise',
    tier: 'enterprise',
    badge: 'Kurumsal',
    name: 'Enterprise',
    priceHint: 'Özel teklif',
    featured: false,
    ctaHref: '/iletisim.html?konu=enterprise',
    ctaLabel: 'Kurumsal teklif al',
    ctaClass: 'btn btn-outline btn-block'
  }
]);

function featureStateClass(value) {
  if (value === true) return 'revenue-compare-feature--yes';
  if (value === false) return 'revenue-compare-feature--no';
  return 'revenue-compare-feature--partial';
}

function renderComparePlanCard(plan) {
  const features = PRICING_FEATURE_ROWS.map((row) => {
    const value = row[plan.tier];
    const state = featureStateClass(value);
    let lead = '';
    if (value === true) {
      lead =
        '<span class="revenue-compare-feature-icon" aria-hidden="true">✓</span>';
    } else if (value === false) {
      lead =
        '<span class="revenue-compare-feature-icon revenue-compare-feature-icon--no" aria-hidden="true">—</span>';
    } else {
      lead = `<span class="revenue-compare-feature-value">${value}</span>`;
    }
    return `
      <li class="revenue-compare-feature ${state}">
        ${lead}
        <span class="revenue-compare-feature-text">
          <strong>${row.label}</strong>
          ${row.hint ? `<small>${row.hint}</small>` : ''}
        </span>
      </li>`;
  }).join('');

  const featuredClass = plan.featured ? ' revenue-compare-plan-card--featured' : '';
  const badgeClass = plan.featured ? ' revenue-plan-badge--popular' : '';

  return `
    <article class="revenue-compare-plan-card${featuredClass}" data-compare-tier="${plan.id}">
      <header class="revenue-compare-plan-card-head">
        <span class="revenue-plan-badge${badgeClass}">${plan.badge}</span>
        <h4 class="revenue-compare-plan-title">${plan.name}</h4>
        <p class="revenue-compare-plan-price">${plan.priceHint}</p>
      </header>
      <ul class="revenue-compare-feature-list" aria-label="${plan.name} özellikleri">
        ${features}
      </ul>
      <footer class="revenue-compare-plan-card-foot">
        <a href="${plan.ctaHref}" class="${plan.ctaClass}" data-native-route>${plan.ctaLabel}</a>
      </footer>
    </article>`;
}

/**
 * Card-based plan comparison (replaces flat table for /planlar).
 */
export function renderFeatureComparisonCards() {
  const cards = COMPARE_PLANS.map(renderComparePlanCard).join('');

  return `
    <section class="revenue-feature-compare revenue-feature-compare--cards" data-pricing-feature-compare>
      <header class="revenue-feature-compare-header">
        <h3 class="revenue-feature-compare-title">Plan karşılaştırması</h3>
        <p class="revenue-feature-compare-lead">Önce ücretsiz TCO görünürlüğü; Pro ile karşılaştırma ve rapor derinliği.</p>
      </header>
      <div class="revenue-feature-compare-cards" role="list" aria-label="Plan özellik karşılaştırması">
        ${cards}
      </div>
    </section>`;
}

/** @deprecated Use renderFeatureComparisonCards — kept for imports */
export function renderFeatureComparisonTable() {
  return renderFeatureComparisonCards();
}
