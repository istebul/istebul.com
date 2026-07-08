import {
  DEMO_RESTAURANT_SLUG,
  formatRestaurantRoleLabel,
  normalizeRestaurantRole,
  normalizeRestaurantSettings,
  normalizeRestaurantTenant
} from './tenant.js';
import {
  GARSON_ADMIN_DEMO_SESSION_KEY,
  activateDemoAdminSession,
  loginRestaurantUser,
  logoutRestaurantUser,
  resolveGarsonPanelAccess
} from './auth-service.js';

export const GARSON_ADMIN_LOGIN_PATH = '/garson/giris/';
export const GARSON_ADMIN_PANEL_PATH = '/garson/panel/';

/** @type {Record<string, string>} */
export const ADMIN_RESTAURANT_STATUS_LABELS = {
  active: 'Aktif',
  inactive: 'Pasif',
  pending: 'Onay bekliyor',
  suspended: 'Askıda'
};

/** @type {Record<string, string>} */
export const ADMIN_PLAN_LABELS = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
  enterprise: 'Enterprise',
  pilot: 'Pilot'
};

/** @type {readonly { id: string, label: string, anchor: string }[]} */
export const ADMIN_NAV_SECTIONS = [
  { id: 'restaurant', label: 'Restoran bilgilerim', anchor: 'garson-admin-restaurant' },
  { id: 'menu', label: 'Menü', anchor: 'garson-admin-menu' },
  { id: 'reservations', label: 'Rezervasyonlar', anchor: 'garson-admin-reservations' },
  { id: 'preorders', label: 'Ön siparişler', anchor: 'garson-admin-preorders' },
  { id: 'kitchen', label: 'Mutfak ekranı', anchor: 'garson-admin-kitchen' },
  { id: 'settings', label: 'Ayarlar', anchor: 'garson-admin-settings' }
];

/** @type {readonly { id: string, label: string }[]} */
export const ADMIN_STAT_CARD_IDS = [
  { id: 'status', label: 'Restoran durumu' },
  { id: 'reservations', label: 'Bugünkü rezervasyon' },
  { id: 'preorders', label: 'Ön siparişler' },
  { id: 'kitchen', label: 'Mutfak durumu' },
  { id: 'plan', label: 'Paket bilgisi' }
];

/**
 * @typedef {Object} NormalizedAdminRestaurant
 * @property {string} id
 * @property {string} restaurantId
 * @property {string} name
 * @property {string} slug
 * @property {string} status
 * @property {string} statusLabel
 * @property {string} plan
 * @property {string} planLabel
 * @property {string} onboardingStatus
 * @property {string} role
 * @property {string} roleLabel
 * @property {string} createdAt
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminStats
 * @property {number} todayReservations
 * @property {number} activePreorders
 * @property {number} kitchenQueueCount
 * @property {string} kitchenStatusLabel
 * @property {string} planLabel
 * @property {string} restaurantStatusLabel
 * @property {unknown} raw
 */

/**
 * @typedef {Object} NormalizedAdminNavItem
 * @property {string} id
 * @property {string} label
 * @property {string} href
 * @property {boolean} external
 */

/**
 * @returns {Record<string, unknown>}
 */
export function getMockDemoTenantPayload() {
  return {
    restaurant: {
      id: 'a0000000-0000-4000-8000-00000000cafe',
      name: 'Demo Cafe',
      slug: DEMO_RESTAURANT_SLUG,
      status: 'active',
      plan: 'pilot',
      onboarding_status: 'completed',
      created_at: '2026-07-08T12:00:00Z'
    },
    settings: {
      restaurant_id: 'a0000000-0000-4000-8000-00000000cafe',
      whatsapp_enabled: true,
      preorder_enabled: true,
      kitchen_enabled: true,
      ai_enabled: true
    },
    user: {
      restaurant_id: 'a0000000-0000-4000-8000-00000000cafe',
      user_id: 'demo-owner',
      role: 'owner'
    },
    stats: {
      today_reservations: 12,
      active_preorders: 4,
      kitchen_queue_count: 3,
      kitchen_status: 'preparing'
    }
  };
}

/**
 * @param {unknown} payload
 * @param {{ role?: string }} [options]
 * @returns {NormalizedAdminRestaurant}
 */
export function normalizeAdminRestaurant(payload, options = {}) {
  const tenant = normalizeRestaurantTenant(payload);
  const role = normalizeRestaurantRole(options.role || 'owner');

  return {
    id: tenant.id,
    restaurantId: tenant.id,
    name: tenant.name || 'Restoran',
    slug: tenant.slug,
    status: tenant.status,
    statusLabel: ADMIN_RESTAURANT_STATUS_LABELS[tenant.status] || tenant.status,
    plan: tenant.plan,
    planLabel: ADMIN_PLAN_LABELS[tenant.plan] || tenant.plan,
    onboardingStatus: tenant.onboardingStatus,
    role,
    roleLabel: formatRestaurantRoleLabel(role),
    createdAt: tenant.createdAt,
    raw: payload
  };
}

