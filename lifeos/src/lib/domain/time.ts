import type { Project, Task, TimeBlock, TimeLog } from '@/types';
import { minutesToTime, pct, timeToMinutes, weekRange } from '@/lib/date';

/**
 * منطق إدارة الوقت — جدولة، تعارضات، حمل يومي، وتجميع الوقت المستثمَر.
 */

export interface BlockConflict {
  a: TimeBlock;
  b: TimeBlock;
  overlapMinutes: number;
}

export function blocksForDate(blocks: TimeBlock[], date: string): TimeBlock[] {
  return blocks.filter((b) => b.date === date).sort((a, b) => a.start.localeCompare(b.start));
}

function overlapMinutes(a: TimeBlock, b: TimeBlock): number {
  const start = Math.max(timeToMinutes(a.start), timeToMinutes(b.start));
  const end = Math.min(timeToMinutes(a.end), timeToMinutes(b.end));
  return Math.max(0, end - start);
}

export function findConflicts(blocks: TimeBlock[]): BlockConflict[] {
  const sorted = [...blocks].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const out: BlockConflict[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const m = overlapMinutes(sorted[i], sorted[j]);
      if (m > 0) out.push({ a: sorted[i], b: sorted[j], overlapMinutes: m });
    }
  }
  return out;
}

export interface DayLoad {
  plannedMinutes: number;
  workMinutes: number;
  breakMinutes: number;
  conflicts: number;
  /** حمل اليوم مقابل السعة الواقعية */
  loadPercent: number;
  overloaded: boolean;
  firstStart: string | null;
  lastEnd: string | null;
}

export function dayLoad(blocks: TimeBlock[], dailyCapacityMinutes = 480): DayLoad {
  const workMinutes = blocks.filter((b) => b.kind !== 'break').reduce((s, b) => s + durationMinutes(b), 0);
  const breakMinutes = blocks.filter((b) => b.kind === 'break').reduce((s, b) => s + durationMinutes(b), 0);
  const conflicts = findConflicts(blocks).length;
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return {
    plannedMinutes: workMinutes + breakMinutes,
    workMinutes,
    breakMinutes,
    conflicts,
    loadPercent: pct(workMinutes, dailyCapacityMinutes),
    overloaded: workMinutes > dailyCapacityMinutes || conflicts > 0,
    firstStart: sorted[0]?.start ?? null,
    lastEnd: sorted.length ? sorted.reduce((max, b) => (b.end > max ? b.end : max), sorted[0].end) : null,
  };
}

export function durationMinutes(block: TimeBlock): number {
  return Math.max(0, timeToMinutes(block.end) - timeToMinutes(block.start));
}

/** أول فترة فراغ كافية لكتلة مدتها minutes */
export function findFreeSlot(
  blocks: TimeBlock[],
  minutes: number,
  dayStart = '08:00',
  dayEnd = '22:00',
): { start: string; end: string } | null {
  const busy = blocks
    .filter((b) => b.kind !== 'break')
    .map((b) => ({ start: timeToMinutes(b.start), end: timeToMinutes(b.end) }))
    .sort((a, b) => a.start - b.start);
  let cursor = timeToMinutes(dayStart);
  const limit = timeToMinutes(dayEnd);
  for (const slot of busy) {
    if (slot.start - cursor >= minutes) {
      return { start: minutesToTime(cursor), end: minutesToTime(cursor + minutes) };
    }
    cursor = Math.max(cursor, slot.end);
  }
  if (limit - cursor >= minutes) return { start: minutesToTime(cursor), end: minutesToTime(cursor + minutes) };
  return null;
}

/** هل الجدول مزدحم لدرجة غير واقعية؟ */
export function isScheduleUnrealistic(blocks: TimeBlock[], opts: { maxWorkMinutes?: number; minBreakEvery?: number } = {}): {
  overloaded: boolean;
  reasons: string[];
} {
  const maxWork = opts.maxWorkMinutes ?? 600;
  const minBreakEvery = opts.minBreakEvery ?? 150;
  const reasons: string[] = [];
  const work = blocks.filter((b) => b.kind !== 'break');
  const workMinutes = work.reduce((s, b) => s + durationMinutes(b), 0);
  if (workMinutes > maxWork) reasons.push('overCapacity');
  if (findConflicts(blocks).length > 0) reasons.push('conflicts');

  // فترات متصلة بدون راحة
  const sorted = [...work].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  let runStart: number | null = null;
  let runEnd = 0;
  for (const b of sorted) {
    const s = timeToMinutes(b.start);
    const e = timeToMinutes(b.end);
    if (runStart === null || s - runEnd <= 15) {
      if (runStart === null) runStart = s;
      runEnd = Math.max(runEnd, e);
    } else {
      runStart = s;
      runEnd = e;
    }
    if (runEnd - (runStart ?? s) > minBreakEvery) {
      reasons.push('noBreaks');
      break;
    }
  }
  return { overloaded: reasons.length > 0, reasons };
}

export function logsForDate(logs: TimeLog[], date: string): TimeLog[] {
  return logs.filter((l) => l.date === date);
}

export function minutesOnDate(logs: TimeLog[], date: string, kind?: TimeLog['kind']): number {
  return logs.filter((l) => l.date === date && (!kind || l.kind === kind)).reduce((s, l) => s + l.minutes, 0);
}

export interface TimeBreakdown {
  label: string;
  minutes: number;
  percent: number;
  color: string;
}

const PALETTE = ['#2563eb', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

/** توزيع الوقت حسب المشروع أو التصنيف */
export function timeBreakdown(
  logs: TimeLog[],
  from: string,
  to: string,
  projects: Project[],
  tasks: Task[],
  by: 'project' | 'category' = 'project',
): TimeBreakdown[] {
  const inRange = logs.filter((l) => l.date >= from && l.date <= to && l.kind !== 'break');
  const totals = new Map<string, number>();
  for (const log of inRange) {
    let key: string;
    if (by === 'project') {
      let pid = log.projectId;
      if (!pid && log.taskId) pid = tasks.find((t) => t.id === log.taskId)?.projectId ?? null;
      key = pid ?? '__none__';
    } else {
      let cat = log.category;
      if (!cat && log.taskId) cat = tasks.find((t) => t.id === log.taskId)?.category ?? null;
      key = cat ?? '__none__';
    }
    totals.set(key, (totals.get(key) ?? 0) + log.minutes);
  }
  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return rows.map(([key, minutes], i) => ({
    label:
      key === '__none__'
        ? '__unassigned__'
        : (projects.find((p) => p.id === key)?.name ?? key),
    minutes,
    percent: pct(minutes, grand),
    color: key === '__none__' ? '#94a3b8' : PALETTE[i % PALETTE.length],
  }));
}

export function timePerDay(logs: TimeLog[], dates: string[]): { date: string; minutes: number }[] {
  return dates.map((date) => ({ date, minutes: minutesOnDate(logs, date, 'focus') + minutesOnDate(logs, date, 'work') }));
}

export function weeklyPlannedMinutes(blocks: TimeBlock[], date: string, weekStartsOn: 0 | 1 | 6 = 1): number {
  const range = weekRange(date, weekStartsOn);
  return blocks.filter((b) => range.includes(b.date) && b.kind !== 'break').reduce((s, b) => s + durationMinutes(b), 0);
}
