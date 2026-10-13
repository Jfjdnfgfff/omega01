import { describe, expect, it } from 'vitest';
import { budgetState, monthTotals, savingsProgress, savingsRate, topExpenseCategories } from '@/lib/domain/finance';
import { buildReviewStats, buildWeeklySummary, periodKeyFor, recurringObstacles, suggestNextWeekPriorities } from '@/lib/domain/reviews';
import { buildDashboard } from '@/lib/domain/dashboard';
import { emptyCollections, makeGoal, makeHabit, makeHabitLog, makeProject, makeTask, makeTimeLog, makeTransaction } from './helpers';
import type { Settings } from '@/types';

const TODAY = '2026-01-10';
const MONTH = '2026-01';

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
    monthlyBudget: 1000,
    dailyFocusTargetMinutes: 240,
    pomodoro: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
    privacy: { showFinanceOnDashboard: true, showAiCoach: true, cloudSyncEnabled: true },
    coach: { provider: 'none', baseUrl: '', model: '' },
    ...overrides,
  };
}

describe('finance', () => {
  const txs = [
    makeTransaction({ id: 'a', type: 'income', amount: 5000, date: '2026-01-05' }),
    makeTransaction({ id: 'b', type: 'expense', amount: 1200, category: 'Food', date: '2026-01-06' }),
    makeTransaction({ id: 'c', type: 'expense', amount: 800, category: 'Food', date: '2026-01-07' }),
    makeTransaction({ id: 'd', type: 'expense', amount: 500, category: 'Transport', date: '2026-01-08' }),
    makeTransaction({ id: 'e', type: 'expense', amount: 300, date: '2025-12-20' }),
  ];

  it('totals income, expenses and net for a month only', () => {
    const totals = monthTotals(txs, MONTH);
    expect(totals.income).toBe(5000);
    expect(totals.expenses).toBe(2500);
    expect(totals.net).toBe(2500);
  });

  it('ranks expense categories by share', () => {
    const top = topExpenseCategories(txs, MONTH, 2);
    expect(top[0]).toEqual({ category: 'Food', amount: 2000, percent: 80 });
    expect(top[1].category).toBe('Transport');
  });

  it('tracks budget usage, projection and over-budget state', () => {
    const state = budgetState(txs, MONTH, 3000, 10, 31);
    expect(state.spent).toBe(2500);
    expect(state.usedPercent).toBe(83);
    expect(state.remaining).toBe(500);
    expect(state.overBudget).toBe(false);
    expect(state.dailyAverage).toBe(250);
    expect(state.projected).toBe(7750);
    expect(budgetState(txs, MONTH, 2000, 10, 31).overBudget).toBe(true);
  });

  it('computes the savings rate and goal progress', () => {
    expect(savingsRate(txs, MONTH)).toBe(50);
    expect(savingsProgress({ id: 's', name: 'x', targetAmount: 1000, currentAmount: 250, deadline: null, createdAt: '', updatedAt: '' })).toEqual({
      percent: 25,
      remaining: 750,
    });
  });
});

