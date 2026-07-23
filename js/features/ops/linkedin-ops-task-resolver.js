/**
 * P16-5B — LinkedIn operasyon asistanı haftalık task resolver (pure utility).
 * DOM, fetch, storage veya otomasyon yok; completion state dışarıdan inject edilir.
 */

import {
  buildLinkedInOpsTaskId,
  isLinkedInOpsTaskCompleted
} from './linkedin-ops-completion-state.js';

const DEFAULT_TIMEZONE = 'Europe/Istanbul';
const DEFAULT_PLAN_VERSION = 'p16.0';

/** @type {ReadonlyArray<string>} */
const WEEKDAY_ORDER = Object.freeze([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
]);

/**
 * @typedef {object} LinkedInOpsTask
 * @property {string} taskId
 * @property {string} slotId
 * @property {string} isoDate
 * @property {'today' | 'week'} period
 * @property {string} titleTr
 * @property {string} accountType
 * @property {string} actionType
 * @property {string} themeId
 * @property {string} objectiveTr
 * @property {string} scheduledTime
 * @property {boolean} isCompleted
 */

/**
 * @typedef {object} LinkedInOpsTaskResolverMetadata
 * @property {string} timezone
 * @property {string} planVersion
 * @property {string} todayIsoDate
 * @property {string} weekStartIsoDate
 * @property {string} weekEndIsoDate
 */

/**
 * @typedef {object} LinkedInOpsTaskResolverResult
 * @property {LinkedInOpsTask[]} todayTasks
 * @property {LinkedInOpsTask[]} weekTasks
 * @property {string[]} allowedTaskIds
 * @property {LinkedInOpsTaskResolverMetadata} metadata
 */

/**
 * @typedef {object} LinkedInOpsLocalDateParts
 * @property {string} isoDate
 * @property {string} weekday
 */

/**
 * @typedef {object} LinkedInOpsWeekRange
 * @property {string} weekStartIsoDate
 * @property {string} weekEndIsoDate
 */

/**
 * @typedef {object} LinkedInOpsTaskResolverOptions
 * @property {Date | string | number} [now]
 * @property {string} [timezone]
 * @property {import('./linkedin-ops-completion-state.js').LinkedInOpsCompletionState | null} [completedState]
 */

/**
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function normalizeLinkedInOpsWeekday(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {string} isoDate
 * @returns {{ year: number, month: number, day: number } | null}
 */
function parseIsoDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate ?? '').trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  return { year, month, day };
}

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @returns {string}
 */
function formatIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * @param {string} isoDate
 * @param {number} days
 * @returns {string}
 */
function addDaysToIsoDate(isoDate, days) {
  const parts = parseIsoDate(isoDate);
  if (!parts) return '';

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return formatIsoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * @param {Date | string | number | null | undefined} date
 * @returns {Date}
 */
function coerceDate(date) {
  if (date instanceof Date && Number.isFinite(date.getTime())) return date;
  const next = new Date(date ?? Date.now());
  return Number.isFinite(next.getTime()) ? next : new Date();
}

/**
 * @param {Date | string | number} date
 * @param {string} [timezone]
 * @returns {LinkedInOpsLocalDateParts}
 */
export function getLinkedInOpsLocalDateParts(date, timezone = DEFAULT_TIMEZONE) {
  const instant = coerceDate(date);

  const isoDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(instant);

  const weekday = normalizeLinkedInOpsWeekday(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    }).format(instant)
  );

  return { isoDate, weekday };
}

/**
 * @param {string} isoDate
 * @param {string} [timezone]
 * @returns {string}
 */
function getWeekdayForIsoDate(isoDate, timezone = DEFAULT_TIMEZONE) {
  const parts = parseIsoDate(isoDate);
  if (!parts) return '';

  const noonUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  return normalizeLinkedInOpsWeekday(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long'
    }).format(noonUtc)
  );
}

/**
 * @param {Date | string | number} date
 * @param {string} [timezone]
 * @returns {LinkedInOpsWeekRange}
 */
export function getLinkedInOpsWeekRange(date, timezone = DEFAULT_TIMEZONE) {
  const { isoDate, weekday } = getLinkedInOpsLocalDateParts(date, timezone);
  const weekdayIndex = WEEKDAY_ORDER.indexOf(weekday);
  const offset = weekdayIndex >= 0 ? weekdayIndex : 0;
  const weekStartIsoDate = addDaysToIsoDate(isoDate, -offset);
  const weekEndIsoDate = addDaysToIsoDate(weekStartIsoDate, 6);

  return { weekStartIsoDate, weekEndIsoDate };
}

/**
 * @param {string} weekStartIsoDate
 * @param {string} [timezone]
 * @returns {Record<string, string>}
 */
function buildWeekdayIsoDateMap(weekStartIsoDate, timezone = DEFAULT_TIMEZONE) {
  /** @type {Record<string, string>} */
  const map = {};

  for (let offset = 0; offset < 7; offset += 1) {
    const isoDate = addDaysToIsoDate(weekStartIsoDate, offset);
    const weekday = getWeekdayForIsoDate(isoDate, timezone);
    if (weekday) map[weekday] = isoDate;
  }

  return map;
}

