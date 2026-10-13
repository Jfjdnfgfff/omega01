import type { DataCollections, Goal, Project, Settings, Task } from '@/types';
import { addDays, monthKey, pct, todayISO, weekRange } from '@/lib/date';
import { goalIsOverdue, goalProgress, sortGoals } from '@/lib/domain/goals';
import { habitsOverview } from '@/lib/domain/habits';
import { projectCapacityRisk, projectProgress } from '@/lib/domain/projects';
import { taskStats, topThreeForDay } from '@/lib/domain/tasks';
import { dayLoad, timeBreakdown, weeklyPlannedMinutes } from '@/lib/domain/time';
import { budgetState, monthTotals, savingsProgress } from '@/lib/domain/finance';
import { isScheduleUnrealistic } from '@/lib/domain/time';

export interface ProjectCard {
  project: Project;
  done: number;
  total: number;
  percent: number;
  atRisk: boolean;
}

export interface GoalCard {
  goal: Goal;
  progress: number;
  overdue: boolean;
}

export interface AlertItem {
  id: string;
  kind: 'overdueTasks' | 'overdueGoals' | 'overloadedDay' | 'projectAtRisk' | 'budget' | 'habitsSlipping' | 'noTop3';
  severity: 'info' | 'warning' | 'danger';
  value: number;
}

export interface DashboardModel {
  today: string;
  top3: Task[];
  tasks: ReturnType<typeof taskStats>;
  goals: {
    active: number;
    averageProgress: number;
    overdue: number;
    dueSoon: GoalCard[];
    list: GoalCard[];
  };
  habits: ReturnType<typeof habitsOverview>;
  projects: ProjectCard[];
  time: {
    todayMinutes: number;
    weekMinutes: number;
    plannedToday: number;
    breakdown: ReturnType<typeof timeBreakdown>;
    load: ReturnType<typeof dayLoad>;
  };
  finance: {
    income: number;
    expenses: number;
    net: number;
    budget: ReturnType<typeof budgetState>;
    savings: { percent: number; remaining: number }[];
  } | null;
  alerts: AlertItem[];
  reviewDoneToday: boolean;
  empty: boolean;
}

export function buildDashboard(data: DataCollections, settings: Settings, today: string = todayISO()): DashboardModel {
  const weekStartsOn = settings.weekStartsOn;
  const tasks = taskStats(data.tasks, today);
  const top3 = topThreeForDay(data.tasks, today);

  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const goalCards: GoalCard[] = sortGoals(activeGoals, data.tasks, today).map((g) => ({
    goal: g,
    progress: goalProgress(g, data.tasks),
    overdue: goalIsOverdue(g, today),
  }));
  const averageProgress = goalCards.length
    ? Math.round(goalCards.reduce((s, g) => s + g.progress, 0) / goalCards.length)
    : 0;

  const habits = habitsOverview(data.habits, data.habitLogs, today, weekStartsOn);

  const projects: ProjectCard[] = data.projects
    .filter((p) => p.status === 'active' || p.status === 'planning')
    .map((p) => {
      const prog = projectProgress(p.id, data.tasks);
      const risk = projectCapacityRisk(p, data.tasks, today, settings.dailyFocusTargetMinutes || 240);
      return { project: p, ...prog, atRisk: risk.atRisk };
    })
    .sort((a, b) => Number(b.atRisk) - Number(a.atRisk) || b.percent - a.percent);

  const todayLogs = data.timeLogs.filter((l) => l.date === today && l.kind !== 'break');
  const todayMinutes = todayLogs.reduce((s, l) => s + l.minutes, 0);
  const weekDays = weekRange(today, weekStartsOn);
  const weekMinutes = data.timeLogs
    .filter((l) => weekDays.includes(l.date) && l.kind !== 'break')
    .reduce((s, l) => s + l.minutes, 0);

  const blocksToday = data.timeBlocks.filter((b) => b.date === today);
  const load = dayLoad(blocksToday, settings.dailyFocusTargetMinutes || 480);
  const breakdown = timeBreakdown(data.timeLogs, addDays(today, -6), today, data.projects, data.tasks, 'project');

  const month = monthKey(today);
  const now = new Date(`${today}T00:00:00`);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const finance = settings.privacy.showFinanceOnDashboard
    ? {
        ...monthTotals(data.transactions, month),
        budget: budgetState(data.transactions, month, settings.monthlyBudget, Number(today.slice(8, 10)), daysInMonth),
        savings: data.savingsGoals.map(savingsProgress),
      }
    : null;

  const alerts: AlertItem[] = [];
  if (tasks.overdue > 0) alerts.push({ id: 'overdueTasks', kind: 'overdueTasks', severity: 'danger', value: tasks.overdue });
  const overdueGoals = goalCards.filter((g) => g.overdue).length;
  if (overdueGoals > 0) alerts.push({ id: 'overdueGoals', kind: 'overdueGoals', severity: 'danger', value: overdueGoals });
  const unrealistic = isScheduleUnrealistic(blocksToday, { maxWorkMinutes: (settings.dailyFocusTargetMinutes || 480) + 120 });
  if (unrealistic.overloaded)
    alerts.push({ id: 'overloadedDay', kind: 'overloadedDay', severity: 'warning', value: load.workMinutes });
  const atRisk = projects.filter((p) => p.atRisk).length;
  if (atRisk > 0) alerts.push({ id: 'projectAtRisk', kind: 'projectAtRisk', severity: 'warning', value: atRisk });
  if (finance && finance.budget.budget > 0 && finance.budget.overBudget) {
    alerts.push({ id: 'budget', kind: 'budget', severity: 'warning', value: finance.budget.usedPercent });
  }
  if (habits.needsAttention > 0)
    alerts.push({ id: 'habitsSlipping', kind: 'habitsSlipping', severity: 'warning', value: habits.needsAttention });
  if (top3.length === 0 && tasks.remaining > 0)
    alerts.push({ id: 'noTop3', kind: 'noTop3', severity: 'info', value: tasks.remaining });

  const reviewDoneToday = data.reviews.some((r) => r.type === 'daily' && r.periodKey === today);

  const empty =
    data.goals.length === 0 &&
    data.tasks.length === 0 &&
    data.habits.length === 0 &&
    data.projects.length === 0;

  return {
    today,
    top3,
    tasks,
    goals: {
      active: activeGoals.length,
      averageProgress,
      overdue: overdueGoals,
      dueSoon: goalCards.filter((g) => g.goal.deadline && g.goal.deadline >= today && g.goal.deadline <= addDays(today, 7)),
      list: goalCards.slice(0, 5),
    },
    habits,
    projects,
    time: {
      todayMinutes,
      weekMinutes,
      plannedToday: load.workMinutes,
      breakdown,
      load,
    },
    finance,
    alerts,
    reviewDoneToday,
    empty,
  };
}

export function completionRate(tasks: Task[]): number {
  const live = tasks.filter((t) => !t.archived);
  return pct(live.filter((t) => t.status === 'done').length, live.length);
}

export function weeklyPlannedVsActual(data: DataCollections, today: string, weekStartsOn: 0 | 1 | 6 = 1) {
  const planned = weeklyPlannedMinutes(data.timeBlocks, today, weekStartsOn);
  const weekDays = weekRange(today, weekStartsOn);
  const actual = data.timeLogs.filter((l) => weekDays.includes(l.date) && l.kind !== 'break').reduce((s, l) => s + l.minutes, 0);
  return { planned, actual, percent: pct(actual, planned) };
}
