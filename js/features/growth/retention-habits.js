/**
 * P5.4 — Habit loops: weekly visits, streaks, engagement score.
 */
import { readStorageRaw, writeStorageRaw } from '../../core/storage-keys.js';
import { analytics } from '../../core/analytics.js';
import { trackGrowth } from './growth-engine.js';

const HABIT_KEY = 'istebul_retention_habit';
const DEFAULT_WEIGHTS = {
  route_change: 1,
  saved_decision: 3,
  wizard_complete: 5,
  results_view: 4,
  checkout_start: 6
};

function readHabit() {
  try {
    const raw = readStorageRaw(HABIT_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          weekKey: null,
          weeklyVisits: 0,
          streakWeeks: 0,
          score: 0,
          lastMilestone: 0
        };
  } catch {
    return { weekKey: null, weeklyVisits: 0, streakWeeks: 0, score: 0, lastMilestone: 0 };
  }
}

function writeHabit(state) {
  try {
    writeStorageRaw(HABIT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function isoWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * @param {Record<string, number>} [weights]
 */
export function recordHabitAction(action, weight, weights = DEFAULT_WEIGHTS) {
  const w = weight ?? weights[action] ?? 1;
  const state = readHabit();
  state.score = (state.score || 0) + w;
  writeHabit(state);

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_habit_action',
      { action, weight: w, score: state.score },
      { funnel: 'retention', funnel_step: 'habit' }
    );
  }
}

/**
 * @param {number[]} [milestones]
 */
export function tickWeeklyVisit(milestones = [2, 4, 8]) {
  const state = readHabit();
  const week = isoWeekKey();

  if (state.weekKey !== week) {
    if (state.weekKey && state.weeklyVisits >= 1) {
      state.streakWeeks = (state.streakWeeks || 0) + 1;
    } else if (state.weekKey) {
      state.streakWeeks = 0;
    }
    state.weekKey = week;
    state.weeklyVisits = 0;
  }

  state.weeklyVisits += 1;
  writeHabit(state);

  if (analytics.hasConsent()) {
    trackGrowth(
      'retention_habit_weekly_visit',
      { week, streak_weeks: state.streakWeeks, weekly_visits: state.weeklyVisits },
      { funnel: 'retention', funnel_step: 'weekly_visit' }
    );
  }

  for (const m of milestones) {
    if (state.streakWeeks >= m && (state.lastMilestone || 0) < m) {
      state.lastMilestone = m;
      writeHabit(state);
      if (analytics.hasConsent()) {
        trackGrowth(
          'retention_habit_milestone',
          { milestone_weeks: m, streak_weeks: state.streakWeeks },
          { funnel: 'retention', funnel_step: `milestone_${m}` }
        );
      }
      return { milestone: m, streakWeeks: state.streakWeeks };
    }
  }

  return { milestone: null, streakWeeks: state.streakWeeks };
}

export function getHabitState() {
  return readHabit();
}

export function getEngagementScore() {
  return readHabit().score || 0;
}
