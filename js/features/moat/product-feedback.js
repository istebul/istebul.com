import { analytics } from '../../core/analytics.js';
import { readDecisionSession } from './moat-session.js';
import { buildSegmentKey } from './scoring-intelligence.js';
import {
  PRODUCT_FEEDBACK_EVENTS,
  PRODUCT_FEEDBACK_SURFACES,
  productFeedbackCooldownKey,
  isProductFeedbackComplete,
  markProductFeedbackComplete,
  normalizeProductFeedbackAnswers,
  hasMinimumProductFeedback,
  deriveProductIntelligenceEvents
} from './product-feedback-shared.js';

const REQUESTED_KEY_PREFIX = 'ib_product_feedback_requested_';

function requestedKey(sessionId, surface) {
  return `${REQUESTED_KEY_PREFIX}${sessionId}:${surface}`;
}

function readAnswers(root) {
  const useful = root.querySelector('[data-pf-useful].is-selected')?.getAttribute('data-pf-useful');
  const outcome = root.querySelector('[data-pf-outcome].is-selected')?.getAttribute('data-pf-outcome');
  const bought = root.querySelector('[data-pf-bought].is-selected')?.getAttribute('data-pf-bought');
  const alt = root.querySelector('[data-pf-alt].is-selected')?.getAttribute('data-pf-alt');

  return normalizeProductFeedbackAnswers({
    useful_rating: useful || null,
    outcome_action: outcome || null,
    bought_vehicle: bought,
    chose_alternative: alt
  });
}

function selectChip(group, value, attr) {
  group.querySelectorAll(`[${attr}]`).forEach((btn) => {
    btn.classList.toggle('is-selected', btn.getAttribute(attr) === value);
  });
}

export function renderProductFeedbackHtml(options = {}) {
  const compact = Boolean(options.compact);
  const surface = options.surface || 'auto_results';

  return `
    <section
      class="ib-product-feedback${compact ? ' ib-product-feedback--compact' : ''}"
      data-product-feedback
      data-surface="${surface}"
      aria-label="Ürün geri bildirimi"
    >
      <div class="ib-product-feedback-collapsed" data-pf-collapsed>
        <div class="ib-product-feedback-teaser">
          <span class="ib-product-feedback-icon" aria-hidden="true">◇</span>
          <div>
            <strong>10 sn — ürünü iyileştirin</strong>
            <p class="text-muted-sm">İsteğe bağlı; spam veya e-posta bombardımanı yok.</p>
          </div>
        </div>
        <div class="ib-product-feedback-collapsed-actions">
          <button type="button" class="btn secondary btn-sm" data-pf-expand>Geri bildirim ver</button>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-dismiss>Şimdi değil</button>
        </div>
      </div>

      <div class="ib-product-feedback-panel" data-pf-panel hidden>
        <p class="kicker">Product intelligence</p>
        <h3>Karar deneyiminiz nasıldı?</h3>
        <p class="lead">Yanıtlar anonim segment sinyallerine gider; kişisel veri istemiyoruz.</p>

        <fieldset class="ib-pf-group">
          <legend>Bu öneri faydalı mı?</legend>
          <div class="ib-pf-chips" role="group">
            <button type="button" class="ib-pf-chip" data-pf-useful="yes">Evet, faydalı</button>
            <button type="button" class="ib-pf-chip" data-pf-useful="no">Hayır</button>
          </div>
        </fieldset>

        <fieldset class="ib-pf-group">
          <legend>Sonunda ne yaptınız?</legend>
          <div class="ib-pf-chips" role="group">
            <button type="button" class="ib-pf-chip" data-pf-outcome="purchased">Satın aldım</button>
            <button type="button" class="ib-pf-chip" data-pf-outcome="alternative">Başka seçtim</button>
            <button type="button" class="ib-pf-chip" data-pf-outcome="researching">Hâlâ araştırıyorum</button>
            <button type="button" class="ib-pf-chip" data-pf-outcome="nothing">Henüz karar vermedim</button>
          </div>
        </fieldset>

        <fieldset class="ib-pf-group">
          <legend>Araç satın aldınız mı?</legend>
          <div class="ib-pf-chips" role="group">
            <button type="button" class="ib-pf-chip" data-pf-bought="yes">Evet</button>
            <button type="button" class="ib-pf-chip" data-pf-bought="no">Hayır</button>
            <button type="button" class="ib-pf-chip" data-pf-bought="unsure">Emin değilim</button>
          </div>
        </fieldset>

        <fieldset class="ib-pf-group">
          <legend>Başka seçenek mi seçtiniz?</legend>
          <div class="ib-pf-chips" role="group">
            <button type="button" class="ib-pf-chip" data-pf-alt="yes">Evet, farklı model</button>
            <button type="button" class="ib-pf-chip" data-pf-alt="no">Hayır, aynı yönde</button>
          </div>
        </fieldset>

        <div class="ib-product-feedback-actions">
          <button type="button" class="btn primary btn-sm" data-pf-submit>Gönder</button>
          <button type="button" class="btn btn-ghost btn-sm" data-pf-dismiss>Şimdi değil</button>
        </div>
        <p class="ib-product-feedback-status text-muted-sm" data-pf-status hidden></p>
      </div>
    </section>`;
}

