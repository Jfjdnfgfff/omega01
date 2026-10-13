import type { DataCollections, Settings, Task } from '@/types';
import { addDays, minutesToHuman, todayISO } from '@/lib/date';
import { goalIsOverdue, goalProgress } from '@/lib/domain/goals';
import { habitNeedsAttention, habitStreaks } from '@/lib/domain/habits';
import { projectCapacityRisk } from '@/lib/domain/projects';
import { sortByUrgency, taskStats } from '@/lib/domain/tasks';
import { findFreeSlot, isScheduleUnrealistic, dayLoad, durationMinutes } from '@/lib/domain/time';
import { budgetState, monthTotals } from '@/lib/domain/finance';
import { monthKey } from '@/lib/date';

/**
 * المساعد الذكي (AI Coach)
 * ------------------------
 * محرّكان واضحان ومتميزان:
 *  1) `rules`  — محرّك قواعد محلي: يحسب اقتراحات من بيانات المستخدم الحقيقية.
 *                ليس ذكاءً اصطناعيًا، ويُميَّز كذلك في الواجهة.
 *  2) `ai`     — نداء حقيقي لمزوّد متوافق مع واجهة OpenAI، يُفعَّل فقط عندما
 *                يضبط المستخدم مفتاحه بنفسه. لا توجد ردود ثابتة مُدّعى أنها AI.
 */

export type InsightKind = 'risk' | 'focus' | 'opportunity' | 'plan';

export interface CoachInsight {
  id: string;
  kind: InsightKind;
  titleKey: string;
  detailKey: string;
  params: Record<string, string | number>;
}

export function generateInsights(
  data: DataCollections,
  settings: Settings,
  today: string = todayISO(),
): CoachInsight[] {
  const out: CoachInsight[] = [];
  const stats = taskStats(data.tasks, today);

  if (stats.overdue > 0) {
    out.push({
      id: 'overdue',
      kind: 'risk',
      titleKey: 'coach.insights.overdue.title',
      detailKey: 'coach.insights.overdue.detail',
      params: { count: stats.overdue },
    });
  }

  const overloaded = isScheduleUnrealistic(data.timeBlocks.filter((b) => b.date === today), {
    maxWorkMinutes: (settings.dailyFocusTargetMinutes || 480) + 120,
  });
  if (overloaded.overloaded) {
    out.push({
      id: 'schedule',
      kind: 'risk',
      titleKey: 'coach.insights.schedule.title',
      detailKey: 'coach.insights.schedule.detail',
      params: { reasons: overloaded.reasons.length },
    });
  } else if (data.timeBlocks.filter((b) => b.date === today).length === 0 && stats.remaining > 0) {
    out.push({
      id: 'planEmpty',
      kind: 'plan',
      titleKey: 'coach.insights.planEmpty.title',
      detailKey: 'coach.insights.planEmpty.detail',
      params: { remaining: stats.remaining },
    });
  }

  const overdueGoals = data.goals.filter((g) => goalIsOverdue(g, today));
  if (overdueGoals.length) {
    out.push({
      id: 'goals',
      kind: 'risk',
      titleKey: 'coach.insights.goals.title',
      detailKey: 'coach.insights.goals.detail',
      params: { count: overdueGoals.length, title: overdueGoals[0].title },
    });
  }

  const slipping = data.habits.filter((h) => !h.archived && habitNeedsAttention(h, data.habitLogs, today, settings.weekStartsOn));
  if (slipping.length) {
    out.push({
      id: 'habits',
      kind: 'focus',
      titleKey: 'coach.insights.habits.title',
      detailKey: 'coach.insights.habits.detail',
      params: { count: slipping.length, name: slipping[0].name },
    });
  }

  const bestStreak = data.habits
    .filter((h) => !h.archived)
    .map((h) => habitStreaks(h, data.habitLogs, today))
    .sort((a, b) => b.current - a.current)[0];
  if (bestStreak && bestStreak.current >= 3) {
    out.push({
      id: 'streak',
      kind: 'opportunity',
      titleKey: 'coach.insights.streak.title',
      detailKey: 'coach.insights.streak.detail',
      params: { days: bestStreak.current },
    });
  }

  const atRisk = data.projects.filter((p) => projectCapacityRisk(p, data.tasks, today, settings.dailyFocusTargetMinutes || 240).atRisk);
  if (atRisk.length) {
    out.push({
      id: 'projects',
      kind: 'risk',
      titleKey: 'coach.insights.projects.title',
      detailKey: 'coach.insights.projects.detail',
      params: { count: atRisk.length, name: atRisk[0].name },
    });
  }

  const nearGoals = data.goals
    .filter((g) => g.status === 'active')
    .map((g) => ({ g, p: goalProgress(g, data.tasks) }))
    .filter((x) => x.p >= 70 && x.p < 100)
    .sort((a, b) => b.p - a.p);
  if (nearGoals.length) {
    out.push({
      id: 'nearGoal',
      kind: 'opportunity',
      titleKey: 'coach.insights.nearGoal.title',
      detailKey: 'coach.insights.nearGoal.detail',
      params: { title: nearGoals[0].g.title, percent: nearGoals[0].p },
    });
  }

  if (settings.privacy.showFinanceOnDashboard && settings.monthlyBudget > 0) {
    const month = monthKey(today);
    const now = new Date(`${today}T00:00:00`);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const budget = budgetState(data.transactions, month, settings.monthlyBudget, Number(today.slice(8, 10)), daysInMonth);
    if (budget.budget > 0 && budget.projected > budget.budget * 1.1) {
      out.push({
        id: 'budget',
        kind: 'risk',
        titleKey: 'coach.insights.budget.title',
        detailKey: 'coach.insights.budget.detail',
        params: { percent: budget.usedPercent },
      });
    }
  }

  if (stats.remaining > 0 && out.length === 0) {
    out.push({
      id: 'steady',
      kind: 'opportunity',
      titleKey: 'coach.insights.steady.title',
      detailKey: 'coach.insights.steady.detail',
      params: { remaining: stats.remaining },
    });
  }

  return out;
}

