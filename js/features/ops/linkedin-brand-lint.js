/**
 * P16-2 — LinkedIn operasyon metni marka uyum / risk lint (pure utility).
 * Aligned with data/ops/linkedin-templates.json lintRules (read-only contract).
 * Not wired to admin UI, AI proxy, or public runtime.
 */

/** @typedef {'post' | 'comment_opportunity'} LinkedInActionType */
/** @typedef {'ceo' | 'company' | 'both'} LinkedInAccountType */
/** @typedef {'tr' | 'en'} LinkedInLintLanguage */
/** @typedef {'warning' | 'fail'} LinkedInIssueSeverity */

/**
 * @typedef {object} LinkedInLintContext
 * @property {LinkedInActionType} [actionType]
 * @property {LinkedInAccountType} [accountType]
 * @property {LinkedInLintLanguage} [language]
 * @property {number} [maxHashtags]
 * @property {number} [maxLinks]
 */

/**
 * @typedef {object} LinkedInLintIssue
 * @property {string} code
 * @property {LinkedInIssueSeverity} severity
 * @property {string} messageTr
 * @property {string} [matched]
 */

/**
 * @typedef {object} LinkedInLintResult
 * @property {boolean} ok
 * @property {'pass' | 'warning' | 'fail'} severity
 * @property {LinkedInLintIssue[]} issues
 * @property {string} summaryTr
 */

const DEFAULT_RULES = Object.freeze({
  firstSentenceNoBrandName: true,
  noGuaranteeClaims: true,
  noFinancialAdvice: true,
  noLegalAdvice: true,
  noInvestmentAdvice: true,
  noAutoPostingLanguage: true,
  maxHashtags: 1,
  maxLinks: 1,
  avoidSalesCTA: true,
  forbiddenClaims: Object.freeze([
    'garanti tasarruf',
    'kesin kazanç',
    'en iyi karar',
    'en iyi araç',
    'garanti kazanç',
    'flaş fırsat',
    'son dakika',
    'tüm bankalar canlı',
    'anlık ilan',
    'şu krediyi alın',
    'bu evi alın'
  ]),
  aggressiveCtaPhrases: Object.freeze([
    'hemen kaydol',
    'hemen başvur',
    'satın al',
    'formu doldurun',
    'deneyin',
    'kaydolun',
    'link bio',
    'sign up',
    'try now',
    'buy now',
    'apply now'
  ]),
  automationPhrases: Object.freeze([
    'linkedin api',
    'scraping',
    'otomatik paylaşım',
    'otomatik yorum',
    'otomatik beğeni',
    'otomatik takip',
    'auto post',
    'auto comment',
    'auto like',
    'auto follow',
    'otomatik linkedin entegrasyonu',
    'automatic linkedin integration',
    'otomatik linkedin'
  ]),
  salesLinkPatterns: Object.freeze([
    /\/auto\/?/i,
    /\/planlar\b/i,
    /partner-olun/i
  ]),
  organicLinkPatterns: Object.freeze([
    /\/metodoloji\/?/i,
    /\/rehber\//i,
    /\/hakkimizda\.html/i
  ]),
  financialAdviceDisclaimerPatterns: Object.freeze([
    /finansal tavsiye\s+(veya\s+getiri taahhüdü\s+)?değildir/i,
    /not financial advice/i,
    /scores are for information only/i,
    /bilgilendirme amaçlıdır/i
  ]),
  financialAdviceFailPatterns: Object.freeze([
    /finansal tavsiye\s+ver/i,
    /\bfinansal tavsiye\b(?!.*değildir)/i,
    /\bfinancial advice\b(?!.*not financial)/i
  ]),
  legalAdvicePatterns: Object.freeze([
    /hukuki tavsiye/i,
    /legal advice/i
  ]),
  investmentAdvicePatterns: Object.freeze([
    /yatırım tavsiyesi/i,
    /investment advice/i
  ])
});

