import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  resolveLinkedInOpsTasks,
  getLinkedInOpsLocalDateParts,
  getLinkedInOpsWeekRange,
  normalizeLinkedInOpsWeekday,
  sortLinkedInOpsTasks
} from '../../js/features/ops/linkedin-ops-task-resolver.js';
import {
  buildLinkedInOpsTaskId,
  createEmptyLinkedInOpsCompletionState
} from '../../js/features/ops/linkedin-ops-completion-state.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');

const weeklyPlan = JSON.parse(
  readFileSync(join(rootDir, 'data/ops/linkedin-weekly-plan.json'), 'utf8')
);

const FIXTURES = {
  monday: new Date('2026-06-15T07:00:00.000Z'),
  tuesday: new Date('2026-06-16T07:30:00.000Z'),
  friday: new Date('2026-06-19T07:30:00.000Z'),
  sunday: new Date('2026-06-21T09:00:00.000Z')
};

describe('linkedin-ops-task-resolver', () => {
  it('module imports successfully', () => {
    assert.equal(typeof resolveLinkedInOpsTasks, 'function');
    assert.equal(typeof getLinkedInOpsLocalDateParts, 'function');
    assert.equal(typeof getLinkedInOpsWeekRange, 'function');
    assert.equal(typeof normalizeLinkedInOpsWeekday, 'function');
    assert.equal(typeof sortLinkedInOpsTasks, 'function');
  });

  it('invalid/null plan returns empty result', () => {
    const result = resolveLinkedInOpsTasks(null);
    assert.deepEqual(result.todayTasks, []);
    assert.deepEqual(result.weekTasks, []);
    assert.deepEqual(result.allowedTaskIds, []);
    assert.equal(result.metadata.timezone, 'Europe/Istanbul');
  });

  it('metadata timezone defaults to Europe/Istanbul', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    assert.equal(result.metadata.timezone, 'Europe/Istanbul');
    assert.equal(result.metadata.planVersion, 'p16.0');
  });

  it('week start is calculated as Monday', () => {
    const range = getLinkedInOpsWeekRange(FIXTURES.tuesday, 'Europe/Istanbul');
    assert.equal(range.weekStartIsoDate, '2026-06-15');
    assert.equal(range.weekEndIsoDate, '2026-06-21');

    const mondayParts = getLinkedInOpsLocalDateParts(FIXTURES.monday, 'Europe/Istanbul');
    assert.equal(mondayParts.isoDate, '2026-06-15');
    assert.equal(normalizeLinkedInOpsWeekday(mondayParts.weekday), 'monday');
  });

  it('Tuesday fixture produces Tuesday post in weekTasks', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    const taskId = 'slot-tuesday-company-methodology:2026-06-16';

    assert.ok(result.weekTasks.some((task) => task.taskId === taskId));
    assert.equal(
      buildLinkedInOpsTaskId('slot-tuesday-company-methodology', '2026-06-16'),
      taskId
    );
  });

  it('weekday comment slot produces five separate Mon-Fri tasks', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    const commentTasks = result.weekTasks.filter(
      (task) => task.slotId === 'slot-weekday-comment-opportunity'
    );

    assert.equal(commentTasks.length, 5);
    assert.deepEqual(
      commentTasks.map((task) => task.isoDate),
      ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19']
    );
  });

  it('Tuesday fixture todayTasks contains only Istanbul-local Tuesday tasks', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });

    assert.ok(result.todayTasks.length > 0);
    assert.ok(result.todayTasks.every((task) => task.isoDate === '2026-06-16'));
    assert.ok(result.todayTasks.every((task) => task.period === 'today'));
    assert.ok(
      result.todayTasks.some((task) => task.slotId === 'slot-tuesday-company-methodology')
    );
    assert.ok(
      result.todayTasks.some((task) => task.slotId === 'slot-weekday-comment-opportunity')
    );
  });

  it('Friday fixture includes Friday post in todayTasks', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.friday });
    const fridayPost = result.todayTasks.find(
      (task) => task.slotId === 'slot-friday-company-tco'
    );

    assert.ok(fridayPost);
    assert.equal(fridayPost.isoDate, '2026-06-19');
    assert.equal(fridayPost.period, 'today');
  });

  it('Sunday fixture yields empty todayTasks', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.sunday });
    const sundayParts = getLinkedInOpsLocalDateParts(FIXTURES.sunday, 'Europe/Istanbul');

    assert.equal(sundayParts.isoDate, '2026-06-21');
    assert.equal(normalizeLinkedInOpsWeekday(sundayParts.weekday), 'sunday');
    assert.deepEqual(result.todayTasks, []);
    assert.ok(result.weekTasks.length > 0);
  });

  it('allowedTaskIds matches weekTasks taskId list exactly', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    assert.deepEqual(
      result.allowedTaskIds,
      result.weekTasks.map((task) => task.taskId)
    );
  });

  it('taskId format is compatible with P16-5A utility', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });

    for (const task of result.weekTasks) {
      assert.equal(task.taskId, buildLinkedInOpsTaskId(task.slotId, task.isoDate));
    }
  });

  it('completedState entry marks task as completed', () => {
    const completedState = createEmptyLinkedInOpsCompletionState();
    completedState.entries['slot-tuesday-company-methodology:2026-06-16'] = {
      completedAt: '2026-06-16T08:00:00.000Z',
      slotId: 'slot-tuesday-company-methodology'
    };

    const result = resolveLinkedInOpsTasks(weeklyPlan, {
      now: FIXTURES.tuesday,
      completedState
    });

    const completedTask = result.weekTasks.find(
      (task) => task.taskId === 'slot-tuesday-company-methodology:2026-06-16'
    );
    assert.ok(completedTask);
    assert.equal(completedTask.isCompleted, true);
  });

  it('missing completedState leaves tasks incomplete', () => {
    const result = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    assert.ok(result.weekTasks.every((task) => task.isCompleted === false));
  });

  it('sorting is deterministic by isoDate, scheduledTime, slotId', () => {
    const unsorted = [
      {
        taskId: 'b:2026-06-16',
        slotId: 'slot-b',
        isoDate: '2026-06-16',
        scheduledTime: '14:00',
        period: 'week',
        titleTr: 'B',
        accountType: 'company',
        actionType: 'post',
        themeId: 't',
        objectiveTr: 'o',
        isCompleted: false
      },
      {
        taskId: 'a:2026-06-15',
        slotId: 'slot-a',
        isoDate: '2026-06-15',
        scheduledTime: '10:00',
        period: 'week',
        titleTr: 'A',
        accountType: 'ceo',
        actionType: 'post',
        themeId: 't',
        objectiveTr: 'o',
        isCompleted: false
      }
    ];

    const sorted = sortLinkedInOpsTasks(unsorted);
    assert.deepEqual(
      sorted.map((task) => task.taskId),
      ['a:2026-06-15', 'b:2026-06-16']
    );

    const tuesdayResult = resolveLinkedInOpsTasks(weeklyPlan, { now: FIXTURES.tuesday });
    const sortedAgain = sortLinkedInOpsTasks([...tuesdayResult.weekTasks].reverse());
    assert.deepEqual(
      sortedAgain.map((task) => task.taskId),
      tuesdayResult.weekTasks.map((task) => task.taskId)
    );
  });

  it('utility source has no forbidden runtime patterns', () => {
    const source = readFileSync(
      join(rootDir, 'js/features/ops/linkedin-ops-task-resolver.js'),
      'utf8'
    );
    const forbidden = [
      'fetch(',
      'fetchOpsJson',
      'localStorage',
      'sessionStorage',
      'document.',
      'window.',
      'navigator.clipboard',
      'supabase',
      'openai',
      'groq',
      'postAiProxy',
      'linkedin.com',
      'auto-comment',
      'auto-post',
      'completionState',
      'dueCard'
    ];
    for (const pattern of forbidden) {
      assert.ok(!source.includes(pattern), `forbidden pattern found: ${pattern}`);
    }
  });
});