/**
 * @param {unknown} payload
 * @param {{ planLabel?: string, restaurantStatusLabel?: string }} [options]
 * @returns {NormalizedAdminStats}
 */
export function normalizeAdminStats(payload, options = {}) {
  let row = payload;

  if (payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    if (root.stats && typeof root.stats === 'object') {
      row = root.stats;
    } else if (root.data && typeof root.data === 'object') {
      const data = /** @type {Record<string, unknown>} */ (root.data);
      row = data.stats && typeof data.stats === 'object' ? data.stats : data;
    }
  }

  const record = /** @type {Record<string, unknown>} */ (
    row && typeof row === 'object' ? row : {}
  );

  const todayRaw = Number.parseInt(
    String(record.today_reservations ?? record.todayReservations ?? '0'),
    10
  );
  const preorderRaw = Number.parseInt(
    String(record.active_preorders ?? record.activePreorders ?? record.preorders ?? '0'),
    10
  );
  const kitchenRaw = Number.parseInt(
    String(record.kitchen_queue_count ?? record.kitchenQueueCount ?? '0'),
    10
  );

  const kitchenStatus = String(record.kitchen_status ?? record.kitchenStatus ?? 'idle').trim();
  const kitchenStatusLabel =
    kitchenStatus === 'preparing'
      ? 'Hazırlanıyor'
      : kitchenStatus === 'ready'
        ? 'Servise hazır'
        : kitchenStatus === 'busy'
          ? 'Yoğun'
          : 'Beklemede';

  return {
    todayReservations: Number.isFinite(todayRaw) && todayRaw >= 0 ? todayRaw : 0,
    activePreorders: Number.isFinite(preorderRaw) && preorderRaw >= 0 ? preorderRaw : 0,
    kitchenQueueCount: Number.isFinite(kitchenRaw) && kitchenRaw >= 0 ? kitchenRaw : 0,
    kitchenStatusLabel,
    planLabel: String(options.planLabel ?? record.plan_label ?? record.planLabel ?? '—'),
    restaurantStatusLabel: String(
      options.restaurantStatusLabel ?? record.restaurant_status_label ?? '—'
    ),
    raw: payload
  };
}

/**
 * @param {unknown} payload
 * @param {{ slug?: string }} [options]
 * @returns {NormalizedAdminNavItem[]}
 */
export function normalizeAdminNavigation(payload, options = {}) {
  let slug = String(options.slug ?? '').trim().toLowerCase();

  if (!slug && payload && typeof payload === 'object') {
    const root = /** @type {Record<string, unknown>} */ (payload);
    const restaurant =
      root.restaurant && typeof root.restaurant === 'object' ? root.restaurant : root;
    const record = /** @type {Record<string, unknown>} */ (restaurant);
    slug = String(record.slug ?? record.businessId ?? record.business_id ?? '').trim().toLowerCase();
  }

  if (!slug) slug = DEMO_RESTAURANT_SLUG;

  return ADMIN_NAV_SECTIONS.map((section) => {
    if (section.id === 'kitchen') {
      return {
        id: section.id,
        label: section.label,
        href: `/garson/mutfak/?businessId=${encodeURIComponent(slug)}`,
        external: true
      };
    }

    if (section.id === 'menu') {
      return {
        id: section.id,
        label: section.label,
        href: '/garson/panel/menu/',
        external: false
      };
    }

    if (section.id === 'reservations') {
      return {
        id: section.id,
        label: section.label,
        href: '/garson/panel/rezervasyonlar/',
        external: false
      };
    }

    if (section.id === 'preorders') {
      return {
        id: section.id,
        label: section.label,
        href: '/garson/panel/siparisler/',
        external: false
      };
    }

    return {
      id: section.id,
      label: section.label,
      href: `#${section.anchor}`,
      external: false
    };
  });
}

/**
 * @param {NormalizedAdminRestaurant} restaurant
 * @param {NormalizedAdminStats} stats
 * @returns {string}
 */