const BRAND_PATTERN = /\biste\s*bul\b|#iste\s*bul\b/i;

/**
 * @returns {typeof DEFAULT_RULES}
 */
export function getLinkedInLintRules() {
  return DEFAULT_RULES;
}

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeLinkedInTextForLint(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} text
 * @returns {string}
 */
function getFirstSentence(text) {
  const normalized = normalizeLinkedInTextForLint(text);
  if (!normalized) return '';
  const match = normalized.match(/^[^.!?\n]+[.!?]?/);
  return (match ? match[0] : normalized.split('\n')[0] || '').trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function extractLinks(text) {
  const links = [];
  const pattern = /https?:\/\/[^\s)]+|www\.[^\s)]+|istebul\.com[^\s)]*/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    links.push(match[0]);
  }
  return links;
}

/**
 * @param {string} text
 * @returns {number}
 */
function countHashtags(text) {
  const matches = text.match(/#[\p{L}\p{N}_]+/gu);
  return matches ? matches.length : 0;
}

/**
 * @param {string} haystack
 * @param {string} needle
 * @returns {boolean}
 */
function containsPhrase(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {boolean}
 */
function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * @param {LinkedInLintIssue[]} issues
 * @returns {LinkedInLintResult}
 */
function buildResult(issues) {
  const hasFail = issues.some((issue) => issue.severity === 'fail');
  const hasWarning = issues.some((issue) => issue.severity === 'warning');
  const severity = hasFail ? 'fail' : hasWarning ? 'warning' : 'pass';
  const ok = severity === 'pass';

  let summaryTr = 'Metin marka lint kontrolünden geçti.';
  if (hasFail) {
    const failCount = issues.filter((i) => i.severity === 'fail').length;
    summaryTr = `${failCount} kritik lint ihlali bulundu; metni düzeltmeden paylaşmayın.`;
  } else if (hasWarning) {
    const warnCount = issues.filter((i) => i.severity === 'warning').length;
    summaryTr = `${warnCount} uyarı bulundu; metni gözden geçirin.`;
  }

  return { ok, severity, issues, summaryTr };
}

/**
 * @param {string} text
 * @param {LinkedInLintContext} [context]
 * @returns {LinkedInLintResult}
 */
export function lintLinkedInText(text, context = {}) {
  const normalized = normalizeLinkedInTextForLint(text);
  const rules = getLinkedInLintRules();
  const actionType = context.actionType || 'post';
  const maxHashtags = context.maxHashtags ?? rules.maxHashtags;
  const maxLinks = context.maxLinks ?? rules.maxLinks;
  /** @type {LinkedInLintIssue[]} */
  const issues = [];

  if (!normalized) {
    issues.push({
      code: 'empty_text',
      severity: 'fail',
      messageTr: 'Metin boş; paylaşım veya yorum için içerik gerekli.'
    });
    return buildResult(issues);
  }

  const lower = normalized.toLowerCase();
  const firstSentence = getFirstSentence(normalized);

  if (rules.firstSentenceNoBrandName && BRAND_PATTERN.test(firstSentence)) {
    const brandSeverity = actionType === 'comment_opportunity' ? 'fail' : 'warning';
    issues.push({
      code: 'brand_in_first_sentence',
      severity: brandSeverity,
      messageTr:
        actionType === 'comment_opportunity'
          ? 'Üçüncü taraf yorumlarda ilk cümlede marka adı kullanılmamalı.'
          : 'İlk cümlede marka adı tercih edilmez; yumuşak atıf veya sonraki cümleler daha uygun.',
      matched: firstSentence.slice(0, 120)
    });
  }

  for (const phrase of rules.forbiddenClaims) {
    if (containsPhrase(lower, phrase)) {
      issues.push({
        code: 'forbidden_claim',
        severity: 'fail',
        messageTr: `Yasak iddia veya satış dili: "${phrase}".`,
        matched: phrase
      });
    }
  }

  if (rules.noGuaranteeClaims) {
    for (const phrase of ['garanti tasarruf', 'kesin kazanç', 'en iyi karar', 'guaranteed savings', 'best decision']) {
      if (containsPhrase(lower, phrase) && !issues.some((i) => i.matched === phrase)) {
        issues.push({
          code: 'guarantee_claim',
          severity: 'fail',
          messageTr: `Garanti veya kesin sonuç iddiası kullanılamaz: "${phrase}".`,
          matched: phrase
        });
      }
    }
  }

  if (rules.noFinancialAdvice) {
    const hasDisclaimer = matchesAny(normalized, rules.financialAdviceDisclaimerPatterns);
    if (!hasDisclaimer && matchesAny(normalized, rules.financialAdviceFailPatterns)) {
      issues.push({
        code: 'financial_advice',
        severity: 'fail',
        messageTr: 'Finansal tavsiye dili kullanılamaz; yalnızca bilgilendirme disclaimer\'ı uygun.'
      });
    }
  }

  if (rules.noLegalAdvice && matchesAny(normalized, rules.legalAdvicePatterns)) {
    const isDisclaimer = /değildir|not legal/i.test(normalized);
    if (!isDisclaimer) {
      issues.push({
        code: 'legal_advice',
        severity: 'fail',
        messageTr: 'Hukuki tavsiye dili kullanılamaz.'
      });
    }
  }

  if (rules.noInvestmentAdvice && matchesAny(normalized, rules.investmentAdvicePatterns)) {
    const isDisclaimer = /değildir|not investment/i.test(normalized);
    if (!isDisclaimer) {
      issues.push({
        code: 'investment_advice',
        severity: 'fail',
        messageTr: 'Yatırım tavsiyesi dili kullanılamaz.'
      });
    }
  }

  if (rules.noAutoPostingLanguage) {
    for (const phrase of rules.automationPhrases) {
      if (containsPhrase(lower, phrase)) {
        issues.push({
          code: 'automation_language',
          severity: 'fail',
          messageTr: `Otomasyon veya LinkedIn API/scraping dili yasak: "${phrase}".`,
          matched: phrase
        });
      }
    }
  }

  if (rules.avoidSalesCTA) {
    for (const phrase of rules.aggressiveCtaPhrases) {
      if (containsPhrase(lower, phrase)) {
        issues.push({
          code: 'sales_cta',
          severity: 'fail',
          messageTr: `Satış CTA'sı kullanılamaz: "${phrase}".`,
          matched: phrase
        });
      }
    }
  }

  const hashtagCount = countHashtags(normalized);
  if (hashtagCount > maxHashtags) {
    issues.push({
      code: 'hashtag_limit',
      severity: 'warning',
      messageTr: `Hashtag limiti aşıldı (${hashtagCount}/${maxHashtags}).`,
      matched: String(hashtagCount)
    });
  }

  const links = extractLinks(normalized);
  if (links.length > maxLinks) {
    issues.push({
      code: 'link_limit',
      severity: 'warning',
      messageTr: `Link limiti aşıldı (${links.length}/${maxLinks}).`,
      matched: String(links.length)
    });
  }

  for (const link of links) {
    const isOrganic = rules.organicLinkPatterns.some((pattern) => pattern.test(link));
    const isSales = rules.salesLinkPatterns.some((pattern) => pattern.test(link));
    if (isSales) {
      issues.push({
        code: 'sales_page_link',
        severity: actionType === 'comment_opportunity' ? 'fail' : 'warning',
        messageTr: 'Satış sayfası linki önerilmez; /metodoloji/ veya /rehber/ tercih edin.',
        matched: link
      });
    } else if (!isOrganic && /istebul\.com/i.test(link)) {
      issues.push({
        code: 'non_organic_link',
        severity: 'warning',
        messageTr: 'Organik olmayan site linki; metodoloji veya rehber hedefleri tercih edilir.',
        matched: link
      });
    }
  }

  return buildResult(issues);
}
