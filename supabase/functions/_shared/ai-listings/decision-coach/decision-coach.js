/**
 * AI Decision Coach v1 — deterministic decision coaching layer (Sprint-17).
 * Runs on top of recommendation engine results; lazy compute per selected item.
 */

import { clampScore } from '../engine/score-utils.js';
import { runQualityEngine } from '../engine/quality-engine.js';
import { runPriceIntelligence } from '../price/price-intelligence.js';
import { runMarketIntelligence } from '../market-intelligence/market-intelligence.js';
import { buildCoachSummary } from './coach-summary.js';
import { buildVerificationQuestions } from './coach-questions.js';
import { buildRedFlags } from './coach-red-flags.js';
import { buildNextSteps } from './coach-next-steps.js';
import { buildComparisonNotes } from './coach-comparison.js';

/** @type {Map<string, unknown>} */
const memoCache = new Map();

/** @type {Readonly<Record<string, string>>} */
export const COACH_LABELS = Object.freeze({
  STRONG: 'Güçlü aday',
  REVIEW: 'İncelenebilir',
  CAUTIOUS: 'Dikkatli ilerle',
  VERIFY: 'Önce doğrula',
  NOT_SUITABLE: 'Uygun görünmüyor'
});

/**
 * Clear memoization cache (testing).
 */
export function clearDecisionCoachMemoCache() {
  memoCache.clear();
}

/**
 * @param {Record<string, unknown>} input
 * @returns {string}
 */
export function buildDecisionCoachCacheKey(input) {
  const id = String(input.selected_recommendation?.id ?? '');
  const topIds = (Array.isArray(input.top_recommendations) ? input.top_recommendations : [])
    .map((item) => String(item.id ?? ''))
    .join(',');
  return `${id}:${topIds}:${JSON.stringify(input.user_intent ?? {})}`;
}

/**
 * @param {Record<string, unknown>} userIntent
 * @param {Record<string, unknown>} selectedRecommendation
 * @param {Array<Record<string, unknown>>} topRecommendations
 * @returns {Record<string, unknown>}
 */
export function buildDecisionCoachInput(userIntent, selectedRecommendation, topRecommendations = []) {
  if (!selectedRecommendation || !selectedRecommendation.id) {
    return {
      user_intent: userIntent ?? {},
      selected_recommendation: null,
      top_recommendations: topRecommendations,
      listing_quality: null,
      risk_score: null,
      price_intelligence: null,
      market_intelligence: null,
      executive_label: null,
      duplicate_status: null,
      missing_fields: [],
      explainability: { reasons: [], risks: [] }
    };
  }

  const listing = /** @type {Record<string, unknown>} */ (
    selectedRecommendation.listing ?? selectedRecommendation
  );
  const quality = runQualityEngine(listing);
  const priceIntelligence = runPriceIntelligence(listing);
  const marketIntelligence = runMarketIntelligence(listing, {
    quality: { quality_score: quality.quality_score },
    risk: { risk_score: selectedRecommendation.risk_score }
  });

  return {
    user_intent: userIntent ?? {},
    selected_recommendation: selectedRecommendation,
    top_recommendations: topRecommendations,
    listing_quality: { quality_score: quality.quality_score, missing_fields: quality.missing_fields },
    risk_score: selectedRecommendation.risk_score ?? null,
    price_intelligence: priceIntelligence,
    market_intelligence: marketIntelligence,
    executive_label: selectedRecommendation.executive_label ?? null,
    duplicate_status: selectedRecommendation.duplicate_status ?? 'new',
    missing_fields: quality.missing_fields,
    explainability: {
      reasons: selectedRecommendation.reasons ?? [],
      risks: selectedRecommendation.risks ?? []
    }
  };
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string}
 */
