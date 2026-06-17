/**
 * AI Executive Insight — deterministic narration layer (Final V1).
 * Scores and costs come from rule engines; this module only produces Turkish insight copy.
 */
import { formatMoney } from '../../core/format.js';
import { postAiProxy } from '../../core/ai-proxy-client.js';
import { sanitizeAiNarrative } from '../../engines/decision-consultant.js';
import {
  isTechnicalPreferenceValue,
  preferencePhrase,
  stripTechnicalTokensFromCopy
} from '../../core/user-facing-text.js';
import { formatScore, formatScoreOutOf100 } from '../results/results-engine.js';
import { buildAutoHouseholdInsightClause } from '../../auto/auto-wizard-profile.js';
import {
  buildKonutCashBufferInsightClause,
  buildKonutCashBufferNextStepClause,
  buildKonutCashBufferRiskClause,
  buildKonutEarthquakeInsightClause,
  buildKonutHouseholdInsightClause,
  buildKonutLocationPreferenceInsightClause
} from '../../konut/konut-wizard-profile.js';

export const BANNED_WEAK_PHRASES = Object.freeze([
  'bu karar sizin için uygun olabilir',
  'daha detaylı araştırma yapmanız önerilir',
  'genel olarak iyi görünüyor',
  'ai yorumu hazırlanıyor',
  'verilere göre değerlendirme yapılmıştır',
  'garanti kazanç',
  'kesin en iyi karar',
  'risksiz'
]);

const USAGE_LABELS = {
  family: 'aile kullanımı',
  city: 'şehir içi kullanım',
  long: 'uzun yol',
  business: 'iş ve prestij kullanımı',
  longRoad: 'uzun yol',
  prestige: 'konfor ve prestij'
};

const FUEL_LABELS = {
  gasoline: 'benzin',
  diesel: 'dizel',
  hybrid: 'hibrit',
  electric: 'elektrik',
  lpg: 'LPG'
};

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeVertical(vertical) {
  const v = String(vertical || 'konut').toLowerCase();
  if (v === 'sigorta' || v === 'insurance') return 'sigorta';
  if (v === 'kasko') return 'kasko';
  if (['auto', 'konut', 'tatil', 'finansman', 'sigorta', 'kasko'].includes(v)) return v;
  return 'konut';
}

/** Normalize Cloudflare ai-proxy JSON ({ result }) and legacy shapes. */
export function extractAiProxyText(data) {
  return String(data?.result ?? data?.text ?? data?.output ?? data?.message ?? '').trim();
}

function normalizePlanTier(planTier) {
  const t = String(planTier || 'guest').toLowerCase();
  if (t === 'pro' || t === 'free') return t;
  return 'guest';
}

function pickStr(...values) {
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (s) return s;
  }
  return '';
}