export function renderAdminStatCardsHtml(restaurant, stats) {
  const cards = [
    {
      id: 'status',
      label: 'Restoran durumu',
      value: restaurant.statusLabel,
      hint: restaurant.name
    },
    {
      id: 'reservations',
      label: 'Bugünkü rezervasyon',
      value: String(stats.todayReservations),
      hint: 'Bugün için planlanan masa'
    },
    {
      id: 'preorders',
      label: 'Ön siparişler',
      value: String(stats.activePreorders),
      hint: 'Aktif ön sipariş'
    },
    {
      id: 'kitchen',
      label: 'Mutfak durumu',
      value: stats.kitchenStatusLabel,
      hint: `${stats.kitchenQueueCount} sipariş kuyrukta`
    },
    {
      id: 'plan',
      label: 'Paket bilgisi',
      value: restaurant.planLabel,
      hint: restaurant.roleLabel
    }
  ];

  return cards
    .map(
      (card) => `
    <article class="garson-admin-stat-card" id="garson-admin-stat-${card.id}">
      <p class="garson-admin-stat-card__label">${card.label}</p>
      <p class="garson-admin-stat-card__value">${card.value}</p>
      <p class="garson-admin-stat-card__hint">${card.hint}</p>
    </article>
  `.trim()
    )
    .join('');
}

/**
 * @param {NormalizedAdminNavItem[]} navigation
 * @returns {string}
 */
export function renderAdminNavigationHtml(navigation) {
  return navigation
    .map((item) => {
      const attrs = item.external ? ' target="_blank" rel="noopener noreferrer"' : '';
      return `<a class="garson-admin-nav__link" href="${item.href}"${attrs}>${item.label}</a>`;
    })
    .join('');
}

/**
 * @param {NormalizedAdminRestaurant} restaurant
 * @param {ReturnType<typeof normalizeRestaurantSettings>} settings
 * @returns {string}
 */
export function renderAdminSectionsHtml(restaurant, settings) {
  const kitchenHref = `/garson/mutfak/?businessId=${encodeURIComponent(restaurant.slug || DEMO_RESTAURANT_SLUG)}`;

  return `
    <section class="garson-admin-section" id="garson-admin-restaurant" aria-labelledby="garson-admin-restaurant-title">
      <h2 id="garson-admin-restaurant-title" class="garson-admin-section__title">Restoran bilgilerim</h2>
      <dl class="garson-admin-details">
        <div><dt>Restoran</dt><dd>${restaurant.name}</dd></div>
        <div><dt>Slug</dt><dd>${restaurant.slug}</dd></div>
        <div><dt>Restoran ID</dt><dd>${restaurant.restaurantId}</dd></div>
        <div><dt>Durum</dt><dd>${restaurant.statusLabel}</dd></div>
      </dl>
    </section>
    <section class="garson-admin-section" id="garson-admin-menu" aria-labelledby="garson-admin-menu-title">
      <h2 id="garson-admin-menu-title" class="garson-admin-section__title">Menü</h2>
      <p class="garson-admin-section__copy">Menü yönetimi demo modunda önizleme olarak gösterilir.</p>
    </section>
    <section class="garson-admin-section" id="garson-admin-reservations" aria-labelledby="garson-admin-reservations-title">
      <h2 id="garson-admin-reservations-title" class="garson-admin-section__title">Rezervasyonlar</h2>
      <p class="garson-admin-section__copy">Bugünkü rezervasyonlar panelde özetlenir; canlı liste yakında.</p>
    </section>
    <section class="garson-admin-section" id="garson-admin-preorders" aria-labelledby="garson-admin-preorders-title">
      <h2 id="garson-admin-preorders-title" class="garson-admin-section__title">Ön siparişler</h2>
      <p class="garson-admin-section__copy">Ön sipariş özeti demo tenant verisiyle gösterilir.</p>
    </section>
    <section class="garson-admin-section" id="garson-admin-kitchen" aria-labelledby="garson-admin-kitchen-title">
      <h2 id="garson-admin-kitchen-title" class="garson-admin-section__title">Mutfak ekranı</h2>
      <p class="garson-admin-section__copy">KDS Lite ekranına geçerek sipariş kuyruğunu yönetin.</p>
      <a class="vacation-btn vacation-btn--secondary" href="${kitchenHref}">Mutfak ekranını aç</a>
    </section>
    <section class="garson-admin-section" id="garson-admin-settings" aria-labelledby="garson-admin-settings-title">
      <h2 id="garson-admin-settings-title" class="garson-admin-section__title">Ayarlar</h2>
      <ul class="garson-admin-settings-list">
        <li>WhatsApp: ${settings.whatsappEnabled ? 'Açık' : 'Kapalı'}</li>
        <li>Ön sipariş: ${settings.preorderEnabled ? 'Açık' : 'Kapalı'}</li>
        <li>Mutfak: ${settings.kitchenEnabled ? 'Açık' : 'Kapalı'}</li>
        <li>AI: ${settings.aiEnabled ? 'Açık' : 'Kapalı'}</li>
      </ul>
    </section>
  `.trim();
}

