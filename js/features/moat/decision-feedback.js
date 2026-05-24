import { analytics } from '../../core/analytics.js';
import { escapeHtml } from '../../core/security.js';
import { readDecisionSession } from './moat-session.js';
import { buildSegmentKey } from './scoring-intelligence.js';

export const DECISION_FEEDBACK_EVENTS = Object.freeze({
  HELPFUL: 'decision_feedback_helpful',
  UNCLEAR: 'decision_feedback_unclear',
  CONTACT: 'decision_feedback_contact'
});

export function renderDecisionFeedbackHtml() {
  return `
    <section class="ib-decision-feedback" aria-label="Karar geri bildirimi">
      <p class="kicker">Feedback loop</p>
      <h3>Bu karar özeti size ne kadar net geldi?</h3>
      <p class="lead">Yanıtınız anonim outcome sinyallerine girer; segment kalibrasyonu kural tabanlıdır — kişisel veri gerekmez.</p>
      <div class="ib-decision-feedback-actions" role="group" aria-label="Geri bildirim seçenekleri">
        <button type="button" class="btn secondary" data-decision-feedback="helpful">Net ve faydalı</button>
        <button type="button" class="btn secondary" data-decision-feedback="unclear">Daha fazla açıklama</button>
        <button type="button" class="btn secondary" data-decision-feedback="contact">Uzman destek</button>
      </div>
      <p class="ib-decision-feedback-status text-muted-sm" data-feedback-status hidden></p>
    </section>`;
}

async function postFeedback(type, context = {}) {
  const baseUrl = (window.__env?.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = window.__env?.SUPABASE_ANON_KEY || '';
  const session = readDecisionSession();

  const payload = {
    action: 'feedback',
    feedback_type: type,
    decision_session_id: session.id,
    surface: context.surface || 'auto',
    segment_key: buildSegmentKey(context.form || {}),
    match_score: context.matchScore ?? null,
    confidence_tier: context.confidenceTier || null,
    page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    anonymous_id: analytics.getAnonymousId?.() || null,
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

  const eventName = DECISION_FEEDBACK_EVENTS[type.toUpperCase()] || `decision_feedback_${type}`;
  analytics.track(
    eventName,
    {
      decision_session_id: session.id,
      segment_key: payload.segment_key,
      match_score: payload.match_score
    },
    { category: 'decision', funnel: 'decision_moat', funnel_step: type, force: false }
  );
}

const FEEDBACK_MESSAGES = {
  helpful: 'Teşekkürler — bu segment için metodoloji netliği kaydedildi.',
  unclear: 'Not alındı — açıklama derinliğini artıracağız.',
  contact: 'Talebiniz kaydedildi — operasyon ekibi önceliklendirebilir.'
};

export function bindDecisionFeedback(root, context = {}) {
  if (!root) return;

  root.querySelectorAll('[data-decision-feedback]').forEach((button) => {
    button.addEventListener('click', async () => {
      const type = button.getAttribute('data-decision-feedback');
      if (!type) return;

      root.querySelectorAll('[data-decision-feedback]').forEach((b) => {
        b.disabled = true;
      });

      await postFeedback(type, context);

      const status = root.querySelector('[data-feedback-status]');
      if (status) {
        status.hidden = false;
        status.textContent = FEEDBACK_MESSAGES[type] || 'Geri bildiriminiz kaydedildi.';
      }
    });
  });
}

export function mountDecisionFeedback(container, context = {}) {
  if (!container) return;
  container.innerHTML = renderDecisionFeedbackHtml();
  bindDecisionFeedback(container, context);
}
