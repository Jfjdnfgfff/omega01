import { describe, expect, it } from 'vitest';
import { goalIsOverdue, goalProgress, linkedTaskProgress, metricProgress, milestoneProgress, sortGoals } from '@/lib/domain/goals';
import { makeGoal, makeTask } from './helpers';

const TODAY = '2026-01-10';

describe('goal progress', () => {
  it('is computed from linked tasks, weighted by estimate', () => {
    const tasks = [
      makeTask({ id: 't1', goalId: 'g1', status: 'done', estimatedMinutes: 60 }),
      makeTask({ id: 't2', goalId: 'g1', status: 'todo', estimatedMinutes: 30 }),
      makeTask({ id: 't3', goalId: 'other' }),
    ];
    const result = linkedTaskProgress('g1', tasks);
    expect(result.total).toBe(2);
    expect(result.done).toBe(1);
    expect(result.percent).toBe(67); // 60 / 90
  });

  it('uses milestones when there are no tasks', () => {
    const goal = makeGoal({ id: 'g1', milestones: [{ id: 'm1', title: 'a', done: true }, { id: 'm2', title: 'b', done: false }] });
    expect(milestoneProgress(goal).percent).toBe(50);
    expect(goalProgress(goal, [])).toBe(50);
  });

  it('uses the metric when defined', () => {
    const goal = makeGoal({
      id: 'g1',
      metric: { label: 'pages', unit: '', startValue: 0, targetValue: 200, currentValue: 50 },
    });
    expect(metricProgress(goal).percent).toBe(25);
    expect(goalProgress(goal, [])).toBe(25);
  });

  it('prefers a manual override', () => {
    const goal = makeGoal({ id: 'g1', manualProgress: 80 });
    expect(goalProgress(goal, [])).toBe(80);
  });

  it('treats achieved goals as 100%', () => {
    const goal = makeGoal({ id: 'g1', status: 'achieved' });
    expect(goalProgress(goal, [])).toBe(100);
  });

  it('averages the available signals', () => {
    const goal = makeGoal({
      id: 'g1',
      milestones: [{ id: 'm1', title: 'a', done: true }],
      metric: { label: 'x', unit: '', startValue: 0, targetValue: 100, currentValue: 50 },
    });
    // milestones 100%, metric 50% → 75
    expect(goalProgress(goal, [])).toBe(75);
  });
});

describe('goal deadlines', () => {
  it('flags overdue active goals only', () => {
    expect(goalIsOverdue(makeGoal({ id: 'g1', deadline: '2026-01-01' }), TODAY)).toBe(true);
    expect(goalIsOverdue(makeGoal({ id: 'g2', deadline: '2026-02-01' }), TODAY)).toBe(false);
    expect(goalIsOverdue(makeGoal({ id: 'g3', deadline: '2026-01-01', status: 'achieved' }), TODAY)).toBe(false);
  });

  it('sorts overdue first, then by priority and deadline', () => {
    const goals = [
      makeGoal({ id: 'a', priority: 'low', deadline: '2026-06-01' }),
      makeGoal({ id: 'b', priority: 'urgent', deadline: '2026-01-01' }),
      makeGoal({ id: 'c', priority: 'high', deadline: '2026-03-01' }),
    ];
    expect(sortGoals(goals, [], TODAY).map((g) => g.id)).toEqual(['b', 'c', 'a']);
  });
});
