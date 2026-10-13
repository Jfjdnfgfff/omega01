import { describe, expect, it } from 'vitest';
import {
  habitLogKey,
  habitMetOn,
  habitMonthSummary,
  habitNeedsAttention,
  habitStreaks,
  habitWeekSummary,
  habitsOverview,
  isHabitLoggedOn,
} from '@/lib/domain/habits';
import { makeHabit, makeHabitLog } from './helpers';
import { deterministicId } from '@/lib/id';

const TODAY = '2026-01-10'; // Saturday

describe('habit logging', () => {
  it('produces one deterministic key per habit+day so duplicates cannot be created', () => {
    const key = habitLogKey('h1', '2026-01-10');
    expect(deterministicId(key)).toBe(deterministicId(key));
    expect(deterministicId(habitLogKey('h1', '2026-01-10'))).not.toBe(deterministicId(habitLogKey('h2', '2026-01-10')));
  });

  it('detects an existing log for the same habit and day', () => {
    const logs = [makeHabitLog('h1', '2026-01-10')];
    expect(isHabitLoggedOn(logs, 'h1', '2026-01-10')).toBe(true);
    expect(isHabitLoggedOn(logs, 'h1', '2026-01-09')).toBe(false);
  });

  it('requires the full rep count before the habit counts as met', () => {
    const habit = makeHabit({ id: 'h1', repsPerDay: 3 });
    const logs = [{ ...makeHabitLog('h1', '2026-01-10'), count: 2 }];
    expect(habitMetOn(logs, habit, '2026-01-10')).toBe(false);
    expect(habitMetOn([{ ...makeHabitLog('h1', '2026-01-10'), count: 3 }], habit, '2026-01-10')).toBe(true);
  });
});

describe('habit streaks', () => {
  it('counts consecutive days ending today', () => {
    const habit = makeHabit({ id: 'h1', startDate: '2026-01-01' });
    const logs = ['2026-01-08', '2026-01-09', '2026-01-10'].map((d) => makeHabitLog('h1', d));
    expect(habitStreaks(habit, logs, TODAY).current).toBe(3);
  });

  it('does not break the streak when today is not logged yet', () => {
    const habit = makeHabit({ id: 'h1', startDate: '2026-01-01' });
    const logs = ['2026-01-08', '2026-01-09'].map((d) => makeHabitLog('h1', d));
    expect(habitStreaks(habit, logs, TODAY).current).toBe(2);
  });

  it('resets after a missed day and keeps the best streak', () => {
    const habit = makeHabit({ id: 'h1', startDate: '2026-01-01' });
    const logs = ['2026-01-02', '2026-01-03', '2026-01-04', '2026-01-09', '2026-01-10'].map((d) => makeHabitLog('h1', d));
    const streaks = habitStreaks(habit, logs, TODAY);
    expect(streaks.current).toBe(2);
    expect(streaks.best).toBe(3);
  });

  it('never counts days before the habit started', () => {
    const habit = makeHabit({ id: 'h1', startDate: '2026-01-09' });
    const logs = ['2026-01-05', '2026-01-06', '2026-01-09'].map((d) => makeHabitLog('h1', d));
    expect(habitStreaks(habit, logs, TODAY).current).toBe(1);
  });
});

describe('habit adherence', () => {
  const habit = makeHabit({ id: 'h1', startDate: '2026-01-01' });
  const weekLogs = ['2026-01-05', '2026-01-06', '2026-01-07'].map((d) => makeHabitLog('h1', d));

  it('measures the current week against elapsed days only', () => {
    // week starts Saturday → 2026-01-10..2026-01-16, elapsed = 1 day (today)
    const summary = habitWeekSummary(habit, weekLogs, TODAY, 6);
    expect(summary.expected).toBe(1);
    expect(summary.met).toBe(0);
    expect(summary.percent).toBe(0);
  });

  it('counts Monday-based weeks correctly', () => {
    const summary = habitWeekSummary(habit, weekLogs, TODAY, 1);
    expect(summary.expected).toBe(6); // Mon 05 .. Sat 10
    expect(summary.met).toBe(3);
    expect(summary.percent).toBe(50);
  });

  it('computes monthly adherence up to today', () => {
    const summary = habitMonthSummary(habit, weekLogs, '2026-01', TODAY);
    expect(summary.expected).toBe(10);
    expect(summary.met).toBe(3);
    expect(summary.percent).toBe(30);
  });

  it('flags habits below their weekly target', () => {
    expect(habitNeedsAttention(habit, weekLogs, TODAY, 1)).toBe(true);
    const fullWeek = ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09', '2026-01-10'].map((d) => makeHabitLog('h1', d));
    expect(habitNeedsAttention(habit, fullWeek, TODAY, 1)).toBe(false);
  });

  it('aggregates the whole habit list for the dashboard', () => {
    const habits = [makeHabit({ id: 'h1', startDate: '2026-01-01' }), makeHabit({ id: 'h2', startDate: '2026-01-01' })];
    const logs = [makeHabitLog('h1', TODAY)];
    const overview = habitsOverview(habits, logs, TODAY, 1);
    expect(overview.total).toBe(2);
    expect(overview.doneToday).toBe(1);
    expect(overview.percentToday).toBe(50);
    expect(overview.currentStreak).toBe(1);
  });
});
