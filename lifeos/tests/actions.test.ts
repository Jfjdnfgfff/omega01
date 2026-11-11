import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthDriver } from '@/lib/storage/types';
import { emptyData } from '@/lib/storage/types';
import { localAuth } from '@/lib/storage/localAuth';
import { FakeDriver, TEST_USER as user } from './fakeDriver';
import { store } from '@/lib/store/store';
import {
  createTask,
  deleteTask,
  setBackend,
  setTaskStatus,
  toggleHabitLog,
  updateTask,
  saveReview,
  createGoal,
  updateGoal,
} from '@/lib/store/actions';

const auth: AuthDriver = localAuth;
let driver: FakeDriver;

beforeEach(() => {
  driver = new FakeDriver();
  setBackend({ auth, data: driver, mode: 'local' });
  store.setState({ user, phase: 'ready', data: emptyData(), save: { phase: 'idle', lastSavedAt: null, error: null, pending: 0 } });
});

describe('persistence actions', () => {
  it('creates a task in the store and in storage', async () => {
    const task = await createTask({ title: 'Write the plan', priority: 'high' });
    expect(task).not.toBeNull();
    expect(store.getState().data.tasks).toHaveLength(1);
    expect(Object.values(driver.store.tasks)).toHaveLength(1);
    expect(store.getState().save.phase).toBe('saved');
  });

  it('does not duplicate a record when the same request is retried', async () => {
    const first = await createTask({ title: 'Retry me' }, 'req-1');
    const second = await createTask({ title: 'Retry me' }, 'req-1');
    expect(second?.id).toBe(first?.id);
    expect(store.getState().data.tasks).toHaveLength(1);
    expect(Object.values(driver.store.tasks)).toHaveLength(1);
  });

  it('collapses concurrent submissions of the same form into one record', async () => {
    const results = await Promise.all([
      createTask({ title: 'Double click' }, 'req-2'),
      createTask({ title: 'Double click' }, 'req-2'),
      createTask({ title: 'Double click' }, 'req-2'),
    ]);
    expect(new Set(results.map((r) => r?.id)).size).toBe(1);
    expect(Object.values(driver.store.tasks)).toHaveLength(1);
  });

  it('updates and deletes records', async () => {
    const task = await createTask({ title: 'Edit me' });
    expect(task).not.toBeNull();
    await updateTask(task!.id, { title: 'Edited' });
    expect(store.getState().data.tasks[0].title).toBe('Edited');
    expect((driver.store.tasks[task!.id] as { title: string }).title).toBe('Edited');

    await deleteTask(task!.id);
    expect(store.getState().data.tasks).toHaveLength(0);
    expect(Object.keys(driver.store.tasks)).toHaveLength(0);
  });

  it('rolls back the optimistic update and reports the failure when saving fails', async () => {
    driver.failNextWrite = true;
    const task = await createTask({ title: 'Will fail' });
    expect(task).toBeNull();
    expect(store.getState().data.tasks).toHaveLength(0);
    expect(store.getState().save.error).toBe('errors.saveFailed');

    driver.failNextWrite = false;
    const ok = await createTask({ title: 'Now it works' });
    expect(ok).not.toBeNull();
    expect(store.getState().save.phase).toBe('saved');
  });

  it('restores a deleted item when the delete fails', async () => {
    const task = await createTask({ title: 'Keep me' });
    driver.failNextWrite = true;
    await deleteTask(task!.id);
    expect(store.getState().data.tasks).toHaveLength(1);
  });
});

describe('habit check-ins', () => {
  it('can never hold two logs for the same habit and day', async () => {
    await toggleHabitLog('h1', '2026-01-10');
    const firstId = store.getState().data.habitLogs[0].id;
    // إعادة التسجيل في اليوم نفسه تُعيد استخدام نفس المعرف الحتمي (تبديل، لا تكرار)
    await toggleHabitLog('h1', '2026-01-10');
    expect(store.getState().data.habitLogs).toHaveLength(0);
    await toggleHabitLog('h1', '2026-01-10');
    expect(store.getState().data.habitLogs[0].id).toBe(firstId);
    expect(Object.values(driver.store.habitLogs)).toHaveLength(1);
  });

  it('removes the log when toggled off', async () => {
    await toggleHabitLog('h1', '2026-01-10');
    await toggleHabitLog('h1', '2026-01-11');
    expect(store.getState().data.habitLogs).toHaveLength(2);
    await toggleHabitLog('h1', '2026-01-10');
    expect(store.getState().data.habitLogs).toHaveLength(1);
    expect(store.getState().data.habitLogs[0].date).toBe('2026-01-11');
  });
});

describe('task completion drives goal progress', () => {
  it('marks the linked goal achieved when its last task is completed', async () => {
    const goal = await createGoal({ title: 'Ship the site' });
    const a = await createTask({ title: 'Design', goalId: goal!.id });
    const b = await createTask({ title: 'Build', goalId: goal!.id });

    await setTaskStatus(a!.id, 'done');
    expect(store.getState().data.goals[0].status).toBe('active');

    await setTaskStatus(b!.id, 'done');
    const updated = store.getState().data.goals[0];
    expect(updated.status).toBe('achieved');
    expect(updated.achievedAt).not.toBeNull();
    expect(driver.store.goals[goal!.id]).toBeDefined();
  });

  it('reopening a task clears its completion timestamp', async () => {
    const task = await createTask({ title: 'Toggle' });
    await setTaskStatus(task!.id, 'done');
    expect(store.getState().data.tasks[0].completedAt).not.toBeNull();
    await setTaskStatus(task!.id, 'todo');
    expect(store.getState().data.tasks[0].completedAt).toBeNull();
  });
});

describe('reviews', () => {
  it('keeps a single review per period and merges answers', async () => {
    await saveReview('daily', '2026-01-10', { won: 'Built the app' });
    await saveReview('daily', '2026-01-10', { learned: 'Ship small' });
    const reviews = store.getState().data.reviews;
    expect(reviews).toHaveLength(1);
    expect(reviews[0].answers).toEqual({ won: 'Built the app', learned: 'Ship small' });
    expect(reviews[0].periodKey).toBe('2026-01-10');
  });

  it('stores weekly reviews under an ISO week key', async () => {
    await saveReview('weekly', '2026-01-10', { highlights: 'x' });
    expect(store.getState().data.reviews[0].periodKey).toBe('2026-W02');
  });
});

describe('goal updates', () => {
  it('persists milestone edits through the same write path', async () => {
    const goal = await createGoal({ title: 'Read more' });
    await updateGoal(goal!.id, { milestones: [{ id: 'm1', title: 'Book 1', done: true }] });
    expect(store.getState().data.goals[0].milestones).toHaveLength(1);
    expect((driver.store.goals[goal!.id] as { milestones: unknown[] }).milestones).toHaveLength(1);
  });
});
