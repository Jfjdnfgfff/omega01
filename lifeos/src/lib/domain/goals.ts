import type { Goal, Task } from '@/types';
import { pct } from '@/lib/date';

/**
 * منطق الأهداف — كل الأرقام هنا محسوبة من البيانات الفعلية.
 */

/** تقدم المهام المرتبطة بالهدف (مرجّح بالمدة التقديرية عند توفرها) */
export function linkedTaskProgress(goalId: string, tasks: Task[]): { done: number; total: number; percent: number } {
  const linked = tasks.filter((t) => t.goalId === goalId && !t.archived);
  const done = linked.filter((t) => t.status === 'done');
  if (linked.length === 0) return { done: 0, total: 0, percent: 0 };
  const weight = (t: Task) => (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 1);
  const totalWeight = linked.reduce((s, t) => s + weight(t), 0);
  const doneWeight = done.reduce((s, t) => s + weight(t), 0);
  return { done: done.length, total: linked.length, percent: pct(doneWeight, totalWeight) };
}

export function milestoneProgress(goal: Goal): { done: number; total: number; percent: number } {
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.done).length;
  return { done, total, percent: pct(done, total) };
}

export function metricProgress(goal: Goal): { percent: number; remaining: number; ratio: number } {
  const m = goal.metric;
  if (!m) return { percent: 0, remaining: 0, ratio: 0 };
  const span = m.targetValue - m.startValue;
  if (span === 0) return { percent: m.currentValue >= m.targetValue ? 100 : 0, remaining: 0, ratio: 0 };
  const ratio = (m.currentValue - m.startValue) / span;
  return {
    percent: Math.max(0, Math.min(100, Math.round(ratio * 100))),
    remaining: m.targetValue - m.currentValue,
    ratio,
  };
}

/**
 * نسبة تقدم الهدف:
 * - تجاوز يدوي إن وُجد
 * - وإلا متوسط المراحل / المهام / المقياس المتاحة
 */
export function goalProgress(goal: Goal, tasks: Task[]): number {
  if (goal.manualProgress !== null && goal.manualProgress !== undefined) {
    return Math.max(0, Math.min(100, Math.round(goal.manualProgress)));
  }
  if (goal.status === 'achieved') return 100;
  const signals: number[] = [];
  const ms = milestoneProgress(goal);
  if (ms.total > 0) signals.push(ms.percent);
  const lt = linkedTaskProgress(goal.id, tasks);
  if (lt.total > 0) signals.push(lt.percent);
  if (goal.metric) signals.push(metricProgress(goal).percent);
  if (signals.length === 0) return 0;
  return Math.round(signals.reduce((a, b) => a + b, 0) / signals.length);
}

export function goalIsOverdue(goal: Goal, today: string): boolean {
  return !!goal.deadline && goal.deadline < today && goal.status === 'active';
}

export function goalIsDueSoon(goal: Goal, today: string, days = 7): boolean {
  if (!goal.deadline || goal.status !== 'active') return false;
  const delta = Math.round((new Date(goal.deadline).getTime() - new Date(today).getTime()) / 86_400_000);
  return delta >= 0 && delta <= days;
}

export function daysUntil(iso: string | null, today: string): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - new Date(today).getTime()) / 86_400_000);
}

export const HORIZON_ORDER: Goal['horizon'][] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export function sortGoals(goals: Goal[], tasks: Task[], today: string): Goal[] {
  const priorityWeight = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
  return [...goals].sort((a, b) => {
    const overdueA = goalIsOverdue(a, today) ? 0 : 1;
    const overdueB = goalIsOverdue(b, today) ? 0 : 1;
    if (overdueA !== overdueB) return overdueA - overdueB;
    const pa = priorityWeight[a.priority];
    const pb = priorityWeight[b.priority];
    if (pa !== pb) return pa - pb;
    const da = a.deadline ?? '9999-12-31';
    const db = b.deadline ?? '9999-12-31';
    if (da !== db) return da < db ? -1 : 1;
    return goalProgress(b, tasks) - goalProgress(a, tasks);
  });
}
