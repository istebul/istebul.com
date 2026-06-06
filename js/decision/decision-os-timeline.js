/**
 * Decision OS v2 — local decision timeline (localStorage).
 */

export const TIMELINE_STORAGE_KEY = 'istebul_decision_timeline_v1';
export const MAX_TIMELINE_ENTRIES = 50;

const VERTICAL_META = Object.freeze({
  auto: { icon: '🚗', label: 'Araç' },
  konut: { icon: '🏠', label: 'Konut' },
  finansman: { icon: '💳', label: 'Finansman' },
  tatil: { icon: '🏖️', label: 'Tatil' },
  sigorta: { icon: '🛡️', label: 'Sigorta' },
  kasko: { icon: '🛡️', label: 'Kasko' }
});

function resolveStorage(preferred) {
  if (preferred && typeof preferred.getItem === 'function') return preferred;
  if (typeof localStorage !== 'undefined') return localStorage;
  return null;
}

function normalizeVertical(value) {
  const vertical = String(value || 'unknown').toLowerCase();
  if (vertical === 'finans' || vertical === 'finance') return 'finansman';
  if (vertical === 'housing' || vertical === 'real-estate') return 'konut';
  if (vertical === 'vehicle' || vertical === 'arac') return 'auto';
  return vertical;
}

/**
 * @param {Storage|null|undefined} storage
 */
export function loadDecisionTimeline(storage) {
  const store = resolveStorage(storage);
  if (!store) return [];

  try {
    const raw = store.getItem(TIMELINE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {object} entry
 * @param {Storage|null|undefined} storage
 */
export function saveDecisionTimelineEntry(entry, storage) {
  const store = resolveStorage(storage);
  if (!store || !entry || typeof entry !== 'object') return false;

  const vertical = normalizeVertical(entry.vertical);
  const meta = VERTICAL_META[vertical] || { icon: '📋', label: vertical };
  const record = {
    id: entry.id || `dos-${Date.now()}`,
    vertical,
    icon: meta.icon,
    label: meta.label,
    verdict: entry.verdict || 'BEKLE',
    verdictEmoji: entry.verdictEmoji || '🟡',
    decisionScore: Number(entry.decisionScore) || 0,
    confidencePercent: Number(entry.confidencePercent) || 0,
    title: entry.title || meta.label,
    createdAt: entry.createdAt || new Date().toISOString()
  };

  const history = loadDecisionTimeline(store).filter((item) => item.id !== record.id);
  history.unshift(record);

  try {
    store.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_TIMELINE_ENTRIES)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Group timeline entries by year.
 * @param {Array<object>} entries
 */
export function groupTimelineByYear(entries = []) {
  const groups = new Map();

  entries.forEach((entry) => {
    const year = new Date(entry.createdAt || Date.now()).getFullYear();
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(entry);
  });

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }));
}

/**
 * @param {Array<object>} entries
 * @param {(s: unknown) => string} esc
 */
export function renderDecisionTimelineHtml(entries = [], esc = (v) => String(v ?? '')) {
  if (!entries.length) {
    return '<p class="dos-muted">Henüz kayıtlı karar geçmişi yok. İlk analiziniz burada görünecek.</p>';
  }

  const grouped = groupTimelineByYear(entries);

  return `
    <div class="dos-timeline">
      ${grouped
        .map(
          ({ year, items }) => `
        <section class="dos-timeline__year">
          <h4 class="dos-timeline__year-label">${esc(String(year))}</h4>
          <div class="dos-timeline__cards">
            ${items
              .map(
                (item) => `
              <article class="dos-timeline__card" data-dos-timeline-card="${esc(item.id)}">
                <span class="dos-timeline__icon" aria-hidden="true">${esc(item.icon)}</span>
                <div class="dos-timeline__body">
                  <strong>${esc(item.label)}</strong>
                  <span class="dos-timeline__verdict">${esc(item.verdictEmoji)} ${esc(item.verdict)}</span>
                  <span class="dos-timeline__meta">Skor ${esc(String(item.decisionScore))} · Güven %${esc(String(item.confidencePercent))}</span>
                </div>
              </article>`
              )
              .join('')}
          </div>
        </section>`
        )
        .join('')}
    </div>`;
}

/**
 * Build timeline entry from Decision OS model.
 * @param {object} model
 */
export function buildTimelineEntryFromModel(model = {}) {
  return {
    vertical: model.vertical,
    verdict: model.verdict?.label || 'BEKLE',
    verdictEmoji: model.verdict?.emoji || '🟡',
    decisionScore: model.decisionScore,
    confidencePercent: model.confidencePercent,
    title: model.title
  };
}