/**
 * @param {LinkedInOpsTask[]} tasks
 * @returns {LinkedInOpsTask[]}
 */
export function sortLinkedInOpsTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.isoDate !== b.isoDate) return a.isoDate.localeCompare(b.isoDate);
    if (a.scheduledTime !== b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
    return a.slotId.localeCompare(b.slotId);
  });
}

/**
 * @param {string} timezone
 * @param {string} [planVersion]
 * @param {Partial<LinkedInOpsTaskResolverMetadata>} [metadata]
 * @returns {LinkedInOpsTaskResolverResult}
 */
function createEmptyResult(timezone, planVersion = DEFAULT_PLAN_VERSION, metadata = {}) {
  return {
    todayTasks: [],
    weekTasks: [],
    allowedTaskIds: [],
    metadata: {
      timezone,
      planVersion,
      todayIsoDate: '',
      weekStartIsoDate: '',
      weekEndIsoDate: '',
      ...metadata
    }
  };
}

/**
 * @param {object} slot
 * @param {string} isoDate
 * @param {import('./linkedin-ops-completion-state.js').LinkedInOpsCompletionState | null | undefined} completedState
 * @returns {LinkedInOpsTask | null}
 */
function buildTaskFromSlot(slot, isoDate, completedState) {
  const slotId = String(slot?.id ?? '').trim();
  const taskId = buildLinkedInOpsTaskId(slotId, isoDate);
  if (!taskId) return null;

  return {
    taskId,
    slotId,
    isoDate,
    period: 'week',
    titleTr: String(slot?.titleTr ?? ''),
    accountType: String(slot?.accountType ?? ''),
    actionType: String(slot?.actionType ?? ''),
    themeId: String(slot?.themeId ?? ''),
    objectiveTr: String(slot?.objectiveTr ?? ''),
    scheduledTime: String(slot?.localTime ?? ''),
    isCompleted: isLinkedInOpsTaskCompleted(completedState, taskId)
  };
}

/**
 * @param {object} slot
 * @param {Record<string, string>} weekdayIsoDateMap
 * @param {import('./linkedin-ops-completion-state.js').LinkedInOpsCompletionState | null | undefined} completedState
 * @returns {LinkedInOpsTask[]}
 */
function resolveSlotTasks(slot, weekdayIsoDateMap, completedState) {
  /** @type {LinkedInOpsTask[]} */
  const tasks = [];

  const days = Array.isArray(slot?.daysOfWeek)
    ? slot.daysOfWeek
    : slot?.dayOfWeek
      ? [slot.dayOfWeek]
      : [];

  for (const dayValue of days) {
    const weekday = normalizeLinkedInOpsWeekday(dayValue);
    const isoDate = weekdayIsoDateMap[weekday];
    if (!isoDate) continue;

    const task = buildTaskFromSlot(slot, isoDate, completedState);
    if (task) tasks.push(task);
  }

  return tasks;
}

/**
 * @param {object | null | undefined} plan
 * @param {LinkedInOpsTaskResolverOptions} [options]
 * @returns {LinkedInOpsTaskResolverResult}
 */
export function resolveLinkedInOpsTasks(plan, options = {}) {
  const timezone = options.timezone || plan?.timezone || DEFAULT_TIMEZONE;
  const planVersion = String(plan?.version ?? DEFAULT_PLAN_VERSION);
  const completedState = options.completedState ?? null;
  const now = options.now ?? new Date();

  if (!plan || typeof plan !== 'object') {
    return createEmptyResult(timezone, planVersion);
  }

  const slots = Array.isArray(plan.slots) ? plan.slots : [];
  if (!slots.length) {
    return createEmptyResult(timezone, planVersion);
  }

  const { isoDate: todayIsoDate } = getLinkedInOpsLocalDateParts(now, timezone);
  const { weekStartIsoDate, weekEndIsoDate } = getLinkedInOpsWeekRange(now, timezone);
  const weekdayIsoDateMap = buildWeekdayIsoDateMap(weekStartIsoDate, timezone);

  /** @type {LinkedInOpsTask[]} */
  const weekTasks = [];

  for (const slot of slots) {
    weekTasks.push(...resolveSlotTasks(slot, weekdayIsoDateMap, completedState));
  }

  const sortedWeekTasks = sortLinkedInOpsTasks(weekTasks).map((task) => ({
    ...task,
    period: task.isoDate === todayIsoDate ? 'today' : 'week'
  }));

  const todayTasks = sortedWeekTasks
    .filter((task) => task.isoDate === todayIsoDate)
    .map((task) => ({ ...task, period: 'today' }));

  return {
    todayTasks,
    weekTasks: sortedWeekTasks,
    allowedTaskIds: sortedWeekTasks.map((task) => task.taskId),
    metadata: {
      timezone,
      planVersion,
      todayIsoDate,
      weekStartIsoDate,
      weekEndIsoDate
    }
  };
}
