/**
 * P11 — AI-assisted support intent routing (deterministic, no LLM required).
 */

const INTENT_PATTERNS = [
  {
    intent: 'billing',
    weight: 1,
    patterns: [/fatura|ödeme|kart|stripe|abonelik|iptal|yenile|pro plan|past.?due|gecik/i]
  },
  {
    intent: 'onboarding',
    weight: 1,
    patterns: [/nasıl başla|ilk adım|kayıt|doğrulama|e.?posta|onboarding|kurulum|yeni üye/i]
  },
  {
    intent: 'auto',
    weight: 1,
    patterns: [/skor|araç|auto|tco|kredi|sigorta|analiz|sonuç|güven/i]
  },
  {
    intent: 'pro',
    weight: 1,
    patterns: [/pro|premium|ücretli|deneme|plan|karşılaştırma limit/i]
  },
  {
    intent: 'privacy',
    weight: 1,
    patterns: [/kvkk|gizlilik|veri|silme|hesap sil|kişisel/i]
  },
  {
    intent: 'human',
    weight: 1.2,
    patterns: [/insan|canlı|whatsapp|telefon|uzman|şikayet|acil|iletişim/i]
  }
];

/**
 * @param {string} message
 */
export function classifySupportIntent(message = '') {
  const text = String(message).trim().toLowerCase();
  if (!text) {
    return { intent: 'faq_general', confidence: 0, scores: {} };
  }

  const scores = {};
  for (const row of INTENT_PATTERNS) {
    let score = 0;
    for (const re of row.patterns) {
      if (re.test(text)) score += row.weight;
    }
    if (score > 0) scores[row.intent] = score;
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return { intent: 'faq_general', confidence: 0.2, scores };
  }

  const [intent, top] = entries[0];
  const second = entries[1]?.[1] || 0;
  const confidence = Math.min(0.95, 0.45 + (top - second) * 0.2 + top * 0.1);

  return { intent, confidence, scores };
}

/**
 * @param {string} intent
 * @param {Array<object>} articles
 */
export function pickFaqForIntent(intent, articles = []) {
  const pool = articles.filter((a) => {
    if (intent === 'faq_general') return true;
    if (intent === 'human') return a.category === 'account' || a.id === 'support-human';
    return a.category === intent || a.category === 'account';
  });

  return pool.slice(0, 4);
}

/**
 * @param {object} input
 * @param {string} input.message
 * @param {Array<object>} [input.articles]
 * @param {object} [input.context]
 */
export function routeSupportRequest(input = {}) {
  const classification = classifySupportIntent(input.message || '');
  const articles = pickFaqForIntent(classification.intent, input.articles || []);

  const actions = [];
  const intent = classification.intent;

  if (intent === 'billing') {
    actions.push({
      type: 'link',
      href: '/account.html?tab=subscription&billing=portal',
      label: 'Fatura & abonelik'
    });
  }
  if (intent === 'onboarding') {
    actions.push({ type: 'link', href: '/auto/', label: 'Auto analizine başla' });
  }
  if (intent === 'pro') {
    actions.push({ type: 'link', href: '/planlar?checkout=pro', label: 'Pro planları' });
  }
  if (intent === 'human' || classification.confidence < 0.5) {
    actions.push({
      type: 'whatsapp',
      href: 'https://wa.me/905456786420?text=Merhaba%2C%20isteBul%20destek%20talebim%20var.',
      label: 'WhatsApp destek'
    });
    actions.push({ type: 'link', href: '/iletisim.html', label: 'İletişim sayfası' });
  }

  const topArticle = articles[0] || null;
  const deflected = Boolean(topArticle && classification.confidence >= 0.45 && intent !== 'human');

  return {
    ...classification,
    articles,
    actions,
    topArticle,
    deflected,
    workflow: deflected ? 'faq_automation' : 'support_escalation',
    suggestedReply: topArticle
      ? `${topArticle.answer}`
      : 'Sorunuzu kısaca iletin; size en uygun kanalı önereceğiz.'
  };
}