describe('reviews', () => {
  it('derives daily stats from recorded data', () => {
    const data = emptyCollections();
    data.tasks = [
      makeTask({ id: 'a', dueDate: TODAY, status: 'done', completedAt: `${TODAY}T10:00:00.000Z` }),
      makeTask({ id: 'b', dueDate: TODAY, status: 'todo' }),
    ];
    data.timeLogs = [makeTimeLog({ id: 'l1', date: TODAY, minutes: 50 }), makeTimeLog({ id: 'l2', date: TODAY, minutes: 20, kind: 'break' })];
    data.habits = [makeHabit({ id: 'h1', startDate: '2026-01-01' })];
    data.habitLogs = [makeHabitLog('h1', TODAY)];
    data.goals = [makeGoal({ id: 'g1', manualProgress: 40 })];

    const stats = buildReviewStats(data, 'daily', TODAY, 1);
    expect(stats.tasksCompleted).toBe(1);
    expect(stats.tasksPlanned).toBe(2);
    expect(stats.focusMinutes).toBe(50); // break excluded
    expect(stats.habitAdherence).toBe(100);
    expect(stats.goalsProgress).toBe(40);
  });

  it('period keys differ per review type', () => {
    expect(periodKeyFor('daily', TODAY)).toBe(TODAY);
    expect(periodKeyFor('weekly', TODAY)).toBe('2026-W02');
  });

  it('lists obstacles counted from the data', () => {
    const data = emptyCollections();
    data.tasks = [makeTask({ id: 'a', dueDate: '2026-01-01' }), makeTask({ id: 'b' }), makeTask({ id: 'c', rescheduledAt: '2026-01-02T00:00:00.000Z' })];
    const obstacles = recurringObstacles(data, TODAY);
    expect(obstacles.find((o) => o.key === 'overdueTasks')?.value).toBe(1);
    expect(obstacles.find((o) => o.key === 'unscheduledTasks')?.value).toBe(2);
    expect(obstacles.find((o) => o.key === 'rescheduledTasks')?.value).toBe(1);
  });

  it('suggests next-week priorities from overdue and high-priority work', () => {
    const data = emptyCollections();
    data.tasks = [
      makeTask({ id: 'late', dueDate: '2026-01-02' }),
      makeTask({ id: 'urgent', priority: 'urgent', dueDate: '2026-01-12' }),
      makeTask({ id: 'someday', priority: 'low', dueDate: '2026-06-01' }),
    ];
    const suggestions = suggestNextWeekPriorities(data, TODAY, 5);
    expect(suggestions.map((s) => s.taskId)).toEqual(['late', 'urgent']);
  });

  it('builds a weekly summary with real numbers', () => {
    const data = emptyCollections();
    data.tasks = [makeTask({ id: 'a', dueDate: '2026-01-08', status: 'done', completedAt: '2026-01-08T09:00:00.000Z' })];
    data.timeLogs = [makeTimeLog({ id: 'l1', date: '2026-01-08', minutes: 45 })];
    const summary = buildWeeklySummary(data, TODAY, 1);
    expect(summary.stats.tasksCompleted).toBe(1);
    expect(summary.stats.focusMinutes).toBe(45);
    expect(summary.completedTasks).toEqual(['task a']);
    expect(summary.timePerDay).toHaveLength(7);
  });
});

describe('dashboard model', () => {
  it('aggregates real data and raises the right alerts', () => {
    const data = emptyCollections();
    data.tasks = [
      makeTask({ id: 'a', dueDate: '2026-01-01', priority: 'urgent' }),
      makeTask({ id: 'b', dueDate: TODAY, status: 'done', completedAt: `${TODAY}T09:00:00.000Z` }),
    ];
    data.goals = [makeGoal({ id: 'g1', deadline: '2026-01-05' })];
    data.habits = [makeHabit({ id: 'h1', startDate: '2026-01-01' })];
    data.projects = [makeProject({ id: 'p1', endDate: '2026-01-11' })];
    // عمل متبقٍ أكبر من السعة المتاحة قبل الموعد النهائي → المشروع في خطر
    data.tasks.push(makeTask({ id: 'heavy', projectId: 'p1', estimatedMinutes: 900, dueDate: '2026-01-30' }));
    data.timeLogs = [makeTimeLog({ id: 'l1', date: TODAY, minutes: 30, projectId: 'p1' })];
    data.transactions = [makeTransaction({ id: 't1', type: 'expense', amount: 1500, date: '2026-01-03' })];

    const model = buildDashboard(data, settings(), TODAY);
    expect(model.tasks.remaining).toBe(2);
    expect(model.tasks.completed).toBe(1);
    expect(model.tasks.overdue).toBe(1);
    expect(model.goals.overdue).toBe(1);
    expect(model.goals.averageProgress).toBe(0);
    expect(model.habits.doneToday).toBe(0);
    expect(model.projects[0].atRisk).toBe(true);
    expect(model.time.todayMinutes).toBe(30);
    expect(model.finance?.expenses).toBe(1500);
    expect(model.finance?.budget.overBudget).toBe(true);
    expect(model.alerts.map((a) => a.kind)).toEqual(expect.arrayContaining(['overdueTasks', 'overdueGoals', 'budget', 'habitsSlipping']));
    expect(model.reviewDoneToday).toBe(false);
    expect(model.empty).toBe(false);
  });

  it('reports an empty workspace when nothing exists', () => {
    const model = buildDashboard(emptyCollections(), settings(), TODAY);
    expect(model.empty).toBe(true);
    expect(model.goals.averageProgress).toBe(0);
  });

  it('hides finance when the privacy switch is off', () => {
    const data = emptyCollections();
    data.transactions = [makeTransaction({ id: 't1', amount: 100, date: '2026-01-03' })];
    const model = buildDashboard(data, settings({ privacy: { showFinanceOnDashboard: false, showAiCoach: true, cloudSyncEnabled: true } }), TODAY);
    expect(model.finance).toBeNull();
  });
});
