/**
 * Platform analytics SDK — consent-gated product telemetry via analytics-ingest.
 */

const SESSION_KEY = 'istebul_analytics_session';
const ANON_KEY = 'istebul_analytics_anon';
const ATTRIBUTION_KEY = 'istebul_attribution';
const LAST_FUNNEL_KEY = 'istebul_last_funnel_step';

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function readJson(key, fallback = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export class Analytics {
  constructor() {
    this.enabled = false;
    this.queue = [];
    this.flushTimer = null;
    this.lastPagePath = null;
    this.lastFunnel = null;
  }

  hasConsent() {
    return localStorage.getItem('istebu_cookie_consent') === 'accepted';
  }

  getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  getAnonymousId() {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  }

  captureAttribution() {
    const existing = readJson(ATTRIBUTION_KEY, null);
    if (existing?.captured_at) return existing;

    const params = new URLSearchParams(window.location.search);
    const attribution = {
      captured_at: new Date().toISOString(),
      landing_path: window.location.pathname,
      referrer: document.referrer || null,
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term')
    };

    writeJson(ATTRIBUTION_KEY, attribution);
    return attribution;
  }

  getAttribution() {
    return readJson(ATTRIBUTION_KEY, {});
  }

  getUserId() {
    return window.app?.currentUser?.id || null;
  }

  getPagePath() {
    return `${window.location.pathname}${window.location.hash || ''}`;
  }

  getDeviceType() {
    const w = window.innerWidth || 0;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  init(options = {}) {
    if (!this.hasConsent() && !options.force) return;
    this.enabled = true;
    this.captureAttribution();
    this.trackPageView();
    this.bindGlobalListeners();
    this.scheduleFlush();
    this.flushQueue();
  }

  bindGlobalListeners() {
    if (document.documentElement.dataset.analyticsBound) return;
    document.documentElement.dataset.analyticsBound = 'true';

    document.addEventListener('click', (event) => {
      const cta = event.target.closest('[data-analytics-cta], [data-upgrade-checkout], a[href^="#"]');
      if (!cta || !this.enabled) return;

      const ctaId =
        cta.dataset.analyticsCta ||
        cta.dataset.upgradeCheckout ||
        cta.getAttribute('href') ||
        cta.id ||
        'unknown_cta';

      this.trackCta(ctaId, {
        label: (cta.textContent || '').trim().slice(0, 80),
        section: cta.closest('section')?.id || null
      });
    });

    window.addEventListener('hashchange', () => {
      this.track('route_change', {
        from: this.lastPagePath,
        to: this.getPagePath()
      }, { category: 'page', funnel_step: 'route_change' });
      this.trackPageView();
    });

    window.addEventListener('pagehide', () => {
      this.trackDropoff(this.lastFunnel?.funnel, this.lastFunnel?.step, {
        reason: 'page_exit'
      });
      this.track('page_exit', { path: this.getPagePath() }, { category: 'page' });
      this.flush({ beacon: true });
    });

    document.addEventListener('userLoggedIn', (event) => {
      this.track('auth_login_success', {
        provider: 'email'
      }, { category: 'auth', user_id: event.detail?.id });
      this.flush();
    });

    document.addEventListener('userLoggedOut', () => {
      this.track('auth_logout', {}, { category: 'auth' });
      this.flush();
    });
  }

  track(eventName, properties = {}, meta = {}) {
    if (!this.hasConsent() && !meta.force) return;

    const attribution = this.getAttribution();
    const payload = {
      event_name: eventName,
      event_category: meta.category,
      session_id: this.getSessionId(),
      user_id: meta.user_id || this.getUserId(),
      anonymous_id: this.getAnonymousId(),
      page_path: meta.page_path || this.getPagePath(),
      page_section: meta.page_section || properties.section || null,
      funnel: meta.funnel || properties.funnel || null,
      funnel_step: meta.funnel_step || properties.funnel_step || null,
      step_index: meta.step_index != null ? meta.step_index : properties.step_index,
      cta_id: meta.cta_id || properties.cta_id || null,
      element_id: meta.element_id || null,
      email: meta.email || properties.email || null,
      phone: meta.phone || properties.phone || null,
      revenue_cents: meta.revenue_cents || properties.revenue_cents || 0,
      properties,
      attribution,
      idempotency_key: meta.idempotency_key || null
    };

    if (!this.enabled) {
      this.queue.push(payload);
      return;
    }

    this.queue.push(payload);
    this.scheduleFlush();
  }

  trackUnique(eventName, properties = {}, key = '', meta = {}) {
    const token = `analytics:unique:${eventName}:${key}`;
    if (sessionStorage.getItem(token)) return;
    sessionStorage.setItem(token, '1');
    this.track(eventName, properties, meta);
  }

  trackPageView(path = this.getPagePath()) {
    this.lastPagePath = path;
    this.trackUnique('page_view', { path }, path, {
      category: 'page',
      funnel: 'site',
      funnel_step: 'page_view',
      page_path: path
    });
  }

  trackCta(ctaId, properties = {}) {
    this.track('cta_click', {
      ...properties,
      cta_id: ctaId
    }, {
      category: 'cta',
      cta_id: ctaId,
      funnel: properties.funnel || 'site',
      funnel_step: 'cta_click'
    });
  }

  trackFunnelStep(funnel, step, stepIndex = null, properties = {}) {
    this.lastFunnel = { funnel, step, stepIndex };
    writeJson(LAST_FUNNEL_KEY, this.lastFunnel);

    const eventName = funnel === 'auto'
      ? (step === 'page_view' ? 'auto_page_view' : `auto_${step}`)
      : `${funnel}_funnel_step`;

    const name = funnel === 'auto' && ALLOWED_AUTO_MAP[step]
      ? ALLOWED_AUTO_MAP[step]
      : eventName;

    this.track(name, {
      ...properties,
      funnel,
      funnel_step: step,
      step_index: stepIndex
    }, {
      category: funnel === 'finance' ? 'finance' : funnel === 'auto' ? 'auto' : 'page',
      funnel,
      funnel_step: step,
      step_index: stepIndex
    });
  }

  trackDropoff(funnel, step, properties = {}) {
    if (!funnel || !step) return;
    const eventName = funnel === 'auto' ? 'auto_wizard_dropoff' : 'finance_funnel_step';
    this.track(eventName, {
      ...properties,
      funnel,
      funnel_step: step,
      drop_off: true
    }, {
      category: funnel === 'auto' ? 'auto' : 'finance',
      funnel,
      funnel_step: step
    });
  }

  scheduleFlush() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 1200);
  }

  flushQueue() {
    if (!this.queue.length) return;
    this.flush();
  }

  async flush(options = {}) {
    if (!this.queue.length) return;
    if (!this.hasConsent()) return;

    const supabaseUrl = window.__env?.SUPABASE_URL;
    const supabaseKey = window.__env?.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const batch = this.queue.splice(0, 25);
    const attribution = this.getAttribution();
    const body = JSON.stringify({
      session: {
        session_id: this.getSessionId(),
        user_id: this.getUserId(),
        page_path: this.getPagePath(),
        referrer: attribution.referrer,
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_content: attribution.utm_content,
        utm_term: attribution.utm_term,
        device_type: this.getDeviceType(),
        consent_analytics: true
      },
      events: batch
    });

    const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/analytics-ingest`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        },
        body,
        keepalive: Boolean(options.beacon)
      });
    } catch {
      this.queue.unshift(...batch);
    }
  }
}

const ALLOWED_AUTO_MAP = {
  page_view: 'auto_page_view',
  form_started: 'auto_form_started',
  form_submitted: 'auto_form_submitted',
  analysis_started: 'auto_analysis_started',
  results_rendered: 'auto_results_rendered',
  modal_open: 'auto_modal_open',
  lead_submit: 'auto_lead_submit',
  wizard_step: 'auto_wizard_step',
  finance_click: 'auto_finance_click',
  premium_paywall_view: 'auto_premium_paywall_view'
};

export const analytics = new Analytics();
