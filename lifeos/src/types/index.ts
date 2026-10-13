/**
 * LifeOS — نماذج البيانات (Domain types)
 * هذه الأنواع هي العقد الوحيد بين طبقة التخزين ومنطق الحساب وواجهة المستخدم.
 */

export type ID = string;

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'doing' | 'done';

export type Horizon = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';
export type CurrencyCode = 'DZD' | 'USD' | 'EUR' | 'SAR' | 'AED' | 'MAD' | 'TND' | 'EGP';

export interface BaseEntity {
  id: ID;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/* ------------------------------------------------------------------ Goals */

export interface Milestone {
  id: ID;
  title: string;
  done: boolean;
}

export interface GoalMetric {
  label: string;
  unit: string;
  startValue: number;
  targetValue: number;
  currentValue: number;
}

export type GoalStatus = 'active' | 'achieved' | 'archived';

export interface Goal extends BaseEntity {
  title: string;
  description: string;
  deadline: string | null; // YYYY-MM-DD
  priority: Priority;
  horizon: Horizon;
  metric: GoalMetric | null;
  /** تجاوز يدوي لنسبة التقدم 0..100 — null يعني الحساب التلقائي */
  manualProgress: number | null;
  milestones: Milestone[];
  projectId: ID | null;
  status: GoalStatus;
  achievedAt: string | null;
}

/* ------------------------------------------------------------------ Tasks */

export interface Task extends BaseEntity {
  title: string;
  notes: string;
  dueDate: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:mm
  priority: Priority;
  estimatedMinutes: number | null;
  actualMinutes: number;
  status: TaskStatus;
  goalId: ID | null;
  projectId: ID | null;
  category: string | null;
  /** تاريخ اختيار المهمة ضمن أهم 3 مهام لليوم (YYYY-MM-DD) */
  top3Date: string | null;
  completedAt: string | null;
  /** آخر تاريخ أُعيدت جدولتها فيه */
  rescheduledAt: string | null;
  archived: boolean;
}

/* ----------------------------------------------------------------- Habits */

export type HabitCadence = 'daily' | 'weekly';

export interface Habit extends BaseEntity {
  name: string;
  description: string;
  cadence: HabitCadence;
  /** عدد مرات التكرار المطلوبة في اليوم أو الأسبوع */
  targetCount: number;
  /** عدد مرات الإنجاز المطلوبة في الجلسة الواحدة (مثلاً 3 مجموعات) */
  repsPerDay: number;
  color: string;
  startDate: string; // YYYY-MM-DD
  archived: boolean;
}

/**
 * سجل إنجاز عادة في يوم معيّن.
 * المعرف حتمي: `${habitId}:${date}` — يمنع التسجيل المكرر لنفس العادة واليوم.
 */
export interface HabitLog extends BaseEntity {
  id: ID;
  habitId: ID;
  date: string; // YYYY-MM-DD
  count: number;
}

/* --------------------------------------------------------------- Projects */

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'done';

export interface ProjectUpdate {
  id: ID;
  text: string;
  createdAt: string;
}

export interface Project extends BaseEntity {
  name: string;
  description: string;
  goalId: ID | null;
  startDate: string | null;
  endDate: string | null;
  status: ProjectStatus;
  priority: Priority;
  color: string;
  notes: string;
  updates: ProjectUpdate[];
}

/* -------------------------------------------------------------- Time logs */

export type BlockKind = 'work' | 'break' | 'personal';

/** كتلة زمنية مخططة في التقويم اليومي */
export interface TimeBlock extends BaseEntity {
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  kind: BlockKind;
  taskId: ID | null;
  projectId: ID | null;
  notes: string;
}

/** وقت فعلي مسجّل (من Pomodoro أو يدويًا) */
export interface TimeLog extends BaseEntity {
  date: string; // YYYY-MM-DD
  minutes: number;
  kind: 'focus' | 'work' | 'break';
  taskId: ID | null;
  projectId: ID | null;
  category: string | null;
  note: string;
  source: 'pomodoro' | 'manual';
  startedAt: string;
}

/* ---------------------------------------------------------------- Finance */

export type TransactionType = 'income' | 'expense';

export interface Transaction extends BaseEntity {
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  note: string;
}

export interface SavingsGoal extends BaseEntity {
  name: string;
  targetAmount: number;
  /** الرصيد الحالي — يتغيّر عبر عمليات إيداع/سحب صريحة */
  currentAmount: number;
  deadline: string | null;
}

/* ------------------------------------------------------------------ Notes */

export type NoteKind = 'idea' | 'daily' | 'lesson' | 'decision' | 'project';

export interface Note extends BaseEntity {
  title: string;
  body: string;
  kind: NoteKind;
  tags: string[];
  goalId: ID | null;
  projectId: ID | null;
  pinned: boolean;
  archived: boolean;
}

/* ---------------------------------------------------------------- Reviews */

export type ReviewType = 'daily' | 'weekly';

export interface ReviewStats {
  tasksCompleted: number;
  tasksPlanned: number;
  focusMinutes: number;
  habitAdherence: number; // 0..100
  goalsProgress: number; // 0..100
  income: number;
  expenses: number;
}

export interface Review extends BaseEntity {
  type: ReviewType;
  /** YYYY-MM-DD للمراجعة اليومية، YYYY-Www للأسبوعية */
  periodKey: string;
  answers: Record<string, string>;
  stats: ReviewStats;
}

/* --------------------------------------------------------------- Settings */

export interface UserProfile {
  name: string;
  avatarColor: string;
}

export interface PrivacySettings {
  showFinanceOnDashboard: boolean;
  showAiCoach: boolean;
  cloudSyncEnabled: boolean;
}

export interface CoachSettings {
  /** 'none' = التكامل غير مفعّل (يُستخدم محرّك القواعد المحلي بوضوح) */
  provider: 'none' | 'openai-compatible';
  baseUrl: string;
  model: string;
}

export interface Settings extends BaseEntity {
  profile: UserProfile;
  language: Language;
  theme: Theme;
  timezone: string;
  weekStartsOn: 0 | 1 | 6; // أحد | اثنين | سبت
  currency: CurrencyCode;
  monthlyBudget: number;
  dailyFocusTargetMinutes: number;
  pomodoro: { focusMinutes: number; shortBreakMinutes: number; longBreakMinutes: number };
  privacy: PrivacySettings;
  coach: CoachSettings;
}

/* ------------------------------------------------------------------ Chat */

export interface CoachMessage {
  id: ID;
  role: 'user' | 'assistant';
  content: string;
  /** 'ai' = رد من نموذج حقيقي عبر API، 'rules' = اقتراح محسوب محليًا */
  engine: 'ai' | 'rules';
  createdAt: string;
}

/* -------------------------------------------------------------- Data root */

export interface DataCollections {
  goals: Goal[];
  tasks: Task[];
  habits: Habit[];
  habitLogs: HabitLog[];
  projects: Project[];
  timeBlocks: TimeBlock[];
  timeLogs: TimeLog[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  notes: Note[];
  reviews: Review[];
}

export type CollectionName = keyof DataCollections;

export const COLLECTION_NAMES: CollectionName[] = [
  'goals',
  'tasks',
  'habits',
  'habitLogs',
  'projects',
  'timeBlocks',
  'timeLogs',
  'transactions',
  'savingsGoals',
  'notes',
  'reviews',
];

/* ------------------------------------------------------------------- Auth */

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** true = وضع محلي على هذا الجهاز فقط (لا توجد مزامنة سحابية) */
  local: boolean;
}

export type AuthMode = 'local' | 'firebase';
