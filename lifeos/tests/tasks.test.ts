import { describe, expect, it } from 'vitest';
import { completedPerDay, isTaskOverdue, searchTasks, sortByUrgency, suggestReschedule, taskStats, topThreeForDay } from '@/lib/domain/tasks';
import { makeTask } from './helpers';

const TODAY = '2026-01-10';

describe('task queries', () => {
  it('detects overdue tasks only when open and past due', () => {
    expect(isTaskOverdue(makeTask({ id: 'a', dueDate: '2026-01-09' }), TODAY)).toBe(true);
    expect(isTaskOverdue(makeTask({ id: 'b', dueDate: '2026-01-09', status: 'done' }), TODAY)).toBe(false);
    expect(isTaskOverdue(makeTask({ id: 'c', dueDate: '2026-01-11' }), TODAY)).toBe(false);
    expect(isTaskOverdue(makeTask({ id: 'd', dueDate: '2026-01-09', archived: true }), TODAY)).toBe(false);
  });

  it('computes stats from the real list', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', estimatedMinutes: 30, actualMinutes: 25 }),
      makeTask({ id: 'b', dueDate: '2026-01-09', estimatedMinutes: 60 }),
      makeTask({ id: 'c', dueDate: TODAY, estimatedMinutes: 45 }),
      makeTask({ id: 'd', archived: true }),
    ];
    const stats = taskStats(tasks, TODAY);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(1);
    expect(stats.remaining).toBe(2);
    expect(stats.overdue).toBe(1);
    expect(stats.dueToday).toBe(1);
    expect(stats.plannedMinutes).toBe(135);
    expect(stats.actualMinutes).toBe(25);
    expect(stats.completionRate).toBe(33);
  });

  it('builds the top three from picks, overdue and priority', () => {
    const tasks = [
      makeTask({ id: 'pick', priority: 'low', top3Date: TODAY }),
      makeTask({ id: 'late', priority: 'low', dueDate: '2026-01-08' }),
      makeTask({ id: 'urgent', priority: 'urgent', dueDate: '2026-01-11' }),
      makeTask({ id: 'far', priority: 'low', dueDate: '2026-02-01' }),
    ];
    const top = topThreeForDay(tasks, TODAY).map((task) => task.id);
    expect(top).toHaveLength(3);
    expect(top[0]).toBe('pick');
    expect(top).toContain('late');
    expect(top).toContain('urgent');
    expect(top).not.toContain('far');
  });

  it('orders by overdue, then priority, then due date', () => {
    const tasks = [
      makeTask({ id: 'a', priority: 'low', dueDate: '2026-01-20' }),
      makeTask({ id: 'b', priority: 'urgent', dueDate: '2026-01-15' }),
      makeTask({ id: 'c', priority: 'medium', dueDate: '2026-01-05' }),
    ];
    expect(sortByUrgency(tasks, TODAY).map((task) => task.id)).toEqual(['c', 'b', 'a']);
  });

  it('suggests a reschedule plan that spreads overdue work', () => {
    const tasks = ['a', 'b', 'c', 'd'].map((id, i) => makeTask({ id, dueDate: `2026-01-0${i + 1}` }));
    const plan = suggestReschedule(tasks, TODAY, 2);
    expect(plan).toHaveLength(4);
    expect(plan.map((p) => p.newDate)).toEqual(['2026-01-10', '2026-01-10', '2026-01-11', '2026-01-11']);
  });

  it('searches title, notes and category', () => {
    const tasks = [makeTask({ id: 'a', title: 'Write report' }), makeTask({ id: 'b', title: 'Buy milk', category: 'home' })];
    expect(searchTasks(tasks, 'report').map((t) => t.id)).toEqual(['a']);
    expect(searchTasks(tasks, 'HOME').map((t) => t.id)).toEqual(['b']);
    expect(searchTasks(tasks, '   ')).toHaveLength(2);
  });

  it('counts completions per day from completedAt', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', completedAt: '2026-01-10T09:00:00.000Z' }),
      makeTask({ id: 'b', status: 'done', completedAt: '2026-01-10T18:00:00.000Z' }),
      makeTask({ id: 'c', status: 'done', completedAt: '2026-01-09T18:00:00.000Z' }),
    ];
    const series = completedPerDay(tasks, '2026-01-10', 3);
    expect(series).toEqual([
      { date: '2026-01-08', count: 0 },
      { date: '2026-01-09', count: 1 },
      { date: '2026-01-10', count: 2 },
    ]);
  });
});
