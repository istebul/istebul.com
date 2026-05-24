/**
 * P2.3 — Productized B2B partner monetization tiers (self-serve, no fake pricing).
 */

export const PARTNER_OFFER_DIMENSIONS = Object.freeze([
  { key: 'leadVolume', label: 'Lead hacmi' },
  { key: 'sla', label: 'SLA (dispatch)' },
  { key: 'routingPriority', label: 'Routing önceliği' },
  { key: 'crmAccess', label: 'CRM / veri erişimi' },
  { key: 'retrySupport', label: 'Retry & dayanıklılık' },
  { key: 'integrationSupport', label: 'Entegrasyon desteği' },
  { key: 'reporting', label: 'Raporlama' }
]);

/** Product tiers — contract pricing offline; labels are transparent placeholders. */
export const PARTNER_PRODUCT_TIERS = Object.freeze([
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Tek lokasyon veya düşük hacimli ekip',
    priceLabel: 'CPL — teklif iste',
    priceNote: 'Referans: sıcak lead başına ₺5.000+ (kategori ve bölgeye göre netleşir). İlk entegrasyon için pilot dahil.',
    billingModel: 'cpl',
    featured: false,
    includesPilot: true,
    leadVolume: '≤ 50 sıcak lead / ay (tipik)',
    sla: 'Dispatch hedefi ≤ 15 dk',
    routingPriority: 'Standart route ağırlığı',
    crmAccess: 'Webhook JSON + partner callback API',
    retrySupport: 'Platform retry (5×) + failover route',
    integrationSupport: 'Self-serve onboarding + API dokümantasyonu',
    reporting: 'Teslimat logları ve dispatch durumu',
    highlights: ['Hot / very_hot lead', 'HMAC webhook', 'KVKK uyumlu teslimat']
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'Çoklu satış hattı ve orta ölçekli kapasite',
    priceLabel: 'Aylık kapasite — teklif iste',
    priceNote: 'Günlük lead kotası ve öncelik ağırlığı sözleşmede tanımlanır.',
    billingModel: 'subscription',
    featured: true,
    includesPilot: true,
    leadVolume: '50–200 sıcak lead / ay (yapılandırılabilir)',
    sla: 'Dispatch hedefi ≤ 10 dk',
    routingPriority: 'Yükseltilmiş endpoint priority_weight',
    crmAccess: 'Webhook + callback + haftalık operasyon özeti (talep üzerine)',
    retrySupport: 'Tam retry, failover ve günlük cap yönetimi',
    integrationSupport: 'İş günü entegrasyon desteği',
    reporting: 'Haftalık teslimat ve kazanım özeti',
    highlights: ['Öncelikli route', 'Cap & health izleme', 'Partner ops görünürlüğü']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Galeri ağı, finansman veya çoklu marka',
    priceLabel: 'Kurumsal platform — teklif iste',
    priceNote: 'Platform ücreti + hacim; özel SLA ve güvenlik incelemesi offline imzalanır.',
    billingModel: 'enterprise',
    featured: false,
    includesPilot: false,
    leadVolume: 'Özel kapasite ve günlük cap (çoklu endpoint)',
    sla: 'Sözleşmeli SLA',
    routingPriority: 'Dedicated route + özel failover zinciri',
    crmAccess: 'Çoklu endpoint, özel alanlar, güvenlik incelemesi',
    retrySupport: 'Özel retry politikası + operasyon runbook',
    integrationSupport: 'Dedicated entegrasyon ve hesap yöneticisi',
    reporting: 'Özel raporlama ve yönetici metrikleri',
    highlights: ['Çoklu endpoint', 'Beyaz etiket opsiyonu', 'Güvenlik & uyumluluk paketi']
  }
]);

/** Free integration validation — not a paid tier. */
export const PARTNER_PILOT_OFFER = Object.freeze({
  id: 'pilot',
  name: 'Entegrasyon pilotu',
  description: 'İlk 5 sıcak lead ücretsiz — webhook ve imza doğrulama. Ücretli plan Starter veya üzeri ile devam eder.',
  priceLabel: 'Ücretsiz (sınırlı)'
});

export const BILLING_PLAN_ALIASES = Object.freeze({
  cpl: 'starter',
  subscription: 'growth'
});

export const BILLING_PLAN_LABELS = Object.freeze({
  pilot: 'Entegrasyon pilotu',
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
  cpl: 'Starter (eski CPL)',
  subscription: 'Growth (eski abonelik)'
});

