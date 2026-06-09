/**
 * Phase 3A — Category-specific decision signal vocabulary (labels + tone hints).
 * Values are composed by adapters from existing engine fields only.
 */

/** @typedef {import('./decision-category-card-contract.js').DecisionCardSignal} DecisionCardSignal */

/**
 * @param {string} key
 * @param {string} label
 * @param {string} value
 * @param {'positive'|'neutral'|'caution'|'risk'} [tone]
 * @returns {DecisionCardSignal | null}
 */
export function signal(key, label, value, tone = 'neutral') {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return null;
  return { key, label, value: text, tone };
}

/**
 * @param {DecisionCardSignal | null | undefined} item
 * @returns {item is DecisionCardSignal}
 */
export function isValidSignal(item) {
  return Boolean(item && item.key && item.label && item.value);
}

/**
 * @param {Array<DecisionCardSignal | null | undefined>} items
 * @returns {DecisionCardSignal[]}
 */
export function compactSignals(items) {
  return items.filter(isValidSignal);
}

export const SIGORTA_SIGNAL_DEFS = Object.freeze({
  premium: { key: 'premium', label: 'Prim bandı' },
  protection: { key: 'protection', label: 'Koruma' },
  coverage: { key: 'coverage', label: 'Teminat' },
  efficiency: { key: 'efficiency', label: 'Verimlilik' },
  overallRisk: { key: 'overallRisk', label: 'Genel risk' }
});

export const KASKO_SIGNAL_DEFS = Object.freeze({
  premium: { key: 'premium', label: 'Prim bandı' },
  coverage: { key: 'coverage', label: 'Teminat' },
  repairRisk: { key: 'repairRisk', label: 'Onarım riski' },
  efficiency: { key: 'efficiency', label: 'Prim verimliliği' },
  overallRisk: { key: 'overallRisk', label: 'Genel risk' }
});

export const FINANSMAN_SIGNAL_DEFS = Object.freeze({
  monthly: { key: 'monthly', label: 'Aylık ödeme' },
  totalRepay: { key: 'totalRepay', label: 'Toplam geri ödeme' },
  cashPressure: { key: 'cashPressure', label: 'Nakit baskısı' },
  financeFit: { key: 'financeFit', label: 'Finansman uyumu' }
});

export const TATIL_SIGNAL_DEFS = Object.freeze({
  estimatedCost: { key: 'estimatedCost', label: 'Tahmini maliyet' },
  suitability: { key: 'suitability', label: 'Uygunluk' },
  audience: { key: 'audience', label: 'Profil' },
  budgetFit: { key: 'budgetFit', label: 'Bütçe uyumu' }
});

export const KONUT_SIGNAL_DEFS = Object.freeze({
  monthlyEffect: { key: 'monthlyEffect', label: 'Aylık etki' },
  totalEffect: { key: 'totalEffect', label: 'Toplam etki' },
  riskEffect: { key: 'riskEffect', label: 'Risk etkisi' },
  dti: { key: 'dti', label: 'DTI' }
});

export const AUTO_SIGNAL_DEFS = Object.freeze({
  monthlyCost: { key: 'monthlyCost', label: 'Aylık maliyet' },
  fuel: { key: 'fuel', label: 'Yakıt' },
  resale: { key: 'resale', label: 'İkinci el' },
  suitability: { key: 'suitability', label: 'Uygunluk' }
});

/**
 * Map risk label text to signal tone.
 * @param {string} riskLabel
 * @returns {'positive'|'neutral'|'caution'|'risk'}
 */
export function riskLabelToTone(riskLabel) {
  const text = String(riskLabel || '').toLowerCase();
  if (text.includes('yüksek') || text.includes('revize')) return 'risk';
  if (text.includes('orta') || text.includes('dikkat')) return 'caution';
  if (text.includes('düşük') || text.includes('güçlü') || text.includes('iyi')) return 'positive';
  return 'neutral';
}

/**
 * Map cash pressure label to tone.
 * @param {string} pressure
 * @returns {'positive'|'neutral'|'caution'|'risk'}
 */
export function cashPressureToTone(pressure) {
  const text = String(pressure || '').toLowerCase();
  if (text.includes('yüksek')) return 'risk';
  if (text.includes('orta')) return 'caution';
  if (text.includes('düşük')) return 'positive';
  return 'neutral';
}

/**
 * Format TRY amount for signal display.
 * @param {number | null | undefined} amount
 * @returns {string}
 */
export function formatPremiumBand(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `~₺${n.toLocaleString('tr-TR')}/yıl`;
}

/**
 * Format score as /100 display.
 * @param {number | null | undefined} score
 * @returns {string}
 */
export function formatScoreSignal(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)}/100`;
}
