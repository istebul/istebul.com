/**
 * P16-4A-1 — LinkedIn üçüncü taraf yorum önerisi (pure utility, deterministic).
 * AI proxy, DOM, fetch veya otomasyon yok; manuel onaylı operatör workflow'u için.
 */

import { lintLinkedInText } from './linkedin-brand-lint.js';

/** @typedef {'ceo' | 'company'} LinkedInCommentAccountType */
/** @typedef {'tr' | 'en'} LinkedInCommentLanguage */
/** @typedef {'high' | 'medium' | 'fallback'} LinkedInCategoryConfidence */

/**
 * @typedef {object} LinkedInCommentCategory
 * @property {string} key
 * @property {string} labelTr
 * @property {LinkedInCategoryConfidence} confidence
 * @property {string[]} matchedKeywords
 */

/**
 * @typedef {object} LinkedInCommentSuggestion
 * @property {string} id
 * @property {string} titleTr
 * @property {string} body
 * @property {LinkedInCommentAccountType} accountType
 * @property {LinkedInCommentLanguage} language
 * @property {string} sourceTemplateId
 * @property {string} categoryKey
 * @property {import('./linkedin-brand-lint.js').LinkedInLintResult} lintResult
 */

/**
 * @typedef {object} LinkedInCommentSuggestionsResult
 * @property {boolean} ok
 * @property {LinkedInCommentCategory} category
 * @property {{ required: true, disclosureTr: string }} manualWorkflow
 * @property {LinkedInCommentSuggestion[]} suggestions
 */

/**
 * @typedef {object} LinkedInCommentInput
 * @property {string} [postText]
 * @property {LinkedInCommentAccountType} [accountType]
 * @property {LinkedInCommentLanguage} [language]
 * @property {number} [maxSuggestions]
 * @property {object} [templatesDoc]
 * @property {object} [weeklyPlanDoc]
 */

const MANUAL_DISCLOSURE_TR =
  "Bu öneriler yalnızca manuel inceleme içindir; sistem LinkedIn'e otomatik yorum göndermez.";

const MIN_POST_TEXT_LENGTH = 12;

const CATEGORY_META = Object.freeze({
  generic_ai_llm: { labelTr: 'Generic AI / LLM' },
  otomotiv: { labelTr: 'Otomotiv / TCO' },
  konut: { labelTr: 'Konut' },
  finansman: { labelTr: 'Finansman' },
  tatil: { labelTr: 'Tatil / seyahat' },
  sigorta: { labelTr: 'Sigorta' },
  kasko: { labelTr: 'Kasko' },
  b2b_partner_crm: { labelTr: 'B2B / partner / CRM' },
  kvkk_guven_halusinasyon: { labelTr: 'KVKK / güven / halüsinasyon' }
});

/** @type {ReadonlyArray<{ key: string, keywords: string[], priority: number }>} */
const CATEGORY_RULES = Object.freeze([
  {
    key: 'kasko',
    keywords: ['kasko'],
    priority: 100
  },
  {
    key: 'kvkk_guven_halusinasyon',
    keywords: [
      'kvkk',
      'halüsinasyon',
      'halusinasyon',
      'güven',
      'guven',
      'doğruluk',
      'dogruluk',
      'regülasyon',
      'regulasyon',
      'veri güven',
      'veri guven'
    ],
    priority: 90
  },
  {
    key: 'b2b_partner_crm',
    keywords: ['bayi', 'crm', 'partner', 'lead', 'satış ekibi', 'satis ekibi'],
    priority: 80
  },
  {
    key: 'generic_ai_llm',
    keywords: [
      'yapay zeka',
      'chatgpt',
      'chat gpt',
      'llm',
      'large language model',
      'prompt',
      'gpt',
      'generative ai',
      'sohbet ai'
    ],
    priority: 70
  },
  {
    key: 'otomotiv',
    keywords: ['araç', 'arac', 'otomobil', 'oto', 'tco', 'yakıt', 'yakit', 'filo', 'otomotiv'],
    priority: 60
  },
  {
    key: 'konut',
    keywords: ['konut', 'ev al', 'mortgage', 'kira', 'gayrimenkul', 'emlak'],
    priority: 50
  },
  {
    key: 'finansman',
    keywords: ['kredi', 'faiz', 'finansman', 'banka', 'taksit', 'ipotek'],
    priority: 40
  },
  {
    key: 'tatil',
    keywords: ['tatil', 'otel', 'uçak', 'ucak', 'seyahat', 'rota'],
    priority: 30
  },
  {
    key: 'sigorta',
    keywords: ['sigorta', 'poliçe', 'police', 'teminat'],
    priority: 20
  }
]);

/** @type {Record<string, string>} */
const TEMPLATE_CATEGORY_BY_ID = {
  'comment-generic-ai-ceo-tr': 'generic_ai_llm',
  'comment-generic-ai-ceo-en': 'generic_ai_llm',
  'comment-automotiv-ceo-tr': 'otomotiv',
  'comment-b2b-company-tr': 'b2b_partner_crm',
  'comment-kvkk-company-tr': 'kvkk_guven_halusinasyon',
  'rotation-ai-trust-comment-ceo-tr': 'kvkk_guven_halusinasyon'
};

