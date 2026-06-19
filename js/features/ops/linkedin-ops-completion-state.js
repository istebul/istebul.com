/**
 * P16-5A — LinkedIn operasyon asistanı görev tamamlanma state utility (pure, injectable storage).
 * DOM, fetch, AI provider veya otomasyon yok; admin tarayıcı storage adapter'ı inject edilir.
 */

export const LINKEDIN_OPS_COMPLETION_STORAGE_KEY = 'istebul:admin:linkedin-ops:completion:v1';
export const LINKEDIN_OPS_COMPLETION_STATE_VERSION = 1;

const DEFAULT_PLAN_VERSION = 'p16.0';
const DEFAULT_TIMEZONE = 'Europe/Istanbul';
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {object} LinkedInOpsCompletionEntry
 * @property {string} completedAt
 * @property {string} slotId
 */

/**
 * @typedef {object} LinkedInOpsCompletionState
 * @property {number} v
 * @property {string} planVersion
 * @property {string} timezone
 * @property {Record<string, LinkedInOpsCompletionEntry>} entries
 */

/**
 * @typedef {object} LinkedInOpsCompletionTaskRef
 * @property {string} slotId
 * @property {string} isoDate
 */

/**
 * @typedef {object} LinkedInOpsCompletionOptions
 * @property {string} [planVersion]
 * @property {string} [timezone]
 * @property {string} [completedAt]
 * @property {string[]} [allowedTaskIds]
 */

/**
 * @param {string | null | undefined} isoDate
 * @returns {boolean}
 */
function isValidIsoDate(isoDate) {
  return ISO_DATE_PATTERN.test(String(isoDate ?? '').trim());
}

/**
 * @param {unknown} entries
 * @returns {Record<string, LinkedInOpsCompletionEntry>}
 */
function normalizeEntries(entries) {
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return {};

  /** @type {Record<string, LinkedInOpsCompletionEntry>} */
  const normalized = {};

  for (const [taskId, entry] of Object.entries(entries)) {
    if (!entry || typeof entry !== 'object') continue;

    const slotId = String(entry.slotId ?? '').trim();
    const completedAt = String(entry.completedAt ?? '').trim();
    if (!slotId || !completedAt) continue;

    normalized[taskId] = { completedAt, slotId };
  }

  return normalized;
}

/**
 * @param {unknown} raw
 * @param {LinkedInOpsCompletionOptions} [options]
 * @returns {LinkedInOpsCompletionState | null}
 */
function normalizeStoredState(raw, options = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const expectedPlanVersion = options.planVersion ?? DEFAULT_PLAN_VERSION;
  const state = /** @type {LinkedInOpsCompletionState} */ (raw);

  if (state.v !== LINKEDIN_OPS_COMPLETION_STATE_VERSION) return null;
  if (state.planVersion !== expectedPlanVersion) return null;

  return {
    v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
    planVersion: state.planVersion,
    timezone: typeof state.timezone === 'string' ? state.timezone : (options.timezone ?? DEFAULT_TIMEZONE),
    entries: normalizeEntries(state.entries)
  };
}

/**
 * @param {string | null | undefined} slotId
 * @param {string | null | undefined} isoDate
 * @returns {string | null}
 */
export function buildLinkedInOpsTaskId(slotId, isoDate) {
  const normalizedSlotId = String(slotId ?? '').trim();
  if (!normalizedSlotId) return null;
  if (!isValidIsoDate(isoDate)) return null;
  return `${normalizedSlotId}:${String(isoDate).trim()}`;
}

/**
 * @param {LinkedInOpsCompletionOptions} [options]
 * @returns {LinkedInOpsCompletionState}
 */
export function createEmptyLinkedInOpsCompletionState(options = {}) {
  return {
    v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
    planVersion: options.planVersion ?? DEFAULT_PLAN_VERSION,
    timezone: options.timezone ?? DEFAULT_TIMEZONE,
    entries: {}
  };
}

/**
 * @param {{ getItem?: (key: string) => string | null }} storage
 * @param {LinkedInOpsCompletionOptions} [options]
 * @returns {LinkedInOpsCompletionState}
 */
export function readLinkedInOpsCompletionState(storage, options = {}) {
  if (!storage || typeof storage.getItem !== 'function') {
    return createEmptyLinkedInOpsCompletionState(options);
  }

  try {
    const raw = storage.getItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY);
    if (!raw) return createEmptyLinkedInOpsCompletionState(options);

    const parsed = JSON.parse(raw);
    const normalized = normalizeStoredState(parsed, options);
    if (!normalized) return createEmptyLinkedInOpsCompletionState(options);

    return normalized;
  } catch {
    return createEmptyLinkedInOpsCompletionState(options);
  }
}

/**
 * @param {{ setItem?: (key: string, value: string) => void }} storage
 * @param {LinkedInOpsCompletionState} state
 */
export function writeLinkedInOpsCompletionState(storage, state) {
  if (!storage || typeof storage.setItem !== 'function') return;

  const payload = {
    v: LINKEDIN_OPS_COMPLETION_STATE_VERSION,
    planVersion: state?.planVersion ?? DEFAULT_PLAN_VERSION,
    timezone: state?.timezone ?? DEFAULT_TIMEZONE,
    entries: state?.entries && typeof state.entries === 'object' ? state.entries : {}
  };

  storage.setItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY, JSON.stringify(payload));
}

/**
 * @param {{ getItem?: (key: string) => string | null, setItem?: (key: string, value: string) => void }} storage
 * @param {LinkedInOpsCompletionTaskRef} task
 * @param {LinkedInOpsCompletionOptions} [options]
 * @returns {LinkedInOpsCompletionState}
 */
export function markLinkedInOpsTaskCompleted(storage, task, options = {}) {
  const taskId = buildLinkedInOpsTaskId(task?.slotId, task?.isoDate);
  if (!taskId) return readLinkedInOpsCompletionState(storage, options);

  const slotId = String(task.slotId).trim();
  const state = readLinkedInOpsCompletionState(storage, options);
  const completedAt = options.completedAt ?? new Date().toISOString();

  state.entries[taskId] = { completedAt, slotId };
  writeLinkedInOpsCompletionState(storage, state);

  return state;
}

/**
 * @param {LinkedInOpsCompletionState | null | undefined} state
 * @param {string | null | undefined} taskId
 * @returns {boolean}
 */
export function isLinkedInOpsTaskCompleted(state, taskId) {
  if (!state?.entries || typeof state.entries !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(state.entries, String(taskId ?? ''));
}

/**
 * @param {{ removeItem?: (key: string) => void }} storage
 */
export function clearLinkedInOpsCompletionState(storage) {
  if (!storage || typeof storage.removeItem !== 'function') return;
  storage.removeItem(LINKEDIN_OPS_COMPLETION_STORAGE_KEY);
}

/**
 * @param {LinkedInOpsCompletionState} state
 * @param {LinkedInOpsCompletionOptions} [options]
 * @returns {LinkedInOpsCompletionState}
 */
export function pruneLinkedInOpsCompletionEntries(state, options = {}) {
  const allowedTaskIds = options.allowedTaskIds;
  if (!Array.isArray(allowedTaskIds)) {
    return {
      ...state,
      entries: { ...(state.entries || {}) }
    };
  }

  const allowed = new Set(allowedTaskIds);
  /** @type {Record<string, LinkedInOpsCompletionEntry>} */
  const entries = {};

  for (const [taskId, entry] of Object.entries(state.entries || {})) {
    if (allowed.has(taskId)) {
      entries[taskId] = entry;
    }
  }

  return {
    ...state,
    entries
  };
}