export interface PlanStep {
  taskId: string;
  title: string;
  start: string;
  end: string;
  minutes: number;
  reason: 'overdue' | 'priority' | 'dueSoon';
}

export interface DailyPlan {
  date: string;
  steps: PlanStep[];
  breaks: { start: string; end: string }[];
  totalMinutes: number;
  deferred: number;
  warnings: string[];
}

/**
 * بناء خطة يومية من المواعيد والوقت المتاح فعليًا.
 * تحترم سعة اليوم وتُدخل فترات راحة — لا تنتج جدولًا مزدحمًا.
 */
export function buildDailyPlan(
  data: DataCollections,
  settings: Settings,
  date: string = todayISO(),
  opts: { dayStart?: string; dayEnd?: string; maxWorkMinutes?: number } = {},
): DailyPlan {
  const dayStart = opts.dayStart ?? '08:00';
  const dayEnd = opts.dayEnd ?? '20:00';
  const maxWork = opts.maxWorkMinutes ?? settings.dailyFocusTargetMinutes ?? 480;

  const existing = data.timeBlocks.filter((b) => b.date === date);
  const usedMinutes = existing.filter((b) => b.kind !== 'break').reduce((s, b) => s + durationMinutes(b), 0);
  const budgetMinutes = Math.max(0, maxWork - usedMinutes);

  const scheduledIds = new Set(existing.map((b) => b.taskId).filter(Boolean) as string[]);
  const pool = sortByUrgency(
    data.tasks.filter((t) => !t.archived && t.status !== 'done' && !scheduledIds.has(t.id)),
    date,
  );

  const steps: PlanStep[] = [];
  const breaks: { start: string; end: string }[] = [];
  const warnings: string[] = [];
  let remainingBudget = budgetMinutes;
  let sinceBreak = 0;
  let deferred = 0;
  const taken = new Set<string>();

  for (const task of pool) {
    if (remainingBudget <= 0) {
      deferred += 1;
      continue;
    }
    const duration = Math.min(task.estimatedMinutes ?? 45, 120, remainingBudget);
    if (duration < 15) {
      deferred += 1;
      continue;
    }
    const slot = findFreeSlotIn([...existing, ...syntheticBlocks(steps, date)], duration, dayStart, dayEnd, taken);
    if (!slot) {
      deferred += 1;
      continue;
    }
    steps.push({
      taskId: task.id,
      title: task.title,
      start: slot.start,
      end: slot.end,
      minutes: duration,
      reason: task.dueDate && task.dueDate < date ? 'overdue' : task.priority === 'urgent' || task.priority === 'high' ? 'priority' : 'dueSoon',
    });
    taken.add(`${slot.start}-${slot.end}`);
    remainingBudget -= duration;
    sinceBreak += duration;
    if (sinceBreak >= 100) {
      const breakSlot = findFreeSlotIn([...existing, ...syntheticBlocks(steps, date)], 10, slot.end, dayEnd, taken);
      if (breakSlot) {
        breaks.push(breakSlot);
        taken.add(`${breakSlot.start}-${breakSlot.end}`);
      }
      sinceBreak = 0;
    }
  }

  if (deferred > 0) warnings.push('deferred');
  if (steps.length === 0 && pool.length > 0) warnings.push('noCapacity');
  if (usedMinutes + steps.reduce((s, x) => s + x.minutes, 0) > maxWork) warnings.push('overCapacity');

  return {
    date,
    steps,
    breaks,
    totalMinutes: steps.reduce((s, x) => s + x.minutes, 0),
    deferred,
    warnings,
  };
}

