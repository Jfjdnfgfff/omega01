import { describe, expect, it } from 'vitest';
import { blocksForDate, dayLoad, findConflicts, findFreeSlot, isScheduleUnrealistic, timeBreakdown, timePerDay } from '@/lib/domain/time';
import { buildDailyPlan } from '@/lib/domain/coach';
import { makeBlock, makeProject, makeTask, makeTimeLog, emptyCollections } from './helpers';
import type { Settings } from '@/types';

const TODAY = '2026-01-10';

function settings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'settings',
    createdAt: '',
    updatedAt: '',
    profile: { name: '', avatarColor: '#2563eb' },
    language: 'ar',
    theme: 'light',
    timezone: 'UTC',
    weekStartsOn: 1,
    currency: 'DZD',
    monthlyBudget: 0,
    dailyFocusTargetMinutes: 240,
    pomodoro: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
    privacy: { showFinanceOnDashboard: true, showAiCoach: true, cloudSyncEnabled: true },
    coach: { provider: 'none', baseUrl: '', model: '' },
    ...overrides,
  };
}

describe('schedule', () => {
  it('detects overlapping blocks and how much they overlap', () => {
    const blocks = [
      makeBlock({ id: 'a', start: '09:00', end: '10:00' }),
      makeBlock({ id: 'b', start: '09:30', end: '11:00' }),
      makeBlock({ id: 'c', start: '11:00', end: '12:00' }),
    ];
    const conflicts = findConflicts(blocks);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });

  it('reports day load and overload state', () => {
    const blocks = [makeBlock({ id: 'a', start: '09:00', end: '13:00' }), makeBlock({ id: 'b', start: '14:00', end: '15:00' })];
    const load = dayLoad(blocks, 300);
    expect(load.workMinutes).toBe(300);
    expect(load.loadPercent).toBe(100);
    expect(load.overloaded).toBe(false);
    expect(load.firstStart).toBe('09:00');
    expect(load.lastEnd).toBe('15:00');
    expect(dayLoad([...blocks, makeBlock({ id: 'c', start: '15:00', end: '16:00' })], 300).overloaded).toBe(true);
  });

  it('ignores breaks when computing work load', () => {
    const blocks = [makeBlock({ id: 'a', start: '09:00', end: '10:00' }), makeBlock({ id: 'b', start: '10:00', end: '10:30', kind: 'break' })];
    expect(dayLoad(blocks, 480).workMinutes).toBe(60);
    expect(dayLoad(blocks, 480).breakMinutes).toBe(30);
  });

  it('finds the first free slot long enough', () => {
    const blocks = [makeBlock({ id: 'a', start: '08:00', end: '09:00' }), makeBlock({ id: 'b', start: '09:30', end: '10:30' })];
    expect(findFreeSlot(blocks, 30, '08:00', '18:00')).toEqual({ start: '09:00', end: '09:30' });
    expect(findFreeSlot(blocks, 60, '08:00', '18:00')).toEqual({ start: '10:30', end: '11:30' });
    expect(findFreeSlot(blocks, 600, '08:00', '09:00')).toBeNull();
  });

  it('flags unrealistic days (over capacity, conflicts, no breaks)', () => {
    expect(isScheduleUnrealistic([makeBlock({ id: 'a', start: '08:00', end: '20:00' })], { maxWorkMinutes: 600 }).reasons).toContain('overCapacity');
    expect(
      isScheduleUnrealistic([makeBlock({ id: 'a', start: '09:00', end: '10:00' }), makeBlock({ id: 'b', start: '09:30', end: '10:30' })]).reasons,
    ).toContain('conflicts');
    expect(
      isScheduleUnrealistic([
        makeBlock({ id: 'a', start: '09:00', end: '10:00' }),
        makeBlock({ id: 'b', start: '10:00', end: '11:00' }),
        makeBlock({ id: 'c', start: '11:00', end: '12:00' }),
      ]).reasons,
    ).toContain('noBreaks');
    expect(isScheduleUnrealistic([makeBlock({ id: 'a', start: '09:00', end: '10:00' })]).overloaded).toBe(false);
  });

  it('filters blocks by date', () => {
    const blocks = [makeBlock({ id: 'a', date: TODAY }), makeBlock({ id: 'b', date: '2026-01-11' })];
    expect(blocksForDate(blocks, TODAY).map((b) => b.id)).toEqual(['a']);
  });
});

