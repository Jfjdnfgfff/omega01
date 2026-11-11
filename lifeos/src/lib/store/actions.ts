import type {
  AuthUser,
  CollectionName,
  DataCollections,
  Goal,
  Habit,
  HabitLog,
  ID,
  Milestone,
  Note,
  Project,
  Review,
  SavingsGoal,
  Settings,
  Task,
  TimeBlock,
  TimeLog,
  Transaction,
} from '@/types';
import { nowISO, uid, deterministicId } from '@/lib/id';
import { todayISO } from '@/lib/date';
import { store } from '@/lib/store/store';
import { initBackend, emptyData } from '@/lib/storage/index';
import { habitLogKey } from '@/lib/domain/habits';
import { buildReviewStats, periodKeyFor } from '@/lib/domain/reviews';
import { toast } from '@/lib/store/toast';

/**
 * طبقة الإجراءات — كل تغيير يمر من هنا:
 * تحديث متفائل في الحالة → حفظ في الخلفية → تراجع عند الفشل مع رسالة واضحة.
 */

type AnyDoc = Record<string, unknown>;

let backendRef: Awaited<ReturnType<typeof initBackend>> | null = null;

export function setBackend(backend: Awaited<ReturnType<typeof initBackend>> | null) {
  backendRef = backend;
}

function backend() {
  if (!backendRef) throw new Error('backend-not-ready');
  return backendRef;
}

function currentUid(): string {
  const user = store.getState().user;
  if (!user) throw new Error('no-user');
  return user.uid;
}

/* ------------------------------ idempotency ------------------------------ */

const inflight = new Map<string, Promise<unknown>>();
const completed = new Map<string, { at: number; value: unknown }>();
const IDEMPOTENCY_TTL_MS = 10_000;

/**
 * يمنع إنشاء سجل مكرر عند إعادة المحاولة:
 * - نقرتان متزامنتان → نفس الوعد الجاري.
 * - إعادة إرسال خلال نافذة قصيرة (مثلاً بعد انقطاع شبكة) → نفس السجل المخزّن.
 * المحاولات الفاشلة لا تُخزَّن، فيبقى بالإمكان إعادة المحاولة بعدها.
 */
export function idempotent<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  for (const [k, entry] of completed) {
    if (now - entry.at > IDEMPOTENCY_TTL_MS) completed.delete(k);
  }
  const cached = completed.get(key);
  if (cached) return Promise.resolve(cached.value as T);

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn()
    .then((value) => {
      if (value) completed.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/* ------------------------------ persistence ------------------------------ */

function applyLocal<K extends CollectionName>(col: K, doc: AnyDoc) {
  const list = store.getState().data[col] as unknown as AnyDoc[];
  const idx = list.findIndex((d) => d.id === doc.id);
  const next = idx >= 0 ? list.map((d) => (d.id === doc.id ? { ...d, ...doc } : d)) : [...list, doc];
  store.setData({ [col]: next } as unknown as Partial<DataCollections>);
}

function removeLocal(col: CollectionName, id: string) {
  const list = store.getState().data[col] as unknown as AnyDoc[];
  store.setData({ [col]: list.filter((d) => d.id !== id) } as unknown as Partial<DataCollections>);
}

async function persistDoc(col: CollectionName, doc: AnyDoc): Promise<boolean> {
  store.beginSave();
  try {
    await backend().data.upsert(currentUid(), col, doc);
    store.endSave(null);
    return true;
  } catch (err) {
    console.error('[LifeOS] فشل الحفظ', col, err);
    store.endSave('errors.saveFailed');
    return false;
  }
}

async function persistDelete(col: CollectionName, id: string): Promise<boolean> {
  store.beginSave();
  try {
    await backend().data.remove(currentUid(), col, id);
    store.endSave(null);
    return true;
  } catch (err) {
    console.error('[LifeOS] فشل الحذف', col, err);
    store.endSave('errors.saveFailed');
    return false;
  }
}

function base() {
  const now = nowISO();
  return { createdAt: now, updatedAt: now };
}

function touch<T extends { updatedAt: string }>(doc: T): T {
  return { ...doc, updatedAt: nowISO() };
}

async function write<K extends CollectionName>(col: K, doc: AnyDoc): Promise<boolean> {
  applyLocal(col, doc);
  const ok = await persistDoc(col, doc);
  if (!ok) removeLocal(col, String(doc.id));
  return ok;
}

async function erase(col: CollectionName, id: string): Promise<boolean> {
  const snapshot = store.getState().data[col];
  removeLocal(col, id);
  const ok = await persistDelete(col, id);
  if (!ok) store.setData({ [col]: snapshot } as unknown as Partial<DataCollections>);
  return ok;
}

/* ------------------------------------------------------------------ Tasks */

export interface TaskDraft {
  title: string;
  notes?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: Task['priority'];
  estimatedMinutes?: number | null;
  goalId?: ID | null;
  projectId?: ID | null;
  category?: string | null;
  status?: Task['status'];
}

export function createTask(draft: TaskDraft, requestKey?: string): Promise<Task | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`task:${key}`, async () => {
    const task: Task = {
      id: uid('task'),
      title: draft.title,
      notes: draft.notes ?? '',
      dueDate: draft.dueDate ?? null,
      dueTime: draft.dueTime ?? null,
      priority: draft.priority ?? 'medium',
      estimatedMinutes: draft.estimatedMinutes ?? null,
      actualMinutes: 0,
      status: draft.status ?? 'todo',
      goalId: draft.goalId ?? null,
      projectId: draft.projectId ?? null,
      category: draft.category ?? null,
      top3Date: null,
      completedAt: null,
      rescheduledAt: null,
      archived: false,
      ...base(),
    };
    const ok = await write('tasks', task as unknown as AnyDoc);
    return ok ? task : null;
  });
}