function pickAnswer(answers, keys) {
  const a = answers && typeof answers === 'object' ? answers : {};
  for (const key of keys) {
    const v = a[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

export function containsBannedWeakPhrase(text) {
  const n = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return BANNED_WEAK_PHRASES.some((p) => n.includes(p));
}

export function sanitizeInsightText(text, maxLen = 900) {
  let out = sanitizeAiNarrative(String(text || ''), maxLen);
  for (const banned of BANNED_WEAK_PHRASES) {
    const re = new RegExp(banned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '').trim();
  }
  out = stripTechnicalTokensFromCopy(out);
  return out.replace(/\s{2,}/g, ' ').trim();
}

function formatTry(value, locale = 'tr-TR') {
  const n = safeNum(value);
  if (n == null || n <= 0) return null;
  return formatMoney(n, locale);
}

function scoreFromInput(input) {
  const s = input.scores || {};
  return {
    decision: clampScore(s.decision ?? s.decisionScore ?? input.decisionScore),
    confidence: clampScore(s.confidence ?? s.confidenceScore ?? input.confidenceScore),
    overallRisk: pickStr(s.overallRisk, s.riskLabel, input.overallRisk) || 'Orta',
    label: pickStr(s.scoreLabel, input.scoreLabel)
  };
}

function topRisk(input) {
  const risks = input.risks;
  if (Array.isArray(risks) && risks.length) {
    const high = risks.find((r) => String(r?.level || '').toLowerCase().includes('yüksek'));
    const pick = high || risks[0];
    if (typeof pick === 'string') return { title: 'Risk', description: pick, level: 'orta' };
    return {
      title: pick.title || pick.key || 'Risk',
      description: pick.description || pick.recommendation || '',
      level: pick.level || 'orta'
    };
  }
  if (risks && typeof risks === 'object' && !Array.isArray(risks)) {
    const firstKey = Object.keys(risks)[0];
    if (firstKey) return { title: firstKey, description: String(risks[firstKey]), level: 'orta' };
  }
  return null;
}

function positiveFactor(input) {
  const factors = input.scores?.factors || input.scoreFactors || [];
  const pos = factors.find((f) => String(f?.impact || '').startsWith('+'));
  return pos || factors[0] || null;
}

function negativeFactor(input) {
  const factors = input.scores?.factors || input.scoreFactors || [];
  const neg = factors.find((f) => String(f?.impact || '').startsWith('-'));
  return neg || factors[1] || null;
}

function shortDisclaimer() {
  return 'Bu yorum karar destek amaçlıdır; bağlayıcı finansal veya hukuki tavsiye değildir. Skorlar kural motorundan gelir.';
}

function missingDataNote(topic) {
  return `Bu başlıkta net skor üretmek için ek veri gerekir${topic ? ` (${topic})` : ''}.`;
}

/**
 * @param {object} raw
 * @returns {import('./ai-insight-engine.js').InsightInput}
 */
export function normalizeInsightInput(raw = {}) {
  const vertical = normalizeVertical(raw.vertical || raw.category);
  const answers = raw.answers || raw.userProfile || raw.formData || {};
  const costs = raw.costs || {};
  const recommendation = raw.recommendation || {};

  return {
    vertical,
    userProfile: raw.userProfile || answers,
    answers,
    scores: {
      decision: raw.scores?.decision ?? raw.decisionScore,
      confidence: raw.scores?.confidence ?? raw.confidenceScore,
      overallRisk: raw.scores?.overallRisk ?? raw.overallRisk,
      scoreLabel: raw.scores?.scoreLabel ?? raw.scoreLabel,
      factors: raw.scores?.factors || raw.scoreFactors || []
    },
    costs,
    risks: raw.risks || raw.riskAnalysis || [],
    recommendation: {
      level: recommendation.level || raw.recommendationLevel,
      label: recommendation.label || raw.recommendationLabel,
      name: recommendation.name || raw.recommendationName
    },
    alternatives: raw.alternatives || [],
    confidence: raw.confidence ?? raw.confidenceScore,
    planTier: normalizePlanTier(raw.planTier),
    locale: raw.locale || 'tr-TR',
    strengths: raw.strengths || [],
    weaknesses: raw.weaknesses || raw.cautions || [],
    warnings: raw.warnings || [],
    marketAssessment: String(raw.marketAssessment || '').trim(),
    earthquakeActivityAssessment: String(raw.earthquakeActivityAssessment || '').trim()
  };
}

/**
 * Map Decision Intelligence V3 output to insight input.
 */
export function buildInsightInputFromIntelligence(category, context = {}, intelligence = {}, extras = {}) {
  const vertical = normalizeVertical(category);
  const form = context.formData || context || {};
  const answers = { ...form };

  const costs = { ...extras.costs };
  if (vertical === 'auto') {
    costs.tco12 = costs.tco12 ?? context.totalCost ?? safeNum(form.budget);
    costs.budget = costs.budget ?? context.budget;
    costs.vehiclePrice = costs.vehiclePrice ?? context.vehiclePrice;
  }
  if (vertical === 'konut') {
    costs.monthlyPayment = costs.monthlyPayment ?? context.monthlyPayment;
    costs.budget = costs.budget ?? context.budget;
    costs.duesMonthly = costs.duesMonthly ?? form.duesExpectation;
  }
  if (vertical === 'tatil') {
    costs.totalBudget = costs.totalBudget ?? context.totalCost ?? context.budgetTarget;
    costs.perPerson = costs.perPerson;
  }
  if (vertical === 'finansman') {
    costs.monthlyPayment = costs.monthlyPayment ?? context.monthlyPayment;
    costs.paymentToIncome = costs.paymentToIncome ?? context.paymentToIncome;
  }
  if (vertical === 'sigorta') {
    costs.premiumBand = costs.premiumBand ?? context.premiumBand;
  }

  return normalizeInsightInput({
    vertical,
    answers,
    scores: {
      decision: intelligence.decisionScore,
      confidence: intelligence.confidenceScore,
      overallRisk: intelligence.overallRisk,
      scoreLabel: intelligence.scoreLabel,
      factors: intelligence.scoreFactors
    },
    costs,
    risks: intelligence.riskAnalysis,
    recommendation: {
      level: intelligence.recommendationLevel,
      label: intelligence.recommendationLabel
    },
    alternatives: intelligence.alternatives,
    warnings: intelligence.warnings,
    planTier: extras.planTier || 'guest',
    locale: extras.locale || 'tr-TR',
    strengths: extras.strengths,
    weaknesses: extras.weaknesses,
    marketAssessment: extras.marketAssessment || context.marketAssessment || '',
    earthquakeActivityAssessment:
      extras.earthquakeActivityAssessment || context.earthquakeActivityAssessment || ''
  });
}

function appendMarketAssessment(summary, input) {
  const market = String(input.marketAssessment || '').trim();
  if (!market) return summary;
  if (summary.includes(market.slice(0, 40))) return summary;
  return `${summary} ${market}`.trim();
}

function appendEarthquakeActivityAssessment(summary, input) {
  const activity = String(input.earthquakeActivityAssessment || '').trim();
  if (!activity) return summary;
  if (summary.includes(activity.slice(0, 40))) return summary;
  return `${summary} ${activity}`.trim();
}

function buildAutoInsight(input) {
  const a = input.answers;
  const usage = pickAnswer(a, ['usage']) || '';
  const usageKey = usage === 'longRoad' ? 'long' : usage === 'prestige' ? 'business' : usage;
  const usageLabel = USAGE_LABELS[usage] || USAGE_LABELS[usageKey] || usageKey || 'kullanım profiliniz';
  const fuel = pickAnswer(a, ['fuel']) || '';
  const fuelLabel = isTechnicalPreferenceValue(fuel) ? '' : FUEL_LABELS[fuel] || '';
  const km = safeNum(a.km);
  const loan = pickAnswer(a, ['loan']);
  const budgetTry = formatTry(input.costs.budget ?? a.budget, input.locale);
  const tcoTry = formatTry(input.costs.tco12 ?? input.costs.months12, input.locale);
  const { decision, overallRisk } = scoreFromInput(input);
  const recName = pickStr(input.recommendation?.name, input.recommendation?.label);

  const operatingFocus =
    tcoTry && budgetTry ?
      `işletme maliyeti (${tcoTry} / 12 ay tahmini TCO) satın alma fiyatına göre daha belirleyici`
    : tcoTry ?
      `yıllık toplam yük (${tcoTry}) bütçe planınızın merkezinde`
    : 'toplam sahip olma maliyeti satın alma fiyatından daha belirleyici';

  const summaryParts = [
    recName ? `${recName} seçeneği` : 'Bu araç seçeneği',
    loan === 'yes' ?
      'kredi yükü ve yıllık kullanım seviyeniz birlikte değerlendirildiğinde'
    : 'peşin/kısıtlı finansman ve kullanım profiliniz birlikte değerlendirildiğinde',
    operatingFocus + ' görünüyor.',
    decision != null ? `Karar skoru ${formatScoreOutOf100(decision)}.` : ''
  ].filter(Boolean);

  const fuelPart = fuelLabel ? `${fuelLabel} tercihiniz` : preferencePhrase(fuel, 'fuel');
  const whyParts = [
    fuelPart || null,
    km ? `yıllık ${km.toLocaleString('tr-TR')} km planı` : null,
    usageLabel && !isTechnicalPreferenceValue(usage) ? usageLabel : null,
    budgetTry ? `bütçe bandı ${budgetTry}` : null
  ].filter(Boolean);

  const householdClause = buildAutoHouseholdInsightClause(a);
  const whyCore =
    whyParts.length ?
      `${whyParts.join(', ')} ile riskin ${overallRisk.toLowerCase()} kalmasının nedeni; yakıt, bakım ve ikinci el değerinin mevcut skor modelinde dengeli okunmasıdır.`
    : missingDataNote('kullanım ve bütçe');
  const why = householdClause ? `${householdClause}. ${whyCore}` : whyCore;

  const riskItem = topRisk(input);
  const risk =
    riskItem?.description ?
      `${riskItem.title}: ${riskItem.description}`
    : loan === 'yes' ?
      'Kredi vadesi ve toplam geri ödeme, banka onayı ve faiz güncellemesiyle değişebilir; simülasyon rakamları bağlayıcı değildir.'
    : 'Sigorta primi ve ikinci el likidite, il ve hasar geçmişine göre sapma gösterebilir.';

  const nextStep =
    loan === 'yes' ?
      'Satın almadan önce kredi vadesi ile sigorta teklifini aynı tabloda karşılaştırın.'
    : 'Ekspertiz, garanti kapsamı ve güncel sigorta tekliflerini lider modele göre doğrulayın.';

  return {
    summary: appendMarketAssessment(summaryParts.join(' '), input),
    why,
    risk,
    nextStep
  };
}

function buildKonutInsight(input) {
  const a = input.answers;
  const city = pickAnswer(a, ['city']);
  const district = pickAnswer(a, ['district']);
  const location = [city, district].filter(Boolean).join(' / ') || 'seçtiğiniz bölge';
  const budgetTry = formatTry(input.costs.budget ?? a.totalBudget, input.locale);
  const monthlyTry = formatTry(input.costs.monthlyPayment, input.locale);
  const dues = safeNum(input.costs.duesMonthly ?? a.duesExpectation);
  const purpose = pickAnswer(a, ['purchasePurpose']) || 'kullanım amacınız';
  const financing = pickAnswer(a, ['useFinancing']);
  const { decision, overallRisk, label } = scoreFromInput(input);
  const eq = safeNum(a.earthquakeRiskScore ?? a.earthquakeRiskInput ?? input.costs.earthquakeRisk);
  const dti = safeNum(input.costs.dti ?? a.dti);

  const locationClause = buildKonutLocationPreferenceInsightClause(a);
  const householdClause = buildKonutHouseholdInsightClause(a);
  const cashBufferClause = buildKonutCashBufferInsightClause(a);
  const earthquakeClause = buildKonutEarthquakeInsightClause(a);
  const cashBufferRisk = buildKonutCashBufferRiskClause(a);
  const cashBufferNext = buildKonutCashBufferNextStepClause(a);

  const summary = [
    `${location} için konut kararında`,
    budgetTry ? `bütçe ${budgetTry}` : 'bütçe hedefiniz',
    purpose.includes('Yatırım') ? 'yatırım perspektifi' : 'yaşam amacı',
    `ile skor ${decision != null ? `${decision}/100` : 'modellenmiş'} (${label || 'değerlendirme'}).`,
    monthlyTry ? `Aylık ödeme tahmini ${monthlyTry}.` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const whyBits = [];
  if (locationClause) whyBits.push(locationClause);
  if (householdClause) whyBits.push(householdClause);
  if (cashBufferClause) whyBits.push(cashBufferClause);
  if (financing === 'evet' || financing === 'yes') whyBits.push('kredi/peşinat dengesi');
  if (dues != null) whyBits.push(`aidat beklentisi (${formatTry(dues, input.locale) || 'tanımlı'})`);
  if (earthquakeClause) whyBits.push(earthquakeClause);
  else if (eq != null && eq >= 60) whyBits.push('deprem/zemin riski skoru yüksek');
  else if (eq != null) whyBits.push('zemin riski görece kontrollü');
  if (dti != null && dti > 45) whyBits.push(`borç/gelir baskısı (%${Math.round(dti)})`);

  const why =
    whyBits.length ?
      `${whyBits.join('; ')} — lokasyon ve maliyet kalemleri birlikte okunduğunda ${overallRisk.toLowerCase()} risk bandı oluşuyor.`
    : missingDataNote('lokasyon ve finansman');

  const risk =
    cashBufferRisk ||
    (earthquakeClause && eq != null && eq >= 55 ?
      `${earthquakeClause.charAt(0).toUpperCase()}${earthquakeClause.slice(1)}.`
    : eq != null && eq >= 65 ?
      'Deprem ve zemin riski bu ilçe profilinde belirleyici; güncel zemin/deprem raporu teyit edilmeli.'
    : dues != null && dues > 5000 ?
      'Aidat ve site giderleri aylık nakit akışını sıkıştırabilir.'
    : topRisk(input)?.description ||
      'Tapu, iskan ve ekspertiz bulguları model skorunu değiştirebilir; resmi evrak kontrolü şart.');

  const defaultNextStep =
    purpose.includes('Kiralamak') ?
      'Kira sözleşmesi, depozito ve aidat kalemlerini yıllık toplam maliyetle karşılaştırın.'
    : 'Kredi ön onayı ve bölge emsali (en az 3 ilan) ile teklif aşamasına geçmeden önce ekspertiz planlayın.';
  const nextStep = cashBufferNext ? `${cashBufferNext} ${defaultNextStep}` : defaultNextStep;

  return {
    summary: appendEarthquakeActivityAssessment(appendMarketAssessment(summary, input), input),
    why,
    risk,
    nextStep
  };
}

function buildTatilInsight(input) {
  const a = input.answers;
  const travelers = safeNum(a.travelers_count) || 2;
  const child = a.people_type === 'cocuklu-aile';
  const season = pickAnswer(a, ['season', 'travel_season', 'date_flexibility']);
  const transport = pickAnswer(a, ['transport_preference']);
  const vacationType = pickAnswer(a, ['vacation_type']);
  const budgetTry = formatTry(input.costs.totalBudget ?? a.budget_total ?? a.budget_manual, input.locale);
  const totalTry = formatTry(input.costs.realTotal ?? input.costs.total, input.locale);
  const { decision, overallRisk } = scoreFromInput(input);

  const summary = [
    `${travelers} kişilik`,
    child ? 'çocuklu aile' : 'yetişkin',
    vacationType ? `${vacationType} planı` : 'tatil planı',
    budgetTry ? `için hedef bütçe ${budgetTry}` : '',
    totalTry ? `— model toplam ${totalTry}.` : '.',
    decision != null ? `Karar skoru ${decision}/100.` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const why =
    [
      season ? `sezon/esneklik (${season})` : null,
      transport ? `ulaşım tercihi (${transport})` : null,
      child ? 'çocuklu aile uygunluğu' : null
    ]
      .filter(Boolean)
      .join(', ') ?
      `${[season, transport, child ? 'aile profili' : null].filter(Boolean).join(' ve ')} girdilerinizle konaklama tipi uyumu ${overallRisk.toLowerCase()} risk üretiyor.`
    : missingDataNote('sezon ve ulaşım');

  const risk =
    totalTry && budgetTry ?
      'Toplam plan maliyeti hedef bütçeyi aşarsa rezerv ve aktivite kalemlerini kısmanız gerekir.'
    : child && vacationType && !['cocuk-dostu', 'deniz-resort'].includes(vacationType) ?
      'Çocuklu aile için aktivite ve oda uygunluğunu konaklama yorumlarından teyit edin.'
    : topRisk(input)?.description || 'Sezon yoğunluğu konaklama ve ulaşım fiyatlarını yukarı çekebilir.';

  const nextStep =
    season === 'sabit' || season === 'fixed' ?
      'Tarihleri bir hafta kaydırarak fiyat farkını kontrol edin; iptal koşullarını okuyun.'
    : 'Konaklama yorumları, ulaşım bağlantısı ve gizli masrafları toplam bütçe tablosuna ekleyin.';

  return {
    summary: appendMarketAssessment(summary, input),
    why,
    risk,
    nextStep
  };
}

function buildFinansmanInsight(input) {
  const a = input.answers;
  const income = safeNum(a.monthly_income);
  const debt = safeNum(a.existing_debt);
  const monthlyTry = formatTry(input.costs.monthlyPayment, input.locale);
  const pti = safeNum(input.costs.paymentToIncome ?? input.costs.incomeLoadPct);
  const term = safeNum(input.costs.termMonths ?? (a.term_months === '60' ? 60 : a.term_months === '24' ? 24 : 36));
  const early = pickAnswer(a, ['early_payment']);
  const { decision, overallRisk } = scoreFromInput(input);

  const summary = [
    income ? `Aylık gelir ${formatTry(income, input.locale)}` : 'Gelir profiliniz',
    monthlyTry ? `için tahmini ödeme ${monthlyTry}` : '',
    term ? `(${term} ay vade senaryosu).` : '.',
    decision != null ? `Ödeme güvenliği skoru ${decision}/100, genel risk ${overallRisk}.` : ''
  ]
    .filter(Boolean)
    .join(' ');

  const why =
    pti != null ?
      `Borçluluk oranı modellenen aylık yük/gelir (%${Math.round(pti)}) ile ${debt ? `mevcut borç ${formatTry(debt, input.locale)} ` : ''}birlikte okunuyor; nakit akışı ${pti > 45 ? 'sıkışık' : 'yönetilebilir'} bandında.`
    : missingDataNote('gelir ve borç');

  const risk =
    pti != null && pti > 45 ?
      'Aylık yük/gelir sınırın üzerinde modelleniyor; faiz artışı veya gelir dalgalanması ödeme planını zorlayabilir.'
    : early === 'yuksek' ?
      'Erken kapama avantajı var; ancak sözleşmedeki ceza ve sigorta bağlantılı ürünleri kontrol edin.'
    : topRisk(input)?.description || 'Kampanya dışı faiz oranı ve dosya masrafları toplam maliyeti artırabilir.';

  const nextStep =
    'En az iki kurumdan EYM dahil teklif alın; vade ve erken ödeme senaryolarını aynı tabloda karşılaştırın.';

  return {
    summary: appendMarketAssessment(summary, input),
    why,
    risk,
    nextStep
  };
}

function buildKaskoInsight(input) {
  const a = input.answers;
  const { decision, overallRisk } = scoreFromInput(input);
  const level = pickAnswer(a, ['coverage_level']) || 'kasko paketi';
  const summary = [
    decision != null
      ? `${level} için karar skoru ${decision}/100.`
      : 'Kasko profili ön değerlendirme aşamasında.',
    'Teminat, onarım riski ve prim verimliliği sabit ağırlıklarla birleştirilir.'
  ].join(' ');
  const why = `Güçlü: ${(input.strengths || []).slice(0, 2).join('; ') || '—'}. Dikkat: ${(input.weaknesses || []).slice(0, 2).join('; ') || '—'}.`;
  const risk =
    overallRisk === 'Yüksek'
      ? 'Geniş teminat veya muafiyet detayları teklif aşamasında netleştirilmeli.'
      : 'Prim artışı ve parça maliyeti poliçe döneminde değişebilir.';
  const nextStep = 'İki farklı kasko teklifinde cam, ikame araç ve mini onarım maddelerini karşılaştırın.';
  return { summary, why, risk, nextStep };
}

function buildSigortaInsight(input) {
  const a = input.answers;
  const { decision, overallRisk } = scoreFromInput(input);
  const type = pickAnswer(a, ['insurance_type']) || 'sigorta profili';
  const strengths = (input.strengths || []).slice(0, 2).join('; ') || '—';
  const weaknesses = (input.weaknesses || []).slice(0, 2).join('; ') || '—';

  const summary = [
    decision != null ?
      `${type} analizi tamamlandı; karar skoru ${decision}/100 (${input.scores?.scoreLabel || 'modellenmiş band'}).`
    : `${type} için ön değerlendirme oluşturuldu.`,
    'Skorlar koruma, teminat yeterliliği ve maliyet verimliliği bileşenlerinden türetilir; motor skoru değiştirmez.'
  ].join(' ');

  const why = `Güçlü yönler: ${strengths}. Zayıf veya dikkat gerektiren alanlar: ${weaknesses}.`;
  const risk =
    overallRisk === 'Yüksek' ?
      'Teminat boşlukları veya prim baskısı yüksek modelleniyor; poliçe şartlarını ve muafiyetleri teklif aşamasında doğrulayın.'
    : topRisk(input)?.description ||
      'Prim artışı, muafiyet ve yenileme koşulları toplam koruma maliyetini değiştirebilir.';

  const nextStep =
    'En az iki sigorta sağlayıcısından EYM dahil teklif isteyin; teminat limitleri ve muafiyetleri yan yana karşılaştırın.';

  return { summary, why, risk, nextStep };
}

function buildVerticalInsight(input) {
  switch (input.vertical) {
    case 'auto':
      return buildAutoInsight(input);
    case 'tatil':
      return buildTatilInsight(input);
    case 'finansman':
      return buildFinansmanInsight(input);
    case 'sigorta':
      return buildSigortaInsight(input);
    case 'kasko':
      return buildKaskoInsight(input);
  }
  return buildKonutInsight(input);
}

/**
 * Full decision insight blocks (guest/free: concise; pro handled in buildProInsight).
 */
export function buildDecisionInsight(rawInput = {}) {
  const input = normalizeInsightInput(rawInput);
  const isPro = input.planTier === 'pro';
  const core = buildVerticalInsight(input);
  const pos = positiveFactor(input);
  const neg = negativeFactor(input);

  if (pos?.reason && !core.why.includes(pos.reason)) {
    core.why += ` Güçlü sinyal: ${pos.label} — ${pos.reason}.`;
  }
  if (neg?.reason && !core.risk.includes(neg.reason)) {
    core.risk += ` Dikkat: ${neg.label} — ${neg.reason}.`;
  }

  if (!isPro) {
    core.risk = core.risk.split('.')[0] + (core.risk.includes('.') ? '.' : '');
    const steps = core.nextStep.split(';');
    core.nextStep = steps[0] || core.nextStep;
  }

  const disclaimer = shortDisclaimer();

  const blocks = {
    summary: sanitizeInsightText(core.summary, isPro ? 520 : 380),
    why: sanitizeInsightText(core.why, isPro ? 480 : 320),
    risk: sanitizeInsightText(core.risk, isPro ? 400 : 260),
    nextStep: sanitizeInsightText(core.nextStep, isPro ? 320 : 220),
    disclaimer: sanitizeInsightText(disclaimer, 280)
  };

  return {
    ...blocks,
    vertical: input.vertical,
    planTier: input.planTier,
    source: 'engine'
  };
}

/**
 * Executive summary paragraph(s) for result panels and PDF lead.
 */
export function buildExecutiveSummary(rawInput = {}) {
  const insight = buildDecisionInsight(rawInput);
  const input = normalizeInsightInput(rawInput);
  const isPro = input.planTier === 'pro';

  if (isPro) {
    return sanitizeInsightText(
      [insight.summary, insight.why, `Ana risk: ${insight.risk}`, insight.disclaimer].join(' '),
      950
    );
  }

  return sanitizeInsightText(
    [insight.summary, insight.why, insight.disclaimer].join(' '),
    720
  );
}

export function buildRiskNarrative(rawInput = {}) {
  const insight = buildDecisionInsight(rawInput);
  const input = normalizeInsightInput(rawInput);
  const risks = Array.isArray(input.risks) ? input.risks : [];
  const lines = risks.slice(0, input.planTier === 'pro' ? 4 : 2).map((r) => {
    if (typeof r === 'string') return sanitizeInsightText(r, 200);
    return sanitizeInsightText(`${r.title || 'Risk'} (${r.level || '—'}): ${r.description || ''}`, 220);
  });
  if (!lines.length) lines.push(insight.risk);
  return lines.filter(Boolean);
}

export function buildNextBestActions(rawInput = {}) {
  const input = normalizeInsightInput(rawInput);
  const insight = buildDecisionInsight(rawInput);
  const fromIntel = input.recommendation?.nextSteps;
  const base = [insight.nextStep];

  if (Array.isArray(fromIntel)) base.push(...fromIntel.slice(0, 2));

  const max = input.planTier === 'pro' ? 3 : 1;
  return [...new Set(base.map((s) => sanitizeInsightText(s, 240)).filter(Boolean))].slice(0, max);
}

function buildNext90DayPlan(rawInput = {}) {
  const input = normalizeInsightInput({ ...rawInput, planTier: 'pro' });
  const actions = buildNextBestActions(input);
  const vertical = input.vertical;
  const horizon = [
    '0–30 gün: teklif, ekspertiz ve finansman ön onayını netleştirin.',
    '30–60 gün: sözleşme maddeleri, sigorta ve toplam maliyet tablosunu doğrulayın.',
    '60–90 gün: teslimat, bakım planı ve ikinci el değer senaryosunu izleyin.'
  ];

  if (vertical === 'konut') {
    horizon[0] = '0–30 gün: bölge emsali, tapu ve kredi ön onayı.';
    horizon[1] = '30–60 gün: aidat, sigorta ve taşınma maliyet tablosu.';
  } else if (vertical === 'tatil') {
    horizon[0] = '0–30 gün: rezervasyon, iptal koşulları ve ulaşım teyidi.';
    horizon[1] = '30–60 gün: sezon fiyat hareketi ve alternatif tarih planı.';
  } else if (vertical === 'finansman') {
    horizon[0] = '0–30 gün: gelir/borç tablosu ve faiz senaryoları.';
    horizon[1] = '30–60 gün: erken ödeme ve nakit akışı stres testi.';
  }

  return actions.length ?
      actions.map((step, i) => `${i + 1}. ${step}`)
    : horizon;
}

/**
 * Pro-tier extended insight package.
 */
export function buildProInsight(rawInput = {}) {
  const input = normalizeInsightInput({ ...rawInput, planTier: 'pro' });
  const insight = buildDecisionInsight(input);
  const scores = scoreFromInput(input);
  const neg = negativeFactor(input);
  const alt = (input.alternatives || [])[0];
  const costLines = [];

  const budgetTry = formatTry(input.costs.budget ?? input.costs.totalBudget, input.locale);
  const monthlyTry = formatTry(input.costs.monthlyPayment, input.locale);
  const tcoTry = formatTry(input.costs.tco12 ?? input.costs.realTotal, input.locale);
  if (budgetTry) costLines.push(`Bütçe referansı: ${budgetTry}.`);
  if (monthlyTry) costLines.push(`Aylık nakit etkisi: ${monthlyTry}.`);
  if (tcoTry) costLines.push(`Toplam yük tahmini: ${tcoTry}.`);

  const criticalVar =
    neg?.label ?
      `${neg.label} — ${neg.reason || 'skor üzerinde baskı oluşturuyor'}`
    : topRisk(input)?.title || 'Finansman veya belirsizlik bandı';

  return {
    executiveSummary: insight.summary,
    criticalReason: insight.why,
    mainRisk: insight.risk,
    costPressure: costLines.join(' ') || 'Maliyet kalemleri mevcut motor çıktısından okunmalıdır; ek tahmin eklenmedi.',
    alternativeScenario: alt ?
      `${alt.title || 'Alternatif'}: ${alt.description || alt.reason || 'Skor/maliyet dengesi farklı olabilir.'}`
    : 'Alternatif senaryo için ikinci en güçlü seçeneği TCO ve risk ile yan yana kıyaslayın.',
    criticalVariable: criticalVar,
    nextSteps: buildNextBestActions(input),
    decisionScore: scores.decision,
    confidenceScore: scores.confidence,
    disclaimer: insight.disclaimer,
    source: 'engine'
  };
}

/**
 * PDF-oriented structured insight (deterministic).
 */
export function buildPdfInsight(rawInput = {}) {
  const input = normalizeInsightInput({ ...rawInput, planTier: rawInput.planTier === 'pro' ? 'pro' : 'free' });
  const insight = buildDecisionInsight(input);
  const pro = input.planTier === 'pro' ? buildProInsight(input) : null;
  const pos = positiveFactor(input);
  const neg = negativeFactor(input);
  const risks = buildRiskNarrative(input);

  const decisionReasons = [
    pos ? `${pos.label}: ${pos.reason}` : insight.why,
    insight.summary,
    input.recommendation?.label ?
      `Öneri seviyesi: ${input.recommendation.label}.`
    : null
  ]
    .filter(Boolean)
    .map((t) => sanitizeInsightText(t, 220))
    .slice(0, 3);

  while (decisionReasons.length < 3) {
    decisionReasons.push(
      sanitizeInsightText(
        input.vertical === 'auto' ?
          'Kullanım, yakıt ve TCO kalemleri kural skorunda birleştirildi.'
        : 'Profil girdileri kategori skor modeline işlendi.',
        180
      )
    );
  }

  const riskWarnings = [...risks];
  if (neg?.reason) riskWarnings.push(`${neg.label}: ${neg.reason}`);
  const riskWarningsFinal = [...new Set(riskWarnings.map((r) => sanitizeInsightText(r, 200)))].slice(0, 3);
  while (riskWarningsFinal.length < 3) {
    riskWarningsFinal.push('Canlı teklif ve sözleşme koşulları modeli güncelleyebilir.');
  }

  const actions = buildNextBestActions({ ...input, planTier: 'pro' }).slice(0, 3);
  while (actions.length < 3) {
    actions.push('Güncel teklif ve sözleşme maddelerini yazılı doğrulayın.');
  }

  let costCommentary = '';
  if (input.vertical === 'auto') {
    const tco = formatTry(input.costs.tco12, input.locale);
    costCommentary = tco ?
      `12 ay toplam sahip olma yükü tahmini ${tco}; yakıt, bakım ve sigorta kalemleri bu bandın içinde modellenir.`
    : 'TCO kalemleri teklif aşamasında netleşmelidir.';
  } else if (input.vertical === 'konut') {
    const m = formatTry(input.costs.monthlyPayment, input.locale);
    const d = formatTry(input.costs.duesMonthly, input.locale);
    costCommentary = [m ? `Aylık ödeme ${m}` : null, d ? `aidat ${d}/ay` : null, 'tapu ve sigorta masrafları ilk yıl yükünü tamamlar.']
      .filter(Boolean)
      .join('; ');
  } else if (input.vertical === 'tatil') {
    const t = formatTry(input.costs.realTotal ?? input.costs.totalBudget, input.locale);
    costCommentary = t ?
      `Toplam tatil plan maliyeti tahmini ${t}; konaklama ve ulaşım payı sezonla değişir.`
    : 'Bütçe kalemleri rezervasyon teyidi ile güncellenmelidir.';
  } else {
    const m = formatTry(input.costs.monthlyPayment, input.locale);
    const pti = safeNum(input.costs.paymentToIncome);
    costCommentary = [
      m ? `Aylık ödeme ${m}` : null,
      pti != null ? `gelire oran %${Math.round(pti)}` : null,
      'faiz ve dosya masrafları toplam geri ödemeyi belirler.'
    ]
      .filter(Boolean)
      .join('; ');
  }

  return {
    executiveSummary: sanitizeInsightText(pro?.executiveSummary || insight.summary, 520),
    decisionReasons,
    riskWarnings: riskWarningsFinal,
    actions,
    costCommentary: sanitizeInsightText(costCommentary, 400),
    disclaimer: insight.disclaimer,
    source: 'engine'
  };
}

/** Homepage demo cards — max 1–2 sentences, clearly sample. */
export function buildHomepageSampleInsight(vertical, demoScores = {}) {
  const input = normalizeInsightInput({
    vertical,
    planTier: 'guest',
    answers: demoScores.answers || {},
    scores: {
      decision: demoScores.decisionScore,
      overallRisk: demoScores.risk || 'Orta'
    },
    costs: demoScores.costs || {},
    risks: demoScores.risks || []
  });
  const insight = buildDecisionInsight(input);
  const line = sanitizeInsightText(`${insight.summary} ${insight.risk}`, 220);
  return `${line} (Örnek analizdir; gerçek sonuç kullanıcı cevaplarına göre değişir.)`;
}

export const HOMEPAGE_SAMPLE_INSIGHTS = Object.freeze({
  auto: buildHomepageSampleInsight('auto', {
    decisionScore: 86,
    risk: 'Orta-düşük',
    answers: { usage: 'city', loan: 'yes', fuel: 'hybrid', km: 18000, budget: 1_500_000 },
    costs: { budget: 1_500_000, tco12: 342_480 }
  }),
  konut: buildHomepageSampleInsight('konut', {
    decisionScore: 92,
    risk: 'Düşük',
    answers: {
      city: 'İzmir',
      district: 'Karşıyaka',
      totalBudget: 4_200_000,
      purchasePurpose: 'Satın almak istiyorum',
      useFinancing: 'evet',
      duesExpectation: 3200
    },
    costs: { budget: 4_200_000, monthlyPayment: 38_500, duesMonthly: 3200 }
  }),
  tatil: buildHomepageSampleInsight('tatil', {
    decisionScore: 81,
    risk: 'Orta',
    answers: {
      travelers_count: 4,
      people_type: 'cocuklu-aile',
      vacation_type: 'deniz-resort',
      date_flexibility: 'esnek',
      transport_preference: 'ucak'
    },
    costs: { totalBudget: 62_000, realTotal: 68_450 }
  }),
  finansman: buildHomepageSampleInsight('finansman', {
    decisionScore: 88,
    risk: 'Düşük',
    answers: { monthly_income: 95_000, existing_debt: 12_000, term_months: '36', early_payment: 'orta' },
    costs: { monthlyPayment: 16_750, paymentToIncome: 30 }
  })
});

/**
 * Combine blocks for a single executive summary field (legacy panels).
 */
export function formatInsightBlocksAsExecutive(insight) {
  if (!insight) return '';
  return sanitizeInsightText(
    [
      insight.summary,
      insight.why ? `Neden: ${insight.why}` : '',
      insight.risk ? `Risk: ${insight.risk}` : '',
      insight.nextStep ? `Sonraki adım: ${insight.nextStep}` : ''
    ]
      .filter(Boolean)
      .join(' '),
    950
  );
}

/**
 * HTML for V2 result panels (keeps existing section wrapper).
 */
export function renderInsightBlocksHtml(insight, esc, options = {}) {
  const e = typeof esc === 'function' ? esc : (s) => String(s);
  const i = insight || buildDecisionInsight({});
  const planTier = normalizePlanTier(options.planTier || i.planTier);
  const isPro = planTier === 'pro';
  const insightInput = options.insightInput || null;
  const proInsight = isPro && insightInput ? buildProInsight({ ...insightInput, planTier: 'pro' }) : null;

  return `
    <div class="ib-insight-blocks">
      <h4 class="ib-insight-blocks__title">AI karar özeti</h4>
      <p class="ib-insight-blocks__text" data-insight-summary>${e(i.summary || '—')}</p>
      <h4 class="ib-insight-blocks__title">Neden bu sonuç?</h4>
      <p class="ib-insight-blocks__text" data-insight-why>${e(i.why || '—')}</p>
      <h4 class="ib-insight-blocks__title">Dikkat edilmesi gereken risk</h4>
      <p class="ib-insight-blocks__text" data-insight-risk>${e(i.risk || '—')}</p>
      <h4 class="ib-insight-blocks__title">Sonraki en iyi adım</h4>
      <p class="ib-insight-blocks__text" data-insight-next>${e(i.nextStep || '—')}</p>
      ${renderProInsightExtensionsHtml(proInsight, planTier, insightInput, e)}
      <p class="ib-insight-blocks__disclaimer text-muted-sm">${e(i.disclaimer || shortDisclaimer())}</p>
    </div>`;
}

function renderProSection(title, contentHtml, isPro, e) {
  if (isPro) {
    return `
      <div class="ib-pro-insight-section">
        <h4 class="ib-insight-blocks__title">${e(title)}</h4>
        <div class="ib-pro-insight-section__body">${contentHtml}</div>
      </div>`;
  }
  return `
    <div class="ib-pro-insight-section ib-pro-insight-section--locked">
      <h4 class="ib-insight-blocks__title">${e(title)} <span class="ib-pro-badge">Pro</span></h4>
      <p class="ib-pro-insight-teaser">Bu içgörü Pro üyelikte kullanılabilir.</p>
    </div>`;
}

export function renderProInsightExtensionsHtml(proInsight, planTier, insightInput, esc) {
  const e = typeof esc === 'function' ? esc : (s) => String(s);
  const isPro = normalizePlanTier(planTier) === 'pro';
  const input = insightInput ? normalizeInsightInput(insightInput) : normalizeInsightInput({ planTier });
  const pro = proInsight || (isPro ? buildProInsight({ ...input, planTier: 'pro' }) : null);
  const risks = buildRiskNarrative({ ...input, planTier: isPro ? 'pro' : 'guest' });
  const next90 = buildNext90DayPlan(input);

  const execPlus = pro ?
    `<p class="ib-insight-blocks__text">${e(pro.executiveSummary)} ${e(pro.criticalReason || '')}</p>`
  : '';
  const altScenario = pro ?
    `<p class="ib-insight-blocks__text">${e(pro.alternativeScenario)}</p>`
  : '';
  const costSensitivity = pro ?
    `<p class="ib-insight-blocks__text">${e(pro.costPressure)}</p>`
  : '';
  const criticalVar = pro ?
    `<p class="ib-insight-blocks__text">${e(pro.criticalVariable)}</p>`
  : '';
  const riskDistribution = isPro ?
    `<ul class="ib-pro-risk-list">${risks.map((r) => `<li>${e(r)}</li>`).join('')}</ul>`
  : '';
  const next90Html = isPro ?
    `<ol class="ib-pro-action-list">${next90.map((r) => `<li>${e(r)}</li>`).join('')}</ol>`
  : '';

  return `
    ${renderProSection('Executive Summary Plus', execPlus, isPro, e)}
    ${renderProSection('Alternatif Senaryo Analizi', altScenario, isPro, e)}
    ${renderProSection('Maliyet Hassasiyet Analizi', costSensitivity, isPro, e)}
    ${renderProSection('Kritik Değişken Analizi', criticalVar, isPro, e)}
    ${renderProSection('Risk Dağılımı', riskDistribution, isPro, e)}
    ${renderProSection('Sonraki 90 Gün Önerisi', next90Html, isPro, e)}`;
}

export function hydrateInsightBlocks(root, insight) {
  if (!root || !insight) return;
  const set = (sel, text) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = text || '—';
  };
  set('[data-insight-summary]', insight.summary);
  set('[data-insight-why]', insight.why);
  set('[data-insight-risk]', insight.risk);
  set('[data-insight-next]', insight.nextStep);
  const disc = root.querySelector('.ib-insight-blocks__disclaimer');
  if (disc && insight.disclaimer) disc.textContent = insight.disclaimer;
}

/**
 * Build AI proxy prompt from insight input (bounded narration).
 */
export function buildInsightProxyPrompt(input, insight) {
  const i = input || normalizeInsightInput({});
  const base = insight || buildDecisionInsight(i);
  return [
    'Görev: Türkçe karar destek yorumu yaz (4-6 cümle). Kesin tavsiye, garanti, risksiz ifade yok.',
    'Yasak ifadeler: uygun olabilir, genel olarak iyi, detaylı araştırma önerilir.',
    `Kategori: ${i.vertical}`,
    `Özet taslak: ${base.summary}`,
    `Neden: ${base.why}`,
    `Risk: ${base.risk}`,
    `Skor: ${formatScoreOutOf100(i.scores?.decision)}`,
    i.marketAssessment ? `Piyasa değerlendirmesi (TCMB EVDS): ${i.marketAssessment}` : '',
    i.earthquakeActivityAssessment ?
      `Deprem aktivite değerlendirmesi (AFAD): ${i.earthquakeActivityAssessment}`
    : '',
    'Rakam yazacaksan yalnızca verilen bağlamdaki tutarları kullan; yeni rakam uydurma.'
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Optional AI proxy enrichment; always falls back to deterministic insight.
 */
export async function fetchInsightWithProxy(rawInput = {}, options = {}) {
  const input = normalizeInsightInput(rawInput);
  const insight = buildDecisionInsight(input);
  const fallbackText = options.executiveOnly ?
    buildExecutiveSummary(input)
  : formatInsightBlocksAsExecutive(insight);

  if (options.skipProxy) {
    return { text: fallbackText, insight, source: 'engine' };
  }

  const prompt = buildInsightProxyPrompt(input, insight);

  try {
    const proxy = await postAiProxy({
      prompt,
      context: { category: `${input.vertical}-executive-insight-v1` },
      timeoutMs: options.timeoutMs || 5000
    });

    if (!proxy.ok) {
      return { text: fallbackText, insight, source: 'fallback' };
    }

    let text = sanitizeInsightText(extractAiProxyText(proxy.data), 950);
    if (!text || containsBannedWeakPhrase(text)) {
      return { text: fallbackText, insight, source: 'fallback' };
    }
    return { text, insight, source: 'ai' };
  } catch {
    return { text: fallbackText, insight, source: 'fallback' };
  }
}
