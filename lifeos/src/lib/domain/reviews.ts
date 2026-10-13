import type { DataCollections, Goal, ReviewStats, Task } from '@/types';
import { addDays, diffDays, isoWeekKey, pct, startOfISOWeek, weekRange } from '@/lib/date';
import { goalProgress } from '@/lib/domain/goals';
import { habitsOverview } from '@/lib/domain/habits';
import { isTaskOverdue, sortByUrgency } from '@/lib/domain/tasks';
import { monthTotals } from '@/lib/domain/finance';
import { timePerDay } from '@/lib/domain/time';

/**
 * منطق المراجعات — النتائج تُحسب من البيانات المسجّلة فقط،
 * ولا يتم اصطناع أي تقييم نفسي أو أرقام غير موجودة.
 */

export const DAILY_QUESTION_KEYS = [
  'won', // ما أهم ما أنجزته؟
  'missed', // ما الذي لم أنجزه؟ ولماذا؟
  'timeSink', // ما أكثر شيء استهلك وقتي؟
  'learned', // ما الذي تعلمته؟
  'tomorrow', // ما أهم مهمة للغد؟
] as const;

export const WEEKLY_QUESTION_KEYS = [
  'highlights',
  'goalsProgress',
  'obstacles',
  'habits',
  'nextWeek',
  'adjust',
] as const;

export function periodKeyFor(type: 'daily' | 'weekly', date: string): string {
  return type === 'daily' ? date : isoWeekKey(date);
}

export function buildReviewStats(
  data: DataCollections,
  type: 'daily' | 'weekly',
  date: string,
  weekStartsOn: 0 | 1 | 6 = 1,
): ReviewStats {
  const dates = type === 'daily' ? [date] : weekRange(date, weekStartsOn).filter((d) => d <= date);
  const start = dates[0];
  const end = dates[dates.length - 1];

  const planned = data.tasks.filter((t) => !t.archived && t.dueDate && t.dueDate >= start && t.dueDate <= end);
  const completedInPeriod = data.tasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end,
  );

  const focusMinutes = data.timeLogs
    .filter((l) => l.date >= start && l.date <= end && l.kind !== 'break')
    .reduce((s, l) => s + l.minutes, 0);

  const activeHabits = data.habits.filter((h) => !h.archived && h.startDate <= end);
  let habitMet = 0;
  let habitExpected = 0;
  for (const habit of activeHabits) {
    for (const d of dates) {
      if (d < habit.startDate) continue;
      habitExpected += 1;
      if (data.habitLogs.some((l) => l.habitId === habit.id && l.date === d)) habitMet += 1;
    }
  }

  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const goalsProgress = activeGoals.length
    ? Math.round(activeGoals.reduce((s, g) => s + goalProgress(g, data.tasks), 0) / activeGoals.length)
    : 0;

  const money = monthTotals(data.transactions, start.slice(0, 7));

  return {
    tasksCompleted: completedInPeriod.length,
    tasksPlanned: planned.length,
    focusMinutes,
    habitAdherence: pct(habitMet, habitExpected),
    goalsProgress,
    income: money.income,
    expenses: money.expenses,
  };
}

/** أبرز الإنجازات: مهام أُكملت في الفترة + أهداف تجاوزت 100% أو اكتملت */
export function highlightsFor(data: DataCollections, start: string, end: string, goals: Goal[]): string[] {
  const out: string[] = [];
  const completed = data.tasks.filter(
    (t) => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end,
  );
  if (completed.length) out.push(`tasksCompleted:${completed.length}`);
  for (const g of goals) {
    if (g.achievedAt && g.achievedAt.slice(0, 10) >= start && g.achievedAt.slice(0, 10) <= end) out.push(`goalAchieved:${g.id}`);
  }
  const habits = data.habits.filter((h) => !h.archived);
  for (const h of habits) {
    const logged = data.habitLogs.filter((l) => l.habitId === h.id && l.date >= start && l.date <= end).length;
    const expected = weekRange(start).filter((d) => d >= start && d <= end && d >= h.startDate).length;
    if (expected > 0 && logged === expected) out.push(`habitPerfect:${h.id}`);
  }
  return out;
}