export async function updateTask(id: string, patch: Partial<Task>): Promise<boolean> {
  const current = store.getState().data.tasks.find((t) => t.id === id);
  if (!current) return false;
  return write('tasks', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function deleteTask(id: string): Promise<boolean> {
  return erase('tasks', id);
}

export async function setTaskStatus(id: string, status: Task['status']): Promise<boolean> {
  const patch: Partial<Task> = { status };
  const task = store.getState().data.tasks.find((t) => t.id === id);
  if (status === 'done') {
    patch.completedAt = task?.completedAt ?? nowISO();
    patch.top3Date = null;
  } else {
    patch.completedAt = null;
  }

  // نسبة تقدم الهدف تُحسب دائمًا من المهام الفعلية (goalProgress)،
  // لكن إكمال آخر مهمة يُعلّم الهدف كمُنجَز ويحفظ ذلك.
  if (status === 'done' && task?.goalId) {
    const goal = store.getState().data.goals.find((g) => g.id === task.goalId);
    if (goal && goal.status === 'active' && goal.manualProgress === null) {
      const linked = store
        .getState()
        .data.tasks.filter((t) => t.goalId === goal.id && !t.archived)
        .map((t) => (t.id === id ? { ...t, status } : t));
      const allDone = linked.length > 0 && linked.every((t) => t.status === 'done');
      if (allDone) {
        const nextGoal: Goal = { ...goal, status: 'achieved', achievedAt: nowISO(), updatedAt: nowISO() };
        applyLocal('goals', nextGoal as unknown as AnyDoc);
        void persistDoc('goals', nextGoal as unknown as AnyDoc);
      }
    }
  }

  return updateTask(id, patch);
}

export async function addActualMinutes(id: string, minutes: number): Promise<boolean> {
  const task = store.getState().data.tasks.find((t) => t.id === id);
  if (!task) return false;
  return updateTask(id, { actualMinutes: (task.actualMinutes ?? 0) + minutes });
}

export async function setTop3(id: string, date: string | null): Promise<boolean> {
  return updateTask(id, { top3Date: date });
}

export async function rescheduleTasks(ids: string[], newDate: string): Promise<boolean> {
  const now = nowISO();
  const results = await Promise.all(
    ids.map((id) => {
      const task = store.getState().data.tasks.find((t) => t.id === id);
      if (!task) return Promise.resolve(true);
      return write('tasks', touch({ ...task, dueDate: newDate, rescheduledAt: now }) as unknown as AnyDoc);
    }),
  );
  return results.every(Boolean);
}

export async function archiveTask(id: string, archived = true): Promise<boolean> {
  return updateTask(id, { archived });
}

/* ------------------------------------------------------------------ Goals */

export interface GoalDraft {
  title: string;
  description?: string;
  deadline?: string | null;
  priority?: Goal['priority'];
  horizon?: Goal['horizon'];
  projectId?: ID | null;
  metric?: { label: string; unit: string; startValue: number; targetValue: number; currentValue: number } | null;
}

export function createGoal(draft: GoalDraft, requestKey?: string): Promise<Goal | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`goal:${key}`, async () => {
    const goal: Goal = {
      id: uid('goal'),
      title: draft.title,
      description: draft.description ?? '',
      deadline: draft.deadline ?? null,
      priority: draft.priority ?? 'medium',
      horizon: draft.horizon ?? 'monthly',
      metric: draft.metric ?? null,
      manualProgress: null,
      milestones: [],
      projectId: draft.projectId ?? null,
      status: 'active',
      achievedAt: null,
      ...base(),
    };
    const ok = await write('goals', goal as unknown as AnyDoc);
    return ok ? goal : null;
  });
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<boolean> {
  const current = store.getState().data.goals.find((g) => g.id === id);
  if (!current) return false;
  const next = touch({ ...current, ...patch });
  if (patch.status === 'achieved' && !current.achievedAt) next.achievedAt = nowISO();
  return write('goals', next as unknown as AnyDoc);
}

export async function deleteGoal(id: string): Promise<boolean> {
  return erase('goals', id);
}

export async function archiveGoal(id: string): Promise<boolean> {
  return updateGoal(id, { status: 'archived' });
}

export async function restoreGoal(id: string): Promise<boolean> {
  return updateGoal(id, { status: 'active', achievedAt: null });
}

export async function setGoalProgress(id: string, percent: number): Promise<boolean> {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  const patch: Partial<Goal> = { manualProgress: value };
  if (value >= 100) {
    patch.status = 'achieved';
    patch.achievedAt = nowISO();
  }
  return updateGoal(id, patch);
}

export async function updateGoalMetric(id: string, patch: Partial<Goal['metric']>): Promise<boolean> {
  const goal = store.getState().data.goals.find((g) => g.id === id);
  if (!goal) return false;
  const metric = { label: '', unit: '', startValue: 0, targetValue: 0, currentValue: 0, ...(goal.metric ?? {}), ...patch };
  return updateGoal(id, { metric });
}

export async function addMilestone(goalId: string, title: string): Promise<boolean> {
  const goal = store.getState().data.goals.find((g) => g.id === goalId);
  if (!goal) return false;
  const milestone: Milestone = { id: uid('ms'), title, done: false };
  return updateGoal(goalId, { milestones: [...goal.milestones, milestone] });
}

export async function toggleMilestone(goalId: string, milestoneId: string): Promise<boolean> {
  const goal = store.getState().data.goals.find((g) => g.id === goalId);
  if (!goal) return false;
  const milestones = goal.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
  const patch: Partial<Goal> = { milestones };
  const allDone = milestones.length > 0 && milestones.every((m) => m.done);
  if (allDone && goal.status === 'active' && goal.manualProgress === null) {
    patch.status = 'achieved';
    patch.achievedAt = nowISO();
  }
  return updateGoal(goalId, patch);
}

export async function removeMilestone(goalId: string, milestoneId: string): Promise<boolean> {
  const goal = store.getState().data.goals.find((g) => g.id === goalId);
  if (!goal) return false;
  return updateGoal(goalId, { milestones: goal.milestones.filter((m) => m.id !== milestoneId) });
}

/* ----------------------------------------------------------------- Habits */

export interface HabitDraft {
  name: string;
  description?: string;
  cadence?: Habit['cadence'];
  targetCount?: number;
  repsPerDay?: number;
  color?: string;
  startDate?: string;
}

export function createHabit(draft: HabitDraft, requestKey?: string): Promise<Habit | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`habit:${key}`, async () => {
    const habit: Habit = {
      id: uid('habit'),
      name: draft.name,
      description: draft.description ?? '',
      cadence: draft.cadence ?? 'daily',
      targetCount: draft.targetCount ?? 1,
      repsPerDay: draft.repsPerDay ?? 1,
      color: draft.color ?? '#2563eb',
      startDate: draft.startDate ?? todayISO(),
      archived: false,
      ...base(),
    };
    const ok = await write('habits', habit as unknown as AnyDoc);
    return ok ? habit : null;
  });
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<boolean> {
  const current = store.getState().data.habits.find((h) => h.id === id);
  if (!current) return false;
  return write('habits', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function deleteHabit(id: string): Promise<boolean> {
  const logs = store.getState().data.habitLogs.filter((l) => l.habitId === id);
  for (const log of logs) await erase('habitLogs', log.id);
  return erase('habits', id);
}

/**
 * تسجيل/إلغاء إنجاز عادة في يوم معيّن.
 * المعرف حتمي من (habitId + date) فلا يتكرر السجل مهما تكررت المحاولة.
 */
export async function toggleHabitLog(habitId: string, date: string): Promise<boolean> {
  const id = deterministicId(habitLogKey(habitId, date).replace(/[^a-z0-9]/gi, ''));
  const existing = store.getState().data.habitLogs.find((l) => l.id === id);
  if (existing) return erase('habitLogs', id);
  const log: HabitLog = { id, habitId, date, count: 1, ...base() };
  return write('habitLogs', log as unknown as AnyDoc);
}

/** زيادة عدّاد الإنجاز داخل اليوم نفسه (مثلاً 3 مجموعات) مع سقف = الهدف */
export async function incrementHabitLog(habitId: string, date: string, target: number): Promise<boolean> {
  const id = deterministicId(habitLogKey(habitId, date).replace(/[^a-z0-9]/gi, ''));
  const existing = store.getState().data.habitLogs.find((l) => l.id === id);
  const count = Math.min(target, (existing?.count ?? 0) + 1);
  if (existing && existing.count >= target) return true; // لا تكرار بعد بلوغ الهدف
  const log: HabitLog = existing
    ? { ...existing, count, updatedAt: nowISO() }
    : { id, habitId, date, count, ...base() };
  return write('habitLogs', log as unknown as AnyDoc);
}

/* --------------------------------------------------------------- Projects */

export interface ProjectDraft {
  name: string;
  description?: string;
  goalId?: ID | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: Project['status'];
  priority?: Project['priority'];
  color?: string;
}

export function createProject(draft: ProjectDraft, requestKey?: string): Promise<Project | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`project:${key}`, async () => {
    const project: Project = {
      id: uid('proj'),
      name: draft.name,
      description: draft.description ?? '',
      goalId: draft.goalId ?? null,
      startDate: draft.startDate ?? todayISO(),
      endDate: draft.endDate ?? null,
      status: draft.status ?? 'active',
      priority: draft.priority ?? 'medium',
      color: draft.color ?? '#2563eb',
      notes: '',
      updates: [],
      ...base(),
    };
    const ok = await write('projects', project as unknown as AnyDoc);
    return ok ? project : null;
  });
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<boolean> {
  const current = store.getState().data.projects.find((p) => p.id === id);
  if (!current) return false;
  return write('projects', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function deleteProject(id: string): Promise<boolean> {
  return erase('projects', id);
}

export async function addProjectUpdate(id: string, text: string): Promise<boolean> {
  const project = store.getState().data.projects.find((p) => p.id === id);
  if (!project) return false;
  const entry = { id: uid('upd'), text, createdAt: nowISO() };
  return updateProject(id, { updates: [entry, ...project.updates].slice(0, 200) });
}

/* -------------------------------------------------------------- Time logs */

export interface TimeBlockDraft {
  title: string;
  date: string;
  start: string;
  end: string;
  kind?: TimeBlock['kind'];
  taskId?: ID | null;
  projectId?: ID | null;
  notes?: string;
}

export function createTimeBlock(draft: TimeBlockDraft, requestKey?: string): Promise<TimeBlock | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`block:${key}`, async () => {
    const block: TimeBlock = {
      id: uid('blk'),
      title: draft.title,
      date: draft.date,
      start: draft.start,
      end: draft.end,
      kind: draft.kind ?? 'work',
      taskId: draft.taskId ?? null,
      projectId: draft.projectId ?? null,
      notes: draft.notes ?? '',
      ...base(),
    };
    const ok = await write('timeBlocks', block as unknown as AnyDoc);
    return ok ? block : null;
  });
}

export async function updateTimeBlock(id: string, patch: Partial<TimeBlock>): Promise<boolean> {
  const current = store.getState().data.timeBlocks.find((b) => b.id === id);
  if (!current) return false;
  return write('timeBlocks', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function deleteTimeBlock(id: string): Promise<boolean> {
  return erase('timeBlocks', id);
}

export interface TimeLogDraft {
  date?: string;
  minutes: number;
  kind?: TimeLog['kind'];
  taskId?: ID | null;
  projectId?: ID | null;
  category?: string | null;
  note?: string;
  source?: TimeLog['source'];
  startedAt?: string;
}

export function addTimeLog(draft: TimeLogDraft, requestKey?: string): Promise<TimeLog | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`timelog:${key}`, async () => {
    const startedAt = draft.startedAt ?? nowISO();
    const log: TimeLog = {
      id: uid('tlog'),
      date: draft.date ?? startedAt.slice(0, 10),
      minutes: Math.max(1, Math.round(draft.minutes)),
      kind: draft.kind ?? 'focus',
      taskId: draft.taskId ?? null,
      projectId: draft.projectId ?? null,
      category: draft.category ?? null,
      note: draft.note ?? '',
      source: draft.source ?? 'manual',
      startedAt,
      ...base(),
    };
    const ok = await write('timeLogs', log as unknown as AnyDoc);
    return ok ? log : null;
  });
}

export async function deleteTimeLog(id: string): Promise<boolean> {
  return erase('timeLogs', id);
}

/* ---------------------------------------------------------------- Finance */

export function createTransaction(
  draft: { type: Transaction['type']; amount: number; category: string; date: string; note?: string },
  requestKey?: string,
): Promise<Transaction | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`tx:${key}`, async () => {
    const tx: Transaction = {
      id: uid('tx'),
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      date: draft.date,
      note: draft.note ?? '',
      ...base(),
    };
    const ok = await write('transactions', tx as unknown as AnyDoc);
    return ok ? tx : null;
  });
}