describe('time reporting', () => {
  it('breaks time down by project including tasks that inherit their project', () => {
    const projects = [makeProject({ id: 'p1', name: 'App' })];
    const tasks = [makeTask({ id: 't1', projectId: 'p1' })];
    const logs = [
      makeTimeLog({ id: 'l1', projectId: 'p1', minutes: 60, date: '2026-01-08' }),
      makeTimeLog({ id: 'l2', taskId: 't1', minutes: 30, date: '2026-01-09' }),
      makeTimeLog({ id: 'l3', minutes: 10, date: '2026-01-09' }),
      makeTimeLog({ id: 'l4', minutes: 99, date: '2025-12-01' }),
    ];
    const rows = timeBreakdown(logs, '2026-01-04', '2026-01-10', projects, tasks, 'project');
    expect(rows[0].label).toBe('App');
    expect(rows[0].minutes).toBe(90);
    expect(rows[0].percent).toBe(90);
    expect(rows[1].label).toBe('__unassigned__');
  });

  it('excludes breaks from invested time', () => {
    const logs = [makeTimeLog({ id: 'l1', minutes: 25, kind: 'break' }), makeTimeLog({ id: 'l2', minutes: 45 })];
    expect(timePerDay(logs, [TODAY])[0].minutes).toBe(45);
  });
});

describe('daily plan builder', () => {
  it('fills available capacity in priority order and defers the rest', () => {
    const data = emptyCollections();
    data.tasks = [
      makeTask({ id: 'urgent', priority: 'urgent', estimatedMinutes: 60 }),
      makeTask({ id: 'late', priority: 'low', dueDate: '2026-01-05', estimatedMinutes: 60 }),
      makeTask({ id: 'small', priority: 'medium', estimatedMinutes: 30 }),
      makeTask({ id: 'big', priority: 'medium', estimatedMinutes: 240 }),
    ];
    const plan = buildDailyPlan(data, settings({ dailyFocusTargetMinutes: 150 }), TODAY, { dayStart: '08:00', dayEnd: '20:00' });
    expect(plan.totalMinutes).toBeLessThanOrEqual(150);
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.deferred).toBeGreaterThan(0);
    // nothing overlaps
    const sorted = [...plan.steps].sort((a, b) => a.start.localeCompare(b.start));
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].start >= sorted[i - 1].end).toBe(true);
    }
  });

  it('never schedules around existing blocks', () => {
    const data = emptyCollections();
    data.timeBlocks = [makeBlock({ id: 'busy', start: '08:00', end: '10:00' })];
    data.tasks = [makeTask({ id: 't1', priority: 'high', estimatedMinutes: 60 })];
    const plan = buildDailyPlan(data, settings({ dailyFocusTargetMinutes: 240 }), TODAY, { dayStart: '08:00', dayEnd: '12:00' });
    expect(plan.steps[0].start >= '10:00').toBe(true);
  });

  it('inserts breaks after long stretches of work', () => {
    const data = emptyCollections();
    data.tasks = ['a', 'b', 'c'].map((id) => makeTask({ id, priority: 'high', estimatedMinutes: 60 }));
    const plan = buildDailyPlan(data, settings({ dailyFocusTargetMinutes: 200 }), TODAY, { dayStart: '08:00', dayEnd: '20:00' });
    expect(plan.breaks.length).toBeGreaterThan(0);
  });

  it('returns an empty plan when there is nothing to schedule', () => {
    const plan = buildDailyPlan(emptyCollections(), settings(), TODAY);
    expect(plan.steps).toEqual([]);
    expect(plan.warnings).toEqual([]);
  });
});
