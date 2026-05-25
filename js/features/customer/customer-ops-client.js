/**
 * P11 — Customer ops client: lifecycle enroll, support intake, analytics.
 */
import { analytics } from '../../core/analytics.js';
import { enrollLifecycle } from '../lifecycle/lifecycle-client.js';
import { buildFaqCorpus, searchFaqArticles } from './faq-automation.js';
import { routeSupportRequest } from './support-router.js';

function getSupabaseConfig() {
  const url = window.__env?.SUPABASE_URL;
  const key = window.__env?.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function enrollOnboardingHelp(meta = {}) {
  analytics.track(
    'support_onboarding_help_enroll',
    { source: meta.source || 'web' },
    { category: 'lifecycle', funnel: 'customer_ops', funnel_step: 'onboarding_help' }
  );
  return enrollLifecycle('onboarding_help', {
    email: meta.email,
    user_id: meta.user_id,
    service_opt_in: true,
    context: meta,
    trigger_source: meta.trigger_source || 'onboarding_help'
  });
}

export async function enrollBillingHelp(meta = {}) {
  analytics.track(
    'support_billing_help_enroll',
    { reason: meta.reason || 'billing' },
    { category: 'lifecycle', funnel: 'customer_ops', funnel_step: 'billing_help' }
  );
  return enrollLifecycle('billing_help', {
    email: meta.email,
    user_id: meta.user_id,
    service_opt_in: true,
    context: meta,
    trigger_source: meta.trigger_source || 'billing_help',
    restart: true
  });
}

/**
 * Route user message through FAQ + actions; optionally submit intake.
 * @param {object} input
 */
export async function handleSupportQuery(input = {}) {
  const corpus = await buildFaqCorpus(input.supabase || null);
  const searched = searchFaqArticles(input.message, corpus.articles);
  const route = routeSupportRequest({
    message: input.message,
    articles: searched.length ? searched : corpus.articles,
    context: input.context
  });

  analytics.track(
    'support_intent_routed',
    {
      intent: route.intent,
      confidence: route.confidence,
      deflected: route.deflected,
      workflow: route.workflow
    },
    { category: 'support', funnel: 'customer_ops', funnel_step: route.intent }
  );

  if (route.deflected) {
    analytics.track(
      'support_faq_resolved',
      { article_id: route.topArticle?.id, intent: route.intent },
      { category: 'support', funnel: 'customer_ops', funnel_step: 'faq_resolved' }
    );
  } else {
    analytics.track(
      'support_escalation',
      { intent: route.intent, confidence: route.confidence },
      { category: 'support', funnel: 'customer_ops', funnel_step: 'escalation' }
    );
  }

  return route;
}

export async function submitSupportTicket(payload = {}) {
  const config = getSupabaseConfig();
  const body = {
    message: payload.message,
    intent: payload.intent,
    email: payload.email || null,
    user_id: payload.user_id || null,
    page_path: typeof window !== 'undefined' ? window.location.pathname : null,
    context: payload.context || {}
  };

  analytics.track(
    'support_ticket_submitted',
    { intent: payload.intent || 'unknown', has_email: Boolean(body.email) },
    { category: 'support', funnel: 'customer_ops', funnel_step: 'ticket' }
  );

  if (!config) return { ok: false, error: 'no_supabase' };

  try {
    const res = await fetch(`${config.url}/functions/v1/support-intake`, {
      method: 'POST',
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, ...data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'intake_failed' };
  }
}