function syntheticBlocks(steps: PlanStep[], date: string) {
  return steps.map((s) => ({
    id: `tmp_${s.taskId}`,
    title: s.title,
    date,
    start: s.start,
    end: s.end,
    kind: 'work' as const,
    taskId: s.taskId,
    projectId: null,
    notes: '',
    createdAt: '',
    updatedAt: '',
  }));
}

function findFreeSlotIn(
  blocks: { start: string; end: string }[],
  minutes: number,
  dayStart: string,
  dayEnd: string,
  taken: Set<string>,
) {
  const slot = findFreeSlot(blocks as never, minutes, dayStart, dayEnd);
  if (!slot) return null;
  if (taken.has(`${slot.start}-${slot.end}`)) return null;
  return slot;
}

/** ملخص واقعي لبيانات المستخدم — يُرسل للمزوّد فقط عند تفعيل التكامل. */
export function buildDataContext(data: DataCollections, settings: Settings, lang: 'ar' | 'en', today: string = todayISO()): string {
  const stats = taskStats(data.tasks, today);
  const activeGoals = data.goals.filter((g) => g.status === 'active');
  const top = sortByUrgency(
    data.tasks.filter((t) => !t.archived && t.status !== 'done'),
    today,
  ).slice(0, 10);
  const habits = data.habits.filter((h) => !h.archived);
  const month = monthTotals(data.transactions, monthKey(today));
  const load = dayLoad(data.timeBlocks.filter((b) => b.date === today));

  const lines: string[] = [];
  lines.push(lang === 'ar' ? `التاريخ: ${today}` : `Date: ${today}`);
  lines.push(
    lang === 'ar'
      ? `المهام: ${stats.total} إجمالًا، ${stats.completed} مكتملة، ${stats.remaining} متبقية، ${stats.overdue} متأخرة.`
      : `Tasks: ${stats.total} total, ${stats.completed} done, ${stats.remaining} open, ${stats.overdue} overdue.`,
  );
  lines.push(
    lang === 'ar'
      ? `أول المهام المفتوحة: ${top.map((t) => `${t.title} (${t.priority}${t.dueDate ? `, ${t.dueDate}` : ''})`).join(' | ') || '—'}`
      : `Top open tasks: ${top.map((t) => `${t.title} (${t.priority}${t.dueDate ? `, ${t.dueDate}` : ''})`).join(' | ') || '—'}`,
  );
  lines.push(
    lang === 'ar'
      ? `الأهداف النشطة: ${activeGoals.map((g) => `${g.title} ${goalProgress(g, data.tasks)}%`).join(' | ') || '—'}`
      : `Active goals: ${activeGoals.map((g) => `${g.title} ${goalProgress(g, data.tasks)}%`).join(' | ') || '—'}`,
  );
  lines.push(
    lang === 'ar'
      ? `العادات: ${habits.map((h) => `${h.name} (سلسلة ${habitStreaks(h, data.habitLogs, today).current})`).join(' | ') || '—'}`
      : `Habits: ${habits.map((h) => `${h.name} (streak ${habitStreaks(h, data.habitLogs, today).current})`).join(' | ') || '—'}`,
  );
  lines.push(
    lang === 'ar'
      ? `جدول اليوم: ${load.workMinutes} دقيقة مخططة، ${load.conflicts} تعارض.`
      : `Today's plan: ${load.workMinutes} min planned, ${load.conflicts} conflicts.`,
  );
  lines.push(
    lang === 'ar'
      ? `الوقت المسجّل اليوم: ${minutesToHuman(data.timeLogs.filter((l) => l.date === today && l.kind !== 'break').reduce((s, l) => s + l.minutes, 0), lang)}`
      : `Logged time today: ${minutesToHuman(data.timeLogs.filter((l) => l.date === today && l.kind !== 'break').reduce((s, l) => s + l.minutes, 0), lang)}`,
  );
  if (settings.privacy.showFinanceOnDashboard) {
    lines.push(
      lang === 'ar'
        ? `الشهر الجاري: دخل ${month.income}، مصروف ${month.expenses}، صافي ${month.net} (${settings.currency}).`
        : `This month: income ${month.income}, expenses ${month.expenses}, net ${month.net} (${settings.currency}).`,
    );
  }
  return lines.join('\n');
}

