import type { Task } from '@/types';
import { addDays, diffDays, pct, weekRange } from '@/lib/date';

export const PRIORITY_WEIGHT = { urgent: 0, high: 1, medium: 2, low: 3 } as const;

export function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.archived && t.status !== 'done');
}

export function isTaskOverdue(task: Task, today: string): boolean {
  return !!task.dueDate && task.dueDate < today && task.status !== 'done' && !task.archived;
}

export function isDueToday(task: Task, today: string): boolean {
  return task.dueDate === today && !task.archived;
}

export function tasksForDate(tasks: Task[], date: string): Task[] {
  return tasks.filter((t) => !t.archived && (t.dueDate === date || t.top3Date === date));
}

export function tasksForRange(tasks: Task[], start: string, end: string): Task[] {
  return tasks.filter((t) => !t.archived && t.dueDate && t.dueDate >= start && t.dueDate <= end);
}

export function tasksForWeek(tasks: Task[], date: string, weekStartsOn: 0 | 1 | 6 = 1): Task[] {
  const range = weekRange(date, weekStartsOn);
  return tasks.filter((t) => !t.archived && t.dueDate && range.includes(t.dueDate));
}

export function overdueTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter((t) => isTaskOverdue(t, today));
}

/** أهم 3 مهام لليوم: المختارة يدويًا أولًا، ثم المتأخرة، ثم الأعلى أولوية */
export function topThreeForDay(tasks: Task[], date: string): Task[] {
  const pool = tasks.filter((t) => !t.archived && t.status !== 'done');
  const picked = pool.filter((t) => t.top3Date === date);
  const rest = pool
    .filter((t) => t.top3Date !== date)
    .filter((t) => (t.dueDate ?? '9999-12-31') <= addDays(date, 1))
    .sort(sortTasks);
  return [...picked.sort(sortTasks), ...rest].slice(0, 3);
}

export function sortTasks(a: Task, b: Task): number {
  const pa = PRIORITY_WEIGHT[a.priority];
  const pb = PRIORITY_WEIGHT[b.priority];
  if (pa !== pb) return pa - pb;
  const da = a.dueDate ?? '9999-12-31';
  const db = b.dueDate ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  return a.createdAt < b.createdAt ? -1 : 1;
}

/** ترتيب يعطي الأولوية للمتأخرة ثم للأولوية ثم للتاريخ */
export function sortByUrgency(tasks: Task[], today: string): Task[] {
  return [...tasks].sort((a, b) => {
    const oa = isTaskOverdue(a, today) ? 0 : 1;
    const ob = isTaskOverdue(b, today) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return sortTasks(a, b);
  });
}

export interface TaskStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  dueToday: number;
  plannedMinutes: number;
  actualMinutes: number;
  completionRate: number;
}

export function taskStats(tasks: Task[], today: string): TaskStats {
  const live = tasks.filter((t) => !t.archived);
  const completed = live.filter((t) => t.status === 'done');
  const remaining = live.filter((t) => t.status !== 'done');
  const plannedMinutes = live.reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0);
  const actualMinutes = live.reduce((s, t) => s + (t.actualMinutes ?? 0), 0);
  return {
    total: live.length,
    completed: completed.length,
    remaining: remaining.length,
    overdue: remaining.filter((t) => isTaskOverdue(t, today)).length,
    dueToday: live.filter((t) => t.dueDate === today && t.status !== 'done').length,
    plannedMinutes,
    actualMinutes,
    completionRate: pct(completed.length, live.length),
  };
}

/** إتمام مهام اليوم خلال آخر n يومًا — لتغذية الرسم البياني */
export function completedPerDay(tasks: Task[], end: string, days = 7): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = addDays(end, -i);
    const count = tasks.filter((t) => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) === date).length;
    out.push({ date, count });
  }
  return out;
}

/** اقتراح إعادة الجدولة: توزيع المهام المتأخرة على الأيام القادمة */
export function suggestReschedule(tasks: Task[], today: string, perDay = 3): { taskId: string; newDate: string }[] {
  const overdue = overdueTasks(tasks, today).sort(sortTasks);
  return overdue.map((t, i) => ({ taskId: t.id, newDate: addDays(today, Math.floor(i / perDay)) }));
}

export function searchTasks(tasks: Task[], term: string): Task[] {
  const q = term.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      (t.notes ?? '').toLowerCase().includes(q) ||
      (t.category ?? '').toLowerCase().includes(q),
  );
}

export function taskAgeDays(task: Task, today: string): number {
  return diffDays(today, task.createdAt.slice(0, 10));
}
