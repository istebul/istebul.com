/**
 * isteBul AI Listings Engine — deterministic analysis narration (rules-based).
 */

import { safeNumber } from '../utils/guards.js';
import { readAttribute } from '../scoring/scoring-rules.js';

/** @typedef {import('../models/listing.js').Listing} Listing */
/** @typedef {import('../scoring/scoring-engine.js').ScoringResult} ScoringResult */

/**
 * @param {Listing} listing
 * @param {ScoringResult} scores
 * @returns {string}
 */
export function buildAnalysisSummary(listing, scores) {
  const title = listing.title?.trim() || listing.id;
  const riskLabel = scores.risk_score >= 60 ? 'yüksek' : scores.risk_score >= 35 ? 'orta' : 'düşük';

  if (listing.category === 'vehicle') {
    return `"${title}" için kural tabanlı araç analizi: genel skor ${scores.ai_score}/100, risk ${riskLabel} (${scores.risk_score}/100). Fiyat uyumu ${scores.price_score}, kilometre ${scores.factor_scores?.mileage_score ?? '—'}, model yaşı ${scores.factor_scores?.age_score ?? '—'}.`;
  }

  if (listing.category === 'housing') {
    return `"${title}" için kural tabanlı konut analizi: genel skor ${scores.ai_score}/100, risk ${riskLabel} (${scores.risk_score}/100). m² fiyat uyumu ${scores.price_score}, konum ${scores.factor_scores?.location_score ?? '—'}, bina yaşı ${scores.factor_scores?.building_age_score ?? '—'}.`;
  }

  return `"${title}" için kural tabanlı analiz: genel skor ${scores.ai_score}/100, risk ${riskLabel} (${scores.risk_score}/100).`;
}

/**
 * @param {Listing} listing
 * @param {ScoringResult} scores
 * @returns {string[]}
 */
export function buildAnalysisPros(listing, scores) {
  const pros = [];
  const factors = scores.factor_scores ?? {};

  if (scores.price_score >= 70) pros.push('Fiyat segmenti referans bandına yakın görünüyor.');
  if (scores.market_score >= 70) pros.push('Piyasa uyumu güçlü sinyaller veriyor.');
  if (listing.description.length > 40) pros.push('Açıklama yeterli detay içeriyor.');
  if (listing.images.length > 0) pros.push(`${listing.images.length} görsel mevcut.`);

  if (listing.category === 'vehicle') {
    if (factors.age_score >= 75) pros.push('Düşük model yaşı amortisman riskini azaltır.');
    if (factors.mileage_score >= 75) pros.push('Kilometre kullanımı düşük segmentte.');
    if (factors.fuel_score >= 80) pros.push('Yakıt türü işletme maliyeti açısından avantajlı.');
  }

  if (listing.category === 'housing') {
    if (factors.location_score >= 75) pros.push('Konum skoru güçlü şehir/il segmentinde.');
    if (factors.size_score >= 70) pros.push('Metrekare ve oda dengesi kullanım açısından uygun.');
    if (factors.building_age_score >= 75) pros.push('Bina yaşı bakım riski açısından olumlu.');
  }

  return pros.length ? pros : ['Temel veri seti mevcut; güçlü sinyal sınırlı.'];
}

/**
 * @param {Listing} listing
 * @param {ScoringResult} scores
 * @returns {string[]}
 */
export function buildAnalysisCons(listing, scores) {
  const cons = [];
  const factors = scores.factor_scores ?? {};

  if (!listing.description.trim()) cons.push('Açıklama eksik — değerlendirme güveni düşer.');
  if (!listing.location.trim()) cons.push('Konum bilgisi eksik.');
  if (listing.price <= 0) cons.push('Fiyat belirtilmemiş.');
  if (scores.risk_score >= 60) cons.push('Genel risk skoru yüksek segmentte.');
  if (scores.price_score < 50) cons.push('Fiyat referans bandının dışında görünüyor.');

  if (listing.category === 'vehicle') {
    if (factors.mileage_score < 50) cons.push('Yüksek kilometre mekanik aşınma riski taşır.');
    if (factors.age_score < 50) cons.push('Eski model yılı likidite ve bakım riskini artırır.');
    if (factors.fuel_score < 60) cons.push('Yakıt türü yıllık işletme maliyetini yükseltebilir.');
  }

  if (listing.category === 'housing') {
    if (factors.building_age_score < 50) cons.push('Eski bina yaşı tadilat ve deprem riskini artırabilir.');
    if (factors.size_score < 50) cons.push('m²/oda oranı standart dışı.');
    if (factors.location_score < 60) cons.push('Konum skoru zayıf — likidite riski.');
  }

  return cons.length ? cons : ['Kritik eksik veri tespit edilmedi.'];
}

/**
 * @param {Listing} listing
 * @param {ScoringResult} scores
 * @returns {string[]}
 */
export function buildAnalysisTags(listing, scores) {
  const tags = [
    listing.category,
    'rules-engine',
    `ai:${scores.ai_score}`,
    `risk:${scores.risk_score}`,
    `confidence:${Math.round(scores.confidence * 100)}`
  ];

  const factors = scores.factor_scores ?? {};
  for (const [key, value] of Object.entries(factors)) {
    if (Number.isFinite(value)) tags.push(`factor:${key}:${value}`);
  }

  if (listing.category === 'vehicle') {
    const fuel = String(readAttribute(listing.attributes, ['fuel_type', 'yakit_turu', 'fuel']) ?? '');
    if (fuel) tags.push(`fuel:${fuel}`);
    const year = safeNumber(readAttribute(listing.attributes, ['year', 'yil']));
    if (year > 0) tags.push(`year:${year}`);
  }

  if (listing.category === 'housing') {
    const usage = String(readAttribute(listing.attributes, ['usage_purpose', 'kullanim_amaci']) ?? '');
    if (usage) tags.push(`usage:${usage}`);
  }

  if (listing.attributes?.source_type === 'manual_seed' || listing.source_type === 'manual_seed') {
    tags.push('manual_seed');
  }

  return tags;
}
