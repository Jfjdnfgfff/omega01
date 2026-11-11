import type { DataCollections, Goal, Habit, HabitLog, Project, Task, TimeBlock, TimeLog, Transaction } from '@/types';

const now = '2026-01-10T08:00:00.000Z';

export function base(id: string) {
  return { id, createdAt: now, updatedAt: now };
}

export function makeTask(partial: Partial<Task> & { id: string }): Task {
  return {
    title: `task ${partial.id}`,
    notes: '',
    dueDate: null,
    dueTime: null,
    priority: 'medium',
    estimatedMinutes: null,
    actualMinutes: 0,
    status: 'todo',
    goalId: null,
    projectId: null,
    category: null,
    top3Date: null,
    completedAt: null,
    rescheduledAt: null,
    archived: false,
    ...base(partial.id),
    ...partial,
  };
}

export function makeGoal(partial: Partial<Goal> & { id: string }): Goal {
  return {
    title: `goal ${partial.id}`,
    description: '',
    deadline: null,
    priority: 'medium',
    horizon: 'monthly',
    metric: null,
    manualProgress: null,
    milestones: [],
    projectId: null,
    status: 'active',
    achievedAt: null,
    ...base(partial.id),
    ...partial,
  };
}

export function makeHabit(partial: Partial<Habit> & { id: string }): Habit {
  return {
    name: `habit ${partial.id}`,
    description: '',
    cadence: 'daily',
    targetCount: 1,
    repsPerDay: 1,
    color: '#2563eb',
    startDate: '2026-01-01',
    archived: false,
    ...base(partial.id),
    ...partial,
  };
}

export function makeHabitLog(habitId: string, date: string): HabitLog {
  return { ...base(`${habitId}::${date}`), habitId, date, count: 1 };
}

export function makeProject(partial: Partial<Project> & { id: string }): Project {
  return {
    name: `project ${partial.id}`,
    description: '',
    goalId: null,
    startDate: null,
    endDate: null,
    status: 'active',
    priority: 'medium',
    color: '#2563eb',
    notes: '',
    updates: [],
    ...base(partial.id),
    ...partial,
  };
}

export function makeBlock(partial: Partial<TimeBlock> & { id: string }): TimeBlock {
  return {
    title: `block ${partial.id}`,
    date: '2026-01-10',
    start: '09:00',
    end: '10:00',
    kind: 'work',
    taskId: null,
    projectId: null,
    notes: '',
    ...base(partial.id),
    ...partial,
  };
}

export function makeTimeLog(partial: Partial<TimeLog> & { id: string }): TimeLog {
  return {
    date: '2026-01-10',
    minutes: 30,
    kind: 'focus',
    taskId: null,
    projectId: null,
    category: null,
    note: '',
    source: 'manual',
    startedAt: now,
    ...base(partial.id),
    ...partial,
  };
}

export function makeTransaction(partial: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: 'expense',
    amount: 100,
    category: 'Food',
    date: '2026-01-10',
    note: '',
    ...base(partial.id),
    ...partial,
  };
}

export function emptyCollections(): DataCollections {
  return {
    goals: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    projects: [],
    timeBlocks: [],
    timeLogs: [],
    transactions: [],
    savingsGoals: [],
    notes: [],
    reviews: [],
  };
}