export interface CoachRequestOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  signal?: AbortSignal;
}

export interface CoachResponse {
  ok: boolean;
  content: string;
  errorKey?: string;
}

/** نداء حقيقي لمزوّد متوافق مع OpenAI. لا يُستخدم إلا بمفتاح يضعه المستخدم بنفسه. */
export async function callLanguageModel(opts: CoachRequestOptions): Promise<CoachResponse> {
  const base = (opts.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model || 'gpt-4o-mini',
        temperature: 0.4,
        messages: [{ role: 'system', content: opts.systemPrompt }, ...opts.messages],
      }),
      signal: opts.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, content: '', errorKey: `coach.errors.http:${res.status}${detail ? `:${detail.slice(0, 120)}` : ''}` };
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return { ok: false, content: '', errorKey: 'coach.errors.empty' };
    return { ok: true, content };
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return { ok: false, content: '', errorKey: 'coach.errors.aborted' };
    return { ok: false, content: '', errorKey: 'coach.errors.network' };
  }
}

export function coachSystemPrompt(lang: 'ar' | 'en', dataContext: string, today: string): string {
  return lang === 'ar'
    ? [
        'أنت مساعد شخصي داخل تطبيق LifeOS لإدارة الحياة.',
        `تاريخ اليوم: ${today}.`,
        'اعتمد فقط على بيانات المستخدم المرفقة. لا تخترع أرقامًا أو وقائع.',
        'افصل بوضوح بين ما هو معلومة من البيانات وما هو اقتراح منك.',
        'كن مختصرًا وعمليًا: خطوات قابلة للتنفيذ اليوم، مع تحديد الأولويات والوقت.',
        'إن كانت البيانات ناقصة، قل ذلك واطلب ما ينقص.',
        '',
        'بيانات المستخدم:',
        dataContext,
      ].join('\n')
    : [
        'You are a personal assistant inside LifeOS, a life management app.',
        `Today's date: ${today}.`,
        'Rely only on the attached user data. Never invent numbers or facts.',
        'Clearly separate facts taken from the data from your own suggestions.',
        'Be concise and practical: actionable steps for today with priorities and time estimates.',
        'If data is missing, say so and ask for what is needed.',
        '',
        'User data:',
        dataContext,
      ].join('\n');
}

/** اقتراح ترتيب المهام حسب الأولوية والوقت المتاح */
export function suggestTaskOrder(tasks: Task[], availableMinutes: number, today: string): { task: Task; minutes: number }[] {
  const ordered = sortByUrgency(tasks, today);
  const out: { task: Task; minutes: number }[] = [];
  let left = availableMinutes;
  for (const task of ordered) {
    const minutes = Math.min(task.estimatedMinutes ?? 45, left);
    if (minutes <= 0) break;
    out.push({ task, minutes });
    left -= minutes;
  }
  return out;
}

export function tomorrowISO(today: string = todayISO()): string {
  return addDays(today, 1);
}