function trackIntelligenceEvent(eventName, context = {}, extra = {}) {
  const session = readDecisionSession();
  analytics.track(
    eventName,
    {
      decision_session_id: session.id,
      surface: context.surface,
      segment_key: context.segmentKey,
      match_score: context.matchScore,
      ...extra
    },
    {
      category: 'decision',
      funnel: 'product_intelligence',
      funnel_step: context.surface || 'auto_results',
      force: false
    }
  );
}

async function postProductFeedback(answers, context = {}) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  const session = readDecisionSession();
  const segmentKey = context.segmentKey || buildSegmentKey(context.form || {});

  const payload = {
    action: 'product_feedback',
    decision_session_id: session.id,
    surface: context.surface || 'auto_results',
    segment_key: segmentKey,
    match_score: context.matchScore ?? null,
    confidence_tier: context.confidenceTier || null,
    page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    anonymous_id: analytics.getAnonymousId?.() || null,
    lead_id: context.leadId || null,
    useful_rating: answers.useful_rating,
    outcome_action: answers.outcome_action,
    bought_vehicle: answers.bought_vehicle,
    chose_alternative: answers.chose_alternative,
    form: context.form || {}
  };

  if (baseUrl && anonKey) {
    await fetch(`${baseUrl}/functions/v1/decision-intelligence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      },
      body: JSON.stringify(payload)
    }).catch(() => null);
  }

  for (const eventName of deriveProductIntelligenceEvents(answers)) {
    trackIntelligenceEvent(eventName, { ...context, segmentKey }, { answers_hash: 'v1' });
  }
}

function showThanks(root, message) {
  const status = root.querySelector('[data-pf-status]');
  if (status) {
    status.hidden = false;
    status.textContent = message;
  }
  root.querySelector('[data-pf-panel]')?.setAttribute('hidden', '');
  root.querySelector('[data-pf-collapsed]')?.setAttribute('hidden', '');
  root.classList.add('ib-product-feedback--done');
}

export function bindProductFeedback(root, context = {}) {
  if (!root) return;

  const surface = context.surface || root.dataset.surface || 'auto_results';
  const session = readDecisionSession();
  const storage = typeof localStorage !== 'undefined' ? localStorage : null;
  const doneKey = productFeedbackCooldownKey(session.id, surface);

  if (isProductFeedbackComplete(storage, doneKey)) {
    root.remove();
    return;
  }

  const collapsed = root.querySelector('[data-pf-collapsed]');
  const panel = root.querySelector('[data-pf-panel]');

  const emitRequested = () => {
    const reqKey = requestedKey(session.id, surface);
    if (storage?.getItem(reqKey) === '1') return;
    trackIntelligenceEvent(PRODUCT_FEEDBACK_EVENTS.REQUESTED, context);
    try {
      storage?.setItem(reqKey, '1');
    } catch {
      /* ignore */
    }
  };

  const dismiss = () => {
    markProductFeedbackComplete(storage, doneKey);
    root.remove();
  };

  const expand = () => {
    collapsed?.setAttribute('hidden', '');
    panel?.removeAttribute('hidden');
    emitRequested();
  };

  root.querySelector('[data-pf-expand]')?.addEventListener('click', expand);
  root.querySelectorAll('[data-pf-dismiss]').forEach((btn) => btn.addEventListener('click', dismiss));

  root.querySelectorAll('[data-pf-useful]').forEach((btn) => {
    btn.addEventListener('click', () => selectChip(root, btn.getAttribute('data-pf-useful'), 'data-pf-useful'));
  });
  root.querySelectorAll('[data-pf-outcome]').forEach((btn) => {
    btn.addEventListener('click', () => selectChip(root, btn.getAttribute('data-pf-outcome'), 'data-pf-outcome'));
  });
  root.querySelectorAll('[data-pf-bought]').forEach((btn) => {
    btn.addEventListener('click', () => selectChip(root, btn.getAttribute('data-pf-bought'), 'data-pf-bought'));
  });
  root.querySelectorAll('[data-pf-alt]').forEach((btn) => {
    btn.addEventListener('click', () => selectChip(root, btn.getAttribute('data-pf-alt'), 'data-pf-alt'));
  });

  root.querySelector('[data-pf-submit]')?.addEventListener('click', async () => {
    const answers = readAnswers(root);
    if (!hasMinimumProductFeedback(answers)) {
      const status = root.querySelector('[data-pf-status]');
      if (status) {
        status.hidden = false;
        status.textContent = 'En az bir soruyu yanıtlayın veya “Şimdi değil”e basın.';
      }
      return;
    }

    root.querySelectorAll('button').forEach((b) => {
      b.disabled = true;
    });

    await postProductFeedback(answers, { ...context, surface });
    markProductFeedbackComplete(storage, doneKey);
    showThanks(root, 'Teşekkürler — ürün zekâsı için kaydedildi.');
  });

  if (context.autoExpand) {
    expand();
  }
}

export function mountProductFeedback(container, context = {}) {
  if (!container) return null;
  const surface = context.surface || 'auto_results';
  if (!PRODUCT_FEEDBACK_SURFACES.includes(surface)) return null;

  container.innerHTML = renderProductFeedbackHtml({ compact: context.compact, surface });
  const root = container.querySelector('[data-product-feedback]');
  bindProductFeedback(root, context);
  return root;
}

/** History route: one compact widget above decision cards. */
export function mountHistoryProductFeedback(historyListEl, context = {}) {
  if (!historyListEl) return;
  const slot = document.createElement('div');
  slot.className = 'history-product-feedback-slot';
  slot.innerHTML = renderProductFeedbackHtml({ compact: true, surface: 'history' });
  historyListEl.prepend(slot);
  bindProductFeedback(slot.querySelector('[data-product-feedback]'), {
    ...context,
    surface: 'history',
    autoExpand: Boolean(context.autoExpand)
  });
}

export function parseProductFeedbackSurfaceFromUrl(search = '') {
  const params = new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''));
  const raw = params.get('product_feedback') || params.get('feedback');
  if (!raw) return null;
  const surface = String(raw).toLowerCase();
  if (PRODUCT_FEEDBACK_SURFACES.includes(surface)) return surface;
  if (surface === '1' || surface === 'true') return 'email';
  return null;
}

export function maybeMountEmailProductFeedback(container, context = {}) {
  const surface = parseProductFeedbackSurfaceFromUrl();
  if (!surface) return false;
  mountProductFeedback(container, {
    ...context,
    surface: surface === 'email' ? 'email' : surface,
    autoExpand: true
  });
  return true;
}