export function normalizeBillingPlan(plan) {
  const raw = String(plan || 'pilot').trim().toLowerCase();
  return BILLING_PLAN_ALIASES[raw] || raw;
}

export function isAllowedBillingPlan(plan) {
  const normalized = normalizeBillingPlan(plan);
  return ['pilot', 'starter', 'growth', 'enterprise'].includes(normalized)
    || ['cpl', 'subscription'].includes(String(plan || '').toLowerCase());
}

export function buildOfferApplicationUrl(tierId, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com');
  const params = new URLSearchParams({ plan: tierId });
  return `${base}/partner-basvuru.html?${params}`;
}

export function buildQuoteRequestUrl(tierId, origin) {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://www.istebul.com');
  const params = new URLSearchParams({
    plan: tierId,
    intent: 'quote'
  });
  return `${base}/partner-basvuru.html?${params}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellValue(tier, key) {
  return escapeHtml(tier[key] || '—');
}

export function renderProductTierCards(options = {}) {
  const origin = options.origin;
  const showPilot = options.showPilot !== false;

  const cards = PARTNER_PRODUCT_TIERS.map((tier) => `
    <article class="ib-partner-offer-card${tier.featured ? ' ib-partner-offer-card--featured' : ''}" role="listitem">
      <span class="ib-partner-rate-kicker">${escapeHtml(tier.name)}</span>
      <p class="ib-partner-offer-tagline">${escapeHtml(tier.tagline)}</p>
      <h3 class="ib-partner-offer-price">${escapeHtml(tier.priceLabel)}</h3>
      <p class="ib-partner-offer-price-note">${escapeHtml(tier.priceNote)}</p>
      <ul class="ib-partner-offer-highlights">
        ${tier.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}
      </ul>
      <div class="ib-partner-offer-actions">
        <a class="btn primary" href="${escapeHtml(buildOfferApplicationUrl(tier.id, origin))}">Başvuru başlat</a>
        <a class="btn secondary" href="${escapeHtml(buildQuoteRequestUrl(tier.id, origin))}">Teklif iste</a>
      </div>
    </article>
  `).join('');

  const pilot = showPilot ? `
    <aside class="ib-partner-pilot-banner" role="note">
      <strong>${escapeHtml(PARTNER_PILOT_OFFER.name)}</strong>
      <p>${escapeHtml(PARTNER_PILOT_OFFER.description)}</p>
      <a class="btn secondary btn-sm" href="${escapeHtml(buildOfferApplicationUrl('pilot', origin))}">Pilot ile başla</a>
    </aside>
  ` : '';

  return `
    ${pilot}
    <div class="ib-partner-offer-grid" role="list">
      ${cards}
    </div>`;
}

export function renderComparisonTable() {
  const header = `
    <thead>
      <tr>
        <th scope="col">Özellik</th>
        ${PARTNER_PRODUCT_TIERS.map((t) => `<th scope="col">${escapeHtml(t.name)}</th>`).join('')}
      </tr>
    </thead>`;

  const body = PARTNER_OFFER_DIMENSIONS.map((dim) => `
    <tr>
      <th scope="row">${escapeHtml(dim.label)}</th>
      ${PARTNER_PRODUCT_TIERS.map((tier) => `<td>${cellValue(tier, dim.key)}</td>`).join('')}
    </tr>
  `).join('');

  return `
    <div class="ib-partner-docs-table-wrap">
      <table class="ib-partner-docs-table ib-partner-comparison-table">
        ${header}
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

export function renderPricingFaq() {
  const items = [
    {
      q: 'Fiyatlar neden listede yok?',
      a: 'Kategori (bayi, finansman, sigorta), coğrafya ve hacme göre CPL veya aylık kapasite offline tekliflenir. Sayfadaki tutarlar referans banttır, bağlayıcı fiyat değildir.'
    },
    {
      q: 'Pilot sonrası ne olur?',
      a: 'Entegrasyon doğrulandıktan sonra seçtiğiniz ürün paketi (Starter, Growth, Enterprise) ile canlı lead akışı ve sözleşme devreye girer.'
    },
    {
      q: 'Ödeme nasıl işler?',
      a: 'Self-serve başvuru ve teknik onboarding ürün içinde; ticari koşullar teklif ve sözleşme ile netleşir — manuel WhatsApp zorunlu değildir.'
    }
  ];

  return `
    <div class="ib-partner-pricing-faq">
      ${items.map((item) => `
        <details>
          <summary>${escapeHtml(item.q)}</summary>
          <p>${escapeHtml(item.a)}</p>
        </details>
      `).join('')}
    </div>`;
}
