/** @param {unknown} raw */
export function parseManualBudget(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, 50_000_000);
}

/** @param {number|null|undefined} amount */
export function formatTry(amount) {
  if (amount == null || !Number.isFinite(amount)) return '';
  return `${amount.toLocaleString('tr-TR')} ₺`;
}

/**
 * @param {string} start ISO date
 * @param {string} end ISO date
 */
export function computeTripNights(start, end) {
  if (!start || !end) return null;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${end}T12:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

/** @param {Record<string, unknown>} state */
export function getBudgetDisplay(state) {
  if (state.budget_range === 'manuel' && state.budget_manual) {
    return `Manuel hedef: ${formatTry(state.budget_manual)}`;
  }
  if (state.budget_range === 'ekonomik') return 'Ekonomik plan (0 – 50.000 ₺)';
  if (state.budget_range === 'dengeli') return 'Dengeli plan (50.000 – 120.000 ₺)';
  return '';
}

/** @param {Record<string, unknown>} state */
export function getDateSummary(state) {
  const nights = state.trip_nights;
  if (state.date_start && state.date_end) {
    const nLabel = nights ? ` · ${nights} gece` : '';
    return `${state.date_start} – ${state.date_end}${nLabel}`;
  }
  if (state.date_period_note) return state.date_period_note;
  return '';
}

/** @param {Record<string, unknown>} state */
export function getFlexibilityLabel(state) {
  const map = {
    net: 'Net tarihlerim var',
    '1-2-days': '1–2 gün esneyebilir',
    '1-week': '1 hafta esneyebilir',
    undecided: 'Henüz karar vermedim'
  };
  return map[state.date_flexibility] || '';
}
