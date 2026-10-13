import type { Habit, HabitLog } from '@/types';
import { addDays, diffDays, pct, startOfWeek, todayISO, weekRange } from '@/lib/date';

/**
 * منطق العادات — الالتزام يُحسب من سجلات الإنجاز الفعلية فقط.
 * مفتاح السجل حتمي (`habitId::date`) فلا يمكن تسجيل نفس اليوم مرتين.
 */

export function habitLogKey(habitId: string, date: string): string {
  return `${habitId}::${date}`;
}

export function isHabitLoggedOn(logs: HabitLog[], habitId: string, date: string): boolean {
  return logs.some((l) => l.habitId === habitId && l.date === date);
}

export function habitLogCountOn(logs: HabitLog[], habitId: string, date: string): number {
  const log = logs.find((l) => l.habitId === habitId && l.date === date);
  return log ? log.count : 0;
}

/** هل تحققت العادة في هذا اليوم؟ (عدد الإنجازات >= المطلوب) */
export function habitMetOn(logs: HabitLog[], habit: Habit, date: string): boolean {
  return habitLogCountOn(logs, habit.id, date) >= habit.repsPerDay;
}

/** أيام الأسبوع التي يُتوقع فيها تنفيذ العادة */
export function expectedDatesInRange(habit: Habit, dates: string[]): string[] {
  const start = habit.startDate;
  return dates.filter((d) => d >= start);
}

export interface HabitStreaks {
  current: number;
  best: number;
}

/**
 * السلسلة الحالية: عدد الأيام المتتالية المنتهية باليوم (أو أمس إذا لم يُسجّل اليوم بعد).
 * الأيام السابقة لبداية العادة لا تُحسب.
 */
export function habitStreaks(habit: Habit, logs: HabitLog[], today: string, lookback = 400): HabitStreaks {
  const logSet = new Set(logs.filter((l) => l.habitId === habit.id).map((l) => l.date));
  const met = (date: string) => logSet.has(date);

  // السلسلة الحالية
  let current = 0;
  let cursor = today;
  if (!met(cursor)) {
    // لم يُسجّل اليوم بعد: لا تكسر السلسلة قبل انتهاء اليوم
    cursor = addDays(today, -1);
  }
  while (met(cursor) && cursor >= habit.startDate && current < lookback) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  // أفضل سلسلة
  let best = 0;
  let run = 0;
  const first = habit.startDate > addDays(today, -lookback) ? habit.startDate : addDays(today, -lookback);
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (met(d)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  return { current, best: Math.max(best, current) };
}

export interface HabitWeekSummary {
  met: number;
  expected: number;
  percent: number;
}

export function habitWeekSummary(
  habit: Habit,
  logs: HabitLog[],
  today: string,
  weekStartsOn: 0 | 1 | 6 = 1,
  weekOffset = 0,
): HabitWeekSummary {
  const anchor = addDays(today, weekOffset * 7);
  const week = weekRange(anchor, weekStartsOn);
  const elapsedDays = diffDays(anchor, week[0]) + 1; // الأيام المنقضية فعليًا داخل الأسبوع
  const expected = expectedDatesInRange(habit, week.slice(0, elapsedDays));
  const met = expected.filter((d) => habitMetOn(logs, habit, d)).length;
  return { met, expected: expected.length, percent: pct(met, expected.length) };
}

export function habitMonthSummary(habit: Habit, logs: HabitLog[], month: string, today = todayISO()): HabitWeekSummary {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= last; d += 1) dates.push(`${y}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`);
  // لا يُحسب إلا ما مضى فعلًا: عند عرض شهر ماضٍ يُحسب الشهر كاملًا.
  const cutoff = today.startsWith(month) ? today : `${month}-31`;
  const expected = expectedDatesInRange(habit, dates.filter((d) => d <= cutoff));
  const met = expected.filter((d) => habitMetOn(logs, habit, d)).length;
  return { met, expected: expected.length, percent: pct(met, expected.length) };
}

/**
 * هل التزمت العادة بالهدف الأسبوعي/اليومي خلال الأسبوع الجاري؟
 * يُستخدم لتحديد "العادات التي تحتاج إلى اهتمام".
 */
export function habitNeedsAttention(
  habit: Habit,
  logs: HabitLog[],
  today: string,
  weekStartsOn: 0 | 1 | 6 = 1,
): boolean {
  const week = habitWeekSummary(habit, logs, today, weekStartsOn);
  if (week.expected === 0) return false;
  const required = habit.cadence === 'daily' ? week.expected : Math.min(habit.targetCount, week.expected);
  return week.met < required;
}

export function habitsOverview(
  habits: Habit[],
  logs: HabitLog[],
  today: string,
  weekStartsOn: 0 | 1 | 6 = 1,
): {
  total: number;
  doneToday: number;
  percentToday: number;
  currentStreak: number;
  needsAttention: number;
} {
  const active = habits.filter((h) => !h.archived);
  const expectedToday = active.filter((h) => h.startDate <= today);
  const doneToday = expectedToday.filter((h) => habitMetOn(logs, h, today)).length;
  const streaks = active.map((h) => habitStreaks(h, logs, today).current);
  return {
    total: active.length,
    doneToday,
    percentToday: pct(doneToday, expectedToday.length),
    currentStreak: streaks.length ? Math.max(...streaks) : 0,
    needsAttention: active.filter((h) => habitNeedsAttention(h, logs, today, weekStartsOn)).length,
  };
}

/** خريطة الالتزام لتقويم الشهر */
export function habitCalendar(
  habit: Habit,
  logs: HabitLog[],
  month: string,
  today = todayISO(),
): { date: string; met: boolean; count: number; future: boolean }[] {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const todayStr = today;
  const out: { date: string; met: boolean; count: number; future: boolean }[] = [];
  for (let d = 1; d <= last; d += 1) {
    const date = `${y}-${`${m}`.padStart(2, '0')}-${`${d}`.padStart(2, '0')}`;
    out.push({
      date,
      met: habitMetOn(logs, habit, date),
      count: habitLogCountOn(logs, habit.id, date),
      future: date > todayStr,
    });
  }
  return out;
}

export function weekOfLogs(logs: HabitLog[], today: string, weekStartsOn: 0 | 1 | 6 = 1): number {
  const start = startOfWeek(today, weekStartsOn);
  return logs.filter((l) => l.date >= start && l.date <= today).length;
}