/** العقبات المتكررة — مشتقة من البيانات: تأخير، إعادة جدولة، مشاريع في خطر */
export function recurringObstacles(data: DataCollections, today: string): { key: string; value: number }[] {
  const out: { key: string; value: number }[] = [];
  const overdue = data.tasks.filter((t) => isTaskOverdue(t, today)).length;
  if (overdue) out.push({ key: 'overdueTasks', value: overdue });
  const rescheduled = data.tasks.filter((t) => t.rescheduledAt).length;
  if (rescheduled) out.push({ key: 'rescheduledTasks', value: rescheduled });
  const noEstimate = data.tasks.filter((t) => !t.archived && t.status !== 'done' && !t.estimatedMinutes).length;
  if (noEstimate) out.push({ key: 'noEstimateTasks', value: noEstimate });
  const stalledProjects = data.projects.filter((p) => p.status === 'paused').length;
  if (stalledProjects) out.push({ key: 'pausedProjects', value: stalledProjects });
  const unplanned = data.tasks.filter((t) => !t.archived && t.status !== 'done' && !t.dueDate).length;
  if (unplanned) out.push({ key: 'unscheduledTasks', value: unplanned });
  return out.sort((a, b) => b.value - a.value);
}

export interface PrioritySuggestion {
  taskId: string;
  reason: 'overdue' | 'highPriority' | 'dueSoon' | 'top3Repeat';
}

/** اقتراح أولويات الأسبوع القادم — من المهام المتأخرة والعالية الأولوية فعليًا */
export function suggestNextWeekPriorities(data: DataCollections, today: string, limit = 5): PrioritySuggestion[] {
  const pool = data.tasks.filter((t) => !t.archived && t.status !== 'done');
  const sorted = sortByUrgency(pool, today);
  const out: PrioritySuggestion[] = [];
  for (const t of sorted) {
    if (out.length >= limit) break;
    if (isTaskOverdue(t, today)) out.push({ taskId: t.id, reason: 'overdue' });
    else if (t.priority === 'urgent' || t.priority === 'high') out.push({ taskId: t.id, reason: 'highPriority' });
    else if (t.dueDate && diffDays(t.dueDate, today) <= 7) out.push({ taskId: t.id, reason: 'dueSoon' });
  }
  return out;
}

/** ملخص أسبوعي جاهز للعرض (يُستخدم أيضًا لتغذية المساعد الذكي) */
export interface WeeklySummary {
  periodKey: string;
  start: string;
  end: string;
  stats: ReviewStats;
  completedTasks: string[];
  plannedNotDone: string[];
  timePerDay: { date: string; minutes: number }[];
  obstacles: { key: string; value: number }[];
  suggestions: PrioritySuggestion[];
}

export function buildWeeklySummary(data: DataCollections, today: string, weekStartsOn: 0 | 1 | 6 = 1): WeeklySummary {
  const periodKey = isoWeekKey(today);
  const start = startOfISOWeek(periodKey);
  const end = addDays(start, 6);
  const weekDays = weekRange(today, weekStartsOn);
  return {
    periodKey,
    start,
    end,
    stats: buildReviewStats(data, 'weekly', today, weekStartsOn),
    completedTasks: data.tasks
      .filter((t) => t.status === 'done' && t.completedAt && t.completedAt.slice(0, 10) >= start && t.completedAt.slice(0, 10) <= end)
      .map((t) => t.title),
    plannedNotDone: data.tasks
      .filter((t) => !t.archived && t.status !== 'done' && t.dueDate && t.dueDate >= start && t.dueDate <= end)
      .map((t) => t.title),
    timePerDay: timePerDay(data.timeLogs, weekDays),
    obstacles: recurringObstacles(data, today),
    suggestions: suggestNextWeekPriorities(data, today),
  };
}

/** نسبة الالتزام اليومية للعادات داخل ملخص المراجعة */
export function adherenceForDay(data: DataCollections, date: string): number {
  const habits = data.habits.filter((h) => !h.archived && h.startDate <= date);
  if (!habits.length) return 0;
  const met = habits.filter((h) => data.habitLogs.some((l) => l.habitId === h.id && l.date === date)).length;
  return pct(met, habits.length);
}

export function tasksByTitle(tasks: Task[]): Map<string, Task> {
  return new Map(tasks.map((t) => [t.title, t]));
}

export function habitsOverviewForDay(data: DataCollections, today: string, weekStartsOn: 0 | 1 | 6 = 1) {
  return habitsOverview(data.habits, data.habitLogs, today, weekStartsOn);
}