export function resolveCoachLabel(ctx) {
  const selected = ctx.selected_recommendation;
  if (!selected) return COACH_LABELS.NOT_SUITABLE;

  const fit = Number(selected.fit_score ?? 0);
  const risk = Number(ctx.risk_score ?? selected.risk_score ?? 50);
  const quality = Number(
    ctx.listing_quality?.quality_score ?? selected.quality_score ?? 50
  );
  const duplicate = String(ctx.duplicate_status ?? selected.duplicate_status ?? 'new');
  const missingCount = (Array.isArray(ctx.missing_fields) ? ctx.missing_fields : []).length;

  if (fit < 40 || risk >= 70) return COACH_LABELS.NOT_SUITABLE;
  if (missingCount >= 3 || duplicate === 'exact' || (duplicate === 'similar' && risk >= 55)) {
    return COACH_LABELS.VERIFY;
  }
  if (fit >= 85 && risk <= 40 && quality >= 75) return COACH_LABELS.STRONG;
  if (fit >= 70 && risk <= 55) return COACH_LABELS.REVIEW;
  if (fit >= 50 || risk >= 55) return COACH_LABELS.CAUTIOUS;
  return COACH_LABELS.NOT_SUITABLE;
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {string[]}
 */
export function buildShouldConsider(ctx) {
  /** @type {string[]} */
  const items = [];
  const selected = ctx.selected_recommendation ?? {};
  const subscores = /** @type {Record<string, number>} */ (selected.subscores ?? {});

  if (Number(subscores.budget_fit) >= 70) items.push('Bütçeye uyumlu');
  if (Number(subscores.risk_fit) >= 70 || Number(ctx.risk_score ?? selected.risk_score) <= 40) {
    items.push('Risk seviyesi kabul edilebilir');
  }
  if (Number(subscores.quality_fit) >= 65 || Number(selected.quality_score) >= 65) {
    items.push('Kalite skoru yeterli');
  }
  if (Number(subscores.usage_fit) >= 65) items.push('Kullanım senaryosuna uygun');
  if (Number(subscores.priority_fit) >= 65 || Number(subscores.price_fit) >= 65) {
    items.push('Toplam maliyet önceliğine yakın');
  }

  const reasons = ctx.explainability?.reasons ?? selected.reasons;
  if (Array.isArray(reasons)) {
    for (const reason of reasons.slice(0, 3)) {
      const text = String(reason);
      if (!items.some((item) => item.toLowerCase() === text.toLowerCase())) {
        items.push(text);
      }
    }
  }

  if (!items.length) items.push('Ön değerlendirme ile incelenebilir');

  return [...new Set(items)].slice(0, 6);
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {string} category
 * @returns {string[]}
 */
export function buildShouldAvoidIf(ctx, category = 'vehicle') {
  const cat = String(category ?? ctx.user_intent?.category ?? 'vehicle').toLowerCase();
  /** @type {string[]} */
  const items = [];

  if (cat === 'vehicle' || cat === 'arac' || cat === 'auto') {
    items.push(
      'Ekspertiz sonucu ağır hasar çıkarsa',
      'Servis geçmişi doğrulanamazsa',
      'Fotoğraf/konum bilgisi netleşmezse',
      'Fiyat pazarlıkla makul aralığa çekilemezse'
    );
  } else if (cat === 'housing' || cat === 'real_estate') {
    items.push(
      'Tapu veya iskan belgesi doğrulanamazsa',
      'Deprem riski kabul edilemez düzeyde çıkarsa',
      'Aidat veya ortak giderler beklenenden yüksekse',
      'Krediye uygunluk sağlanamazsa'
    );
  } else if (cat === 'travel' || cat === 'tatil') {
    items.push(
      'İptal koşulları kabul edilemezse',
      'Konum doğrulaması yapılamazsa',
      'Yorumlar olumsuz ve tutarsızsa',
      'Ek ücretler toplam maliyeti aşarsa'
    );
  } else {
    items.push(
      'Eksik bilgiler doğrulanamazsa',
      'Fiyat pazarlıkla makul aralığa çekilemezse',
      'Kaynak ve iletişim bilgileri netleşmezse'
    );
  }

  const risk = Number(ctx.risk_score ?? ctx.selected_recommendation?.risk_score);
  if (Number.isFinite(risk) && risk >= 61 && !items.some((i) => /risk/i.test(i))) {
    items.push('Risk skoru yüksek kalırsa');
  }

  return [...new Set(items)].slice(0, 6);
}

/**
 * @param {Record<string, unknown>} ctx
 * @returns {number}
 */
export function computeCoachConfidence(ctx) {
  const selected = ctx.selected_recommendation ?? {};
  const fit = Number(selected.fit_score ?? 0);
  const quality = Number(ctx.listing_quality?.quality_score ?? selected.quality_score ?? 0);
  const risk = Number(ctx.risk_score ?? selected.risk_score ?? 50);
  const missingCount = (Array.isArray(ctx.missing_fields) ? ctx.missing_fields : []).length;
  const duplicate = String(ctx.duplicate_status ?? selected.duplicate_status ?? 'new');

  const priceConf = Number(ctx.price_intelligence?.price_confidence ?? 0);
  const marketConf = Number(ctx.market_intelligence?.market_context_score ?? 0);

  let confidence = 20;
  confidence += fit * 0.28;
  confidence += quality * 0.15;
  confidence += (100 - risk) * 0.12;
  confidence += Math.max(0, 100 - missingCount * 12) * 0.1;
  confidence += priceConf * 0.12;
  confidence += marketConf * 0.08;

  if (duplicate === 'exact') confidence -= 18;
  else if (duplicate === 'similar') confidence -= 10;

  return clampScore(Math.round(confidence));
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ skipCache?: boolean }} [options]
 * @returns {{
 *   coach_label: string,
 *   coach_summary: string,
 *   should_consider: string[],
 *   should_avoid_if: string[],
 *   verification_questions: string[],
 *   red_flags: string[],
 *   next_steps: string[],
 *   comparison_notes: string,
 *   confidence: number
 * }}
 */
export function runDecisionCoach(input, options = {}) {
  const cacheKey = buildDecisionCoachCacheKey(input);
  if (!options.skipCache) {
    const cached = memoCache.get(cacheKey);
    if (cached) return /** @type {ReturnType<typeof runDecisionCoach>} */ (cached);
  }

  if (!input?.selected_recommendation?.id) {
    const fallback = {
      coach_label: COACH_LABELS.NOT_SUITABLE,
      coach_summary:
        'Mevcut bilgiler ışığında ön değerlendirme yapılamadı. Profil ve seçim bilgilerini kontrol etmeniz önerilir.',
      should_consider: [],
      should_avoid_if: ['Seçim bilgisi eksikse'],
      verification_questions: [],
      red_flags: [],
      next_steps: ['Profil bilgilerini tamamlayın', 'Öneri üretin ve bir seçenek belirleyin'],
      comparison_notes: 'Alternatif karşılaştırma için yeterli öneri bulunmuyor.',
      confidence: 0
    };
    memoCache.set(cacheKey, fallback);
    return fallback;
  }

  const ctx = { ...input };
  const coachLabel = resolveCoachLabel(ctx);
  const redFlags = buildRedFlags(ctx);
  const category = String(ctx.user_intent?.category ?? 'vehicle');

  const result = {
    coach_label: coachLabel,
    coach_summary: buildCoachSummary(ctx, coachLabel),
    should_consider: buildShouldConsider(ctx),
    should_avoid_if: buildShouldAvoidIf(ctx, category),
    verification_questions: buildVerificationQuestions(ctx),
    red_flags: redFlags,
    next_steps: buildNextSteps(ctx, redFlags),
    comparison_notes: buildComparisonNotes(ctx),
    confidence: computeCoachConfidence(ctx)
  };

  memoCache.set(cacheKey, result);
  if (memoCache.size > 20) {
    const oldest = memoCache.keys().next().value;
    if (oldest) memoCache.delete(oldest);
  }

  return result;
}