/**
 * @returns {void}
 */
export function activateDemoAdminSessionPortal() {
  activateDemoAdminSession();
}

/**
 * @param {HTMLFormElement} form
 * @returns {boolean}
 */
export function handleAdminLoginSubmit(form) {
  if (!form.reportValidity()) return false;
  activateDemoAdminSession();
  return true;
}

/**
 * @returns {{ restaurant: NormalizedAdminRestaurant, stats: NormalizedAdminStats, settings: ReturnType<typeof normalizeRestaurantSettings>, navigation: NormalizedAdminNavItem[] }}
 */
export function buildDemoAdminDashboardModel() {
  const payload = getMockDemoTenantPayload();
  const restaurant = normalizeAdminRestaurant(payload.restaurant, {
    role: String(/** @type {Record<string, unknown>} */ (payload.user).role ?? 'owner')
  });
  const settings = normalizeRestaurantSettings(payload.settings);
  const stats = normalizeAdminStats(payload.stats, {
    planLabel: restaurant.planLabel,
    restaurantStatusLabel: restaurant.statusLabel
  });
  const navigation = normalizeAdminNavigation(payload, { slug: restaurant.slug });

  return { restaurant, stats, settings, navigation };
}

function bootLoginPage() {
  const form = document.getElementById('garson-admin-login-form');
  const demoBtn = document.getElementById('garson-admin-demo-login');
  const notice = document.getElementById('garson-admin-login-notice');
  const submitBtn = form?.querySelector('button[type="submit"]');

  demoBtn?.addEventListener('click', () => {
    activateDemoAdminSession();
    window.location.assign(GARSON_ADMIN_PANEL_PATH);
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.reportValidity()) return;

    const emailInput = form.querySelector('#garson-admin-email');
    const passwordInput = form.querySelector('#garson-admin-password');
    const email =
      emailInput instanceof HTMLInputElement ? emailInput.value.trim() : '';
    const password =
      passwordInput instanceof HTMLInputElement ? passwordInput.value : '';

    if (notice) {
      notice.hidden = true;
      notice.textContent = '';
    }

    const idleLabel = submitBtn?.textContent || 'Giriş yap';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Giriş yapılıyor…';
    }

    const result = await loginRestaurantUser(email, password);

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = idleLabel;
    }

    if (result.ok) {
      window.location.assign(GARSON_ADMIN_PANEL_PATH);
      return;
    }

    if (notice) {
      notice.hidden = false;
      notice.textContent = result.error || 'Giriş yapılamadı.';
    }
  });
}

async function bootPanelPage() {
  const access = await resolveGarsonPanelAccess();

  if (access.mode === 'none') {
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
    return;
  }

  const model = buildDemoAdminDashboardModel();
  const title = document.getElementById('garson-admin-panel-title');
  const subtitle = document.getElementById('garson-admin-panel-subtitle');
  const statsRoot = document.getElementById('garson-admin-stats');
  const navRoot = document.getElementById('garson-admin-nav');
  const sectionsRoot = document.getElementById('garson-admin-sections');
  const badge = document.getElementById('garson-admin-demo-badge');
  const logoutLink = document.querySelector('a[href="/garson/giris/"]');

  const context = access.context;
  const restaurant =
    access.mode === 'live' && context
      ? normalizeAdminRestaurant(
          {
            id: context.restaurantId,
            name: context.restaurantName,
            slug: context.slug
          },
          { role: context.role }
        )
      : model.restaurant;

  if (title) title.textContent = restaurant.name;
  if (subtitle) {
    subtitle.textContent = `${restaurant.planLabel} · ${restaurant.roleLabel}`;
  }
  if (statsRoot) statsRoot.innerHTML = renderAdminStatCardsHtml(restaurant, model.stats);
  if (navRoot) {
    navRoot.innerHTML = renderAdminNavigationHtml(
      normalizeAdminNavigation({ restaurant: { slug: restaurant.slug } })
    );
  }
  if (sectionsRoot) {
    sectionsRoot.innerHTML = renderAdminSectionsHtml(restaurant, model.settings);
  }
  if (badge) badge.hidden = access.mode === 'live';

  logoutLink?.addEventListener('click', async (event) => {
    event.preventDefault();
    await logoutRestaurantUser();
    window.location.assign(GARSON_ADMIN_LOGIN_PATH);
  });

  document.body.classList.add('ib-ready');
}

function boot() {
  if (document.getElementById('garson-admin-login-form')) {
    document.body.classList.add('ib-ready');
    bootLoginPage();
    return;
  }

  if (document.getElementById('garson-admin-panel')) {
    bootPanelPage();
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
