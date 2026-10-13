import type { Project, Task } from '@/types';
import { pct } from '@/lib/date';

/**
 * منطق المشاريع — نسبة الإنجاز حقيقية: مهام المشروع المرتبطة فعليًا.
 */

export function projectTasks(projectId: string, tasks: Task[]): Task[] {
  return tasks.filter((t) => t.projectId === projectId && !t.archived);
}

export function projectProgress(projectId: string, tasks: Task[]): { done: number; total: number; percent: number } {
  const list = projectTasks(projectId, tasks);
  if (list.length === 0) return { done: 0, total: 0, percent: 0 };
  const weight = (t: Task) => (t.estimatedMinutes && t.estimatedMinutes > 0 ? t.estimatedMinutes : 1);
  const total = list.reduce((s, t) => s + weight(t), 0);
  const done = list.filter((t) => t.status === 'done').reduce((s, t) => s + weight(t), 0);
  return { done: list.filter((t) => t.status === 'done').length, total: list.length, percent: pct(done, total) };
}

export function projectIsOverdue(project: Project, today: string): boolean {
  return !!project.endDate && project.endDate < today && project.status !== 'done';
}

export function projectDaysLeft(project: Project, today: string): number | null {
  if (!project.endDate) return null;
  return Math.round((new Date(project.endDate).getTime() - new Date(today).getTime()) / 86_400_000);
}

export function activeProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.status === 'active');
}

export function kanbanBuckets(projectId: string, tasks: Task[]): { todo: Task[]; doing: Task[]; done: Task[] } {
  const list = projectTasks(projectId, tasks);
  return {
    todo: list.filter((t) => t.status === 'todo'),
    doing: list.filter((t) => t.status === 'doing'),
    done: list.filter((t) => t.status === 'done'),
  };
}

export const PROJECT_STATUS_FLOW: Project['status'][] = ['planning', 'active', 'paused', 'done'];

/** هل الجدول الزمني للمشروع واقعي مقارنة بحجم العمل المتبقي؟ */
export function projectCapacityRisk(
  project: Project,
  tasks: Task[],
  today: string,
  dailyCapacityMinutes = 240,
): { atRisk: boolean; remainingMinutes: number; daysLeft: number | null; feasible: boolean } {
  const remainingMinutes = projectTasks(project.id, tasks)
    .filter((t) => t.status !== 'done')
    .reduce((s, t) => s + (t.estimatedMinutes ?? 30), 0);
  const daysLeft = projectDaysLeft(project, today);
  if (daysLeft === null) return { atRisk: false, remainingMinutes, daysLeft, feasible: true };
  const capacity = Math.max(1, daysLeft) * dailyCapacityMinutes;
  const feasible = remainingMinutes <= capacity;
  return { atRisk: !feasible && project.status !== 'done', remainingMinutes, daysLeft, feasible };
}