/** @type {Record<string, string[]>} */
const CATEGORY_TEMPLATE_IDS = {
  generic_ai_llm: ['comment-generic-ai-ceo-tr', 'comment-generic-ai-ceo-en', 'rotation-ai-trust-comment-ceo-tr'],
  otomotiv: ['comment-automotiv-ceo-tr', 'comment-generic-ai-ceo-tr'],
  konut: ['comment-generic-ai-ceo-tr', 'rotation-konut-company-post-tr'],
  finansman: ['comment-generic-ai-ceo-tr', 'rotation-konut-company-post-tr'],
  tatil: ['comment-generic-ai-ceo-tr'],
  sigorta: ['comment-generic-ai-ceo-tr'],
  kasko: ['comment-automotiv-ceo-tr', 'comment-generic-ai-ceo-tr'],
  b2b_partner_crm: ['comment-b2b-company-tr', 'comment-generic-ai-ceo-tr'],
  kvkk_guven_halusinasyon: [
    'comment-kvkk-company-tr',
    'rotation-ai-trust-comment-ceo-tr',
    'comment-generic-ai-ceo-tr'
  ]
};

/**
 * @param {string} text
 * @returns {string}
 */
function normalizeText(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * @param {string} haystack
 * @param {string} needle
 * @returns {boolean}
 */
function containsKeyword(haystack, needle) {
  const normalizedNeedle = needle.toLowerCase();
  if (normalizedNeedle.length <= 3 && !/\s/.test(normalizedNeedle)) {
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${normalizedNeedle}(?:[^\\p{L}\\p{N}]|$)`, 'iu');
    return pattern.test(haystack);
  }
  return haystack.toLowerCase().includes(normalizedNeedle);
}

/**
 * @param {string} text
 * @returns {LinkedInCommentCategory}
 */
export function detectLinkedInCommentCategory(text) {
  const normalized = normalizeText(text);
  const lower = normalized.toLowerCase();

  if (!normalized || normalized.length < MIN_POST_TEXT_LENGTH) {
    return {
      key: 'generic_ai_llm',
      labelTr: CATEGORY_META.generic_ai_llm.labelTr,
      confidence: 'fallback',
      matchedKeywords: []
    };
  }

  /** @type {{ key: string, matchedKeywords: string[], score: number } | null} */
  let best = null;

  for (const rule of CATEGORY_RULES) {
    const matchedKeywords = rule.keywords.filter((keyword) => containsKeyword(lower, keyword));
    if (!matchedKeywords.length) continue;

    const aiStandalone =
      rule.key === 'generic_ai_llm' &&
      matchedKeywords.some((k) => k === 'gpt' || k === 'llm' || k === 'prompt');
    const hasStrongAiSignal =
      matchedKeywords.some((k) => !['gpt', 'llm', 'prompt'].includes(k)) ||
      /\b(ai|llm|gpt|chatgpt|prompt)\b/i.test(lower);

    if (rule.key === 'generic_ai_llm' && !hasStrongAiSignal && !aiStandalone) {
      continue;
    }

    const score = rule.priority + matchedKeywords.length * 5;
    if (!best || score > best.score) {
      best = { key: rule.key, matchedKeywords, score };
    }
  }

  if (!best) {
    return {
      key: 'generic_ai_llm',
      labelTr: CATEGORY_META.generic_ai_llm.labelTr,
      confidence: 'fallback',
      matchedKeywords: []
    };
  }

  const confidence =
    best.matchedKeywords.length >= 2 || best.score >= 95
      ? 'high'
      : best.matchedKeywords.length === 1
        ? 'medium'
        : 'fallback';

  return {
    key: best.key,
    labelTr: CATEGORY_META[best.key]?.labelTr || best.key,
    confidence,
    matchedKeywords: best.matchedKeywords
  };
}

/**
 * @param {LinkedInCommentInput | string | null | undefined} input
 * @param {LinkedInCommentInput} [options]
 * @returns {Required<Pick<LinkedInCommentInput, 'postText' | 'accountType' | 'language' | 'maxSuggestions'>> & LinkedInCommentInput}
 */
export function normalizeLinkedInCommentInput(input, options = {}) {
  const raw = typeof input === 'string' ? { postText: input } : input || {};
  const merged = { ...raw, ...options };

  const accountType = merged.accountType === 'company' ? 'company' : 'ceo';
  const language = merged.language === 'en' ? 'en' : 'tr';
  const maxSuggestions = Number.isFinite(merged.maxSuggestions)
    ? Math.max(1, Math.min(10, Math.trunc(merged.maxSuggestions)))
    : 3;

  return {
    ...merged,
    postText: normalizeText(merged.postText),
    accountType,
    language,
    maxSuggestions
  };
}

/**
 * @param {object | null | undefined} templatesDoc
 * @returns {object[]}
 */
function collectCommentOpportunityTemplates(templatesDoc) {
  if (!templatesDoc || typeof templatesDoc !== 'object') return [];

  const catalog = templatesDoc.templateCatalog || {};
  /** @type {object[]} */
  const templates = [];

  for (const group of Object.values(catalog)) {
    const groupTemplates = Array.isArray(group?.templates) ? group.templates : [];
    for (const template of groupTemplates) {
      if (template?.actionType === 'comment_opportunity') {
        templates.push(template);
      }
    }
  }

  return templates;
}

/**
 * @param {object} template
 * @returns {string}
 */
function getTemplateCategoryKey(template) {
  const id = String(template?.id || '');
  if (TEMPLATE_CATEGORY_BY_ID[id]) return TEMPLATE_CATEGORY_BY_ID[id];

  const title = String(template?.titleTr || '').toLowerCase();
  if (title.includes('otomotiv') || title.includes('tco')) return 'otomotiv';
  if (title.includes('b2b') || title.includes('partner') || title.includes('crm')) return 'b2b_partner_crm';
  if (title.includes('kvkk') || title.includes('güven') || title.includes('halüsinasyon')) {
    return 'kvkk_guven_halusinasyon';
  }
  if (title.includes('generic ai') || title.includes('llm') || title.includes('ai güven')) {
    return 'generic_ai_llm';
  }

  return 'generic_ai_llm';
}

/**
 * @param {object} template
 * @param {string} categoryKey
 * @param {LinkedInCommentAccountType} accountType
 * @param {LinkedInCommentLanguage} language
 * @returns {number}
 */
function scoreTemplate(template, categoryKey, accountType, language) {
  let score = 0;
  const templateLanguage = template?.language === 'en' ? 'en' : 'tr';
  const templateAccount = template?.accountType === 'company' ? 'company' : 'ceo';
  const templateCategory = getTemplateCategoryKey(template);

  if (templateLanguage === language) score += 100;
  if (templateAccount === accountType) score += 50;
  if (templateCategory === categoryKey) score += 40;
  else if (templateCategory === 'generic_ai_llm') score += 15;

  const preferredIds = CATEGORY_TEMPLATE_IDS[categoryKey] || [];
  const idIndex = preferredIds.indexOf(String(template?.id || ''));
  if (idIndex >= 0) score += 30 - idIndex * 3;

  return score;
}

/**
 * @param {object[]} templates
 * @param {string} categoryKey
 * @param {LinkedInCommentAccountType} accountType
 * @param {LinkedInCommentLanguage} language
 * @param {number} maxSuggestions
 * @returns {object[]}
 */
export function selectLinkedInCommentTemplates(
  templates,
  categoryKey,
  accountType,
  language,
  maxSuggestions
) {
  const candidates = Array.isArray(templates) ? templates.slice() : [];
  if (!candidates.length) return [];

  const ranked = candidates
    .map((template, index) => ({
      template,
      score: scoreTemplate(template, categoryKey, accountType, language),
      index
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  /** @type {object[]} */
  const selected = [];
  const seenBodies = new Set();

  for (const { template } of ranked) {
    const body = normalizeText(template?.bodyTemplate);
    if (!body || seenBodies.has(body)) continue;
    seenBodies.add(body);
    selected.push(template);
    if (selected.length >= maxSuggestions) break;
  }

  return selected;
}

/**
 * @param {object} template
 * @param {string} categoryKey
 * @param {LinkedInCommentAccountType} accountType
 * @param {LinkedInCommentLanguage} language
 * @param {number} index
 * @returns {LinkedInCommentSuggestion}
 */
function buildSuggestion(template, categoryKey, accountType, language, index) {
  const body = normalizeText(template?.bodyTemplate);
  const lintResult = lintLinkedInText(body, { actionType: 'comment_opportunity' });
  const templateId = String(template?.id || `suggestion-${index + 1}`);

  return {
    id: `${templateId}-suggestion-${index + 1}`,
    titleTr: String(template?.titleTr || 'Yorum önerisi'),
    body,
    accountType: template?.accountType === 'company' ? 'company' : accountType,
    language: template?.language === 'en' ? 'en' : language,
    sourceTemplateId: templateId,
    categoryKey,
    lintResult
  };
}

/**
 * @param {LinkedInCommentInput | string | null | undefined} input
 * @param {LinkedInCommentInput} [options]
 * @returns {LinkedInCommentSuggestionsResult}
 */
export function suggestLinkedInComments(input, options = {}) {
  const normalized = normalizeLinkedInCommentInput(input, options);
  const category = detectLinkedInCommentCategory(normalized.postText);
  const templates = collectCommentOpportunityTemplates(normalized.templatesDoc);
  const selectedTemplates = selectLinkedInCommentTemplates(
    templates,
    category.key,
    normalized.accountType,
    normalized.language,
    normalized.maxSuggestions
  );

  const suggestions = selectedTemplates.map((template, index) =>
    buildSuggestion(template, category.key, normalized.accountType, normalized.language, index)
  );

  return {
    ok: true,
    category,
    manualWorkflow: {
      required: true,
      disclosureTr: MANUAL_DISCLOSURE_TR
    },
    suggestions
  };
}