export async function deleteTransaction(id: string): Promise<boolean> {
  return erase('transactions', id);
}

export function createSavingsGoal(draft: { name: string; targetAmount: number; deadline?: string | null }): Promise<SavingsGoal | null> {
  return idempotent(`savings:${uid('req')}`, async () => {
    const goal: SavingsGoal = {
      id: uid('sav'),
      name: draft.name,
      targetAmount: draft.targetAmount,
      currentAmount: 0,
      deadline: draft.deadline ?? null,
      ...base(),
    };
    const ok = await write('savingsGoals', goal as unknown as AnyDoc);
    return ok ? goal : null;
  });
}

export async function updateSavingsGoal(id: string, patch: Partial<SavingsGoal>): Promise<boolean> {
  const current = store.getState().data.savingsGoals.find((s) => s.id === id);
  if (!current) return false;
  return write('savingsGoals', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function savingsDeposit(id: string, delta: number): Promise<boolean> {
  const current = store.getState().data.savingsGoals.find((s) => s.id === id);
  if (!current) return false;
  return updateSavingsGoal(id, { currentAmount: Math.max(0, current.currentAmount + delta) });
}

export async function deleteSavingsGoal(id: string): Promise<boolean> {
  return erase('savingsGoals', id);
}

/* ------------------------------------------------------------------ Notes */

export function createNote(
  draft: { title: string; body?: string; kind?: Note['kind']; tags?: string[]; goalId?: ID | null; projectId?: ID | null },
  requestKey?: string,
): Promise<Note | null> {
  const key = requestKey ?? uid('req');
  return idempotent(`note:${key}`, async () => {
    const note: Note = {
      id: uid('note'),
      title: draft.title,
      body: draft.body ?? '',
      kind: draft.kind ?? 'idea',
      tags: draft.tags ?? [],
      goalId: draft.goalId ?? null,
      projectId: draft.projectId ?? null,
      pinned: false,
      archived: false,
      ...base(),
    };
    const ok = await write('notes', note as unknown as AnyDoc);
    return ok ? note : null;
  });
}

export async function updateNote(id: string, patch: Partial<Note>): Promise<boolean> {
  const current = store.getState().data.notes.find((n) => n.id === id);
  if (!current) return false;
  return write('notes', touch({ ...current, ...patch }) as unknown as AnyDoc);
}

export async function deleteNote(id: string): Promise<boolean> {
  return erase('notes', id);
}

/* ---------------------------------------------------------------- Reviews */

/**
 * حفظ مراجعة. `date` هو اليوم المرجعي؛ مفتاح الفترة يُحسب منه
 * (YYYY-MM-DD لليومية، YYYY-Www للأسبوعية) والمعرّف حتمي فلا تتكرر المراجعة.
 */
export async function saveReview(
  type: Review['type'],
  date: string,
  answers: Record<string, string>,
): Promise<boolean> {
  const periodKey = periodKeyFor(type, date);
  const id = deterministicId(`review_${type}_${periodKey}`.replace(/[^a-z0-9]/gi, ''));
  const existing = store.getState().data.reviews.find((r) => r.id === id);
  const stats = buildReviewStats(store.getState().data, type, date, store.getState().settings.weekStartsOn);
  const review: Review = existing
    ? { ...existing, answers: { ...existing.answers, ...answers }, stats, updatedAt: nowISO() }
    : { id, type, periodKey, answers, stats, ...base() };
  return write('reviews', review as unknown as AnyDoc);
}

/* --------------------------------------------------------------- Settings */

export async function updateSettings(patch: Partial<Settings>): Promise<boolean> {
  store.setSettings(patch);
  const settings = store.getState().settings;
  store.beginSave();
  try {
    await backend().data.saveMeta(currentUid(), 'settings', settings);
    store.endSave(null);
    return true;
  } catch {
    store.endSave('errors.saveFailed');
    return false;
  }
}

/* --------------------------------------------------------------- Data ops */

export interface ExportPayload {
  app: 'lifeos';
  version: 1;
  exportedAt: string;
  user: { uid: string; email: string | null };
  settings: Settings;
  data: DataCollections;
}

export function exportData(): ExportPayload {
  const state = store.getState();
  return {
    app: 'lifeos',
    version: 1,
    exportedAt: nowISO(),
    user: { uid: state.user?.uid ?? 'unknown', email: state.user?.email ?? null },
    settings: state.settings,
    data: state.data,
  };
}

export function validateImport(raw: unknown): { ok: boolean; payload?: ExportPayload; error?: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'errors.importInvalid' };
  const candidate = raw as Partial<ExportPayload>;
  if (candidate.app !== 'lifeos') return { ok: false, error: 'errors.importInvalid' };
  if (!candidate.data || typeof candidate.data !== 'object') return { ok: false, error: 'errors.importInvalid' };
  return { ok: true, payload: candidate as ExportPayload };
}

export async function importData(payload: ExportPayload, mode: 'replace' | 'merge' = 'replace'): Promise<boolean> {
  const uidNow = currentUid();
  store.beginSave();
  try {
    if (mode === 'replace') {
      await backend().data.replaceAll(uidNow, payload.data);
      store.setData(payload.data);
    } else {
      const merged = { ...store.getState().data };
      for (const key of Object.keys(payload.data) as CollectionName[]) {
        const incoming = (payload.data[key] as unknown as AnyDoc[]) ?? [];
        const existing = (merged[key] as unknown as AnyDoc[]) ?? [];
        const byId = new Map(existing.map((d) => [String(d.id), d]));
        for (const doc of incoming) byId.set(String(doc.id), { ...byId.get(String(doc.id)), ...doc });
        (merged[key] as unknown) = [...byId.values()];
      }
      for (const key of Object.keys(merged) as CollectionName[]) {
        for (const doc of merged[key] as unknown as AnyDoc[]) {
          await backend().data.upsert(uidNow, key, doc);
        }
      }
      store.setData(merged);
    }
    if (payload.settings) {
      store.setSettings(payload.settings);
      await backend().data.saveMeta(uidNow, 'settings', payload.settings);
    }
    store.endSave(null);
    toast.success('settings.importDone');
    return true;
  } catch (err) {
    console.error('[LifeOS] فشل الاستيراد', err);
    store.endSave('errors.importFailed');
    return false;
  }
}

export async function deleteAllData(): Promise<boolean> {
  store.beginSave();
  try {
    await backend().data.clearAll(currentUid());
    store.setData(emptyData());
    store.setSettings({ ...store.getState().settings, profile: { name: '', avatarColor: '#2563eb' } });
    store.endSave(null);
    return true;
  } catch {
    store.endSave('errors.saveFailed');
    return false;
  }
}

export async function signOut(): Promise<void> {
  try {
    await backend().auth.signOut();
  } finally {
    store.setState({ user: null, phase: 'auth', data: emptyData() });
  }
}

export async function deleteAccount(): Promise<boolean> {
  const auth = backend().auth;
  try {
    if (auth.deleteAccount) await auth.deleteAccount();
    else await backend().data.clearAll(currentUid());
    store.setState({ user: null, phase: 'auth', data: emptyData() });
    return true;
  } catch (err) {
    console.error('[LifeOS] فشل حذف الحساب', err);
    toast.error('errors.deleteAccountFailed');
    return false;
  }
}

export function currentUser(): AuthUser | null {
  return store.getState().user;
}
