import { z } from 'zod';

/**
 * التحقق من المدخلات — طبقة واحدة لكل النماذج.
 * الرسائل مفاتيح ترجمة (t()) وليست نصًا ثابتًا.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'errors.invalidDate')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'errors.invalidTime')
  .or(z.literal('').transform(() => null))
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const priority = z.enum(['low', 'medium', 'high', 'urgent']);

const title = (min = 2, max = 160) =>
  z
    .string()
    .trim()
    .min(min, 'errors.titleTooShort')
    .max(max, 'errors.titleTooLong');

const optId = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v && v !== 'none' ? v : null));

const boundedNumber = (min: number, max: number, msg: string) =>
  z.coerce
    .number({ invalid_type_error: 'errors.invalidNumber' })
    .finite('errors.invalidNumber')
    .min(min, msg)
    .max(max, msg);

const optionalPositiveNumber = (max: number, msg: string) =>
  z
    .union([z.literal(''), z.number(), z.string()])
    .transform((v) => (v === '' || v === null || v === undefined ? null : Number(v)))
    .refine((v): v is number | null => v === null || (Number.isFinite(v) && v >= 0 && v <= max), { message: msg });

export const taskInput = z.object({
  title: title(),
  notes: z.string().max(4000, 'errors.tooLong').default(''),
  dueDate: isoDate,
  dueTime: hhmm,
  priority: priority.default('medium'),
  estimatedMinutes: optionalPositiveNumber(1440, 'errors.estimatedRange'),
  goalId: optId,
  projectId: optId,
  category: z
    .string()
    .trim()
    .max(40, 'errors.tooLong')
    .optional()
    .nullable()
    .transform((v) => (v && v.trim() ? v.trim() : null)),
});

export const goalInput = z.object({
  title: title(2, 160),
  description: z.string().max(4000, 'errors.tooLong').default(''),
  deadline: isoDate,
  priority: priority.default('medium'),
  horizon: z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  projectId: optId,
  metricLabel: z.string().trim().max(40, 'errors.tooLong').default(''),
  metricUnit: z.string().trim().max(12, 'errors.tooLong').default(''),
  metricStart: z.coerce.number().finite().default(0),
  metricTarget: z.coerce.number().finite().default(0),
  metricCurrent: z.coerce.number().finite().default(0),
});

export const habitInput = z.object({
  name: title(2, 80),
  description: z.string().max(1000, 'errors.tooLong').default(''),
  cadence: z.enum(['daily', 'weekly']).default('daily'),
  targetCount: boundedNumber(1, 30, 'errors.targetCountRange').default(1),
  repsPerDay: boundedNumber(1, 50, 'errors.repsRange').default(1),
  color: z.string().max(20, 'errors.tooLong').default('#2563eb'),
  startDate: isoDate,
});

export const projectInput = z.object({
  name: title(2, 120),
  description: z.string().max(4000, 'errors.tooLong').default(''),
  goalId: optId,
  startDate: isoDate,
  endDate: isoDate,
  status: z.enum(['planning', 'active', 'paused', 'done']).default('active'),
  priority: priority.default('medium'),
  color: z.string().max(20, 'errors.tooLong').default('#2563eb'),
});

export const transactionInput = z
  .object({
    type: z.enum(['income', 'expense']),
    amount: boundedNumber(0.01, 1_000_000_000, 'errors.amountRange'),
    category: z.string().trim().min(1, 'errors.categoryRequired').max(40, 'errors.tooLong'),
    date: isoDate,
    note: z.string().max(500, 'errors.tooLong').default(''),
  })
  .refine((v) => v.date !== null, { message: 'errors.dateRequired', path: ['date'] });

export const savingsGoalInput = z.object({
  name: title(2, 80),
  targetAmount: boundedNumber(1, 1_000_000_000, 'errors.amountRange'),
  deadline: isoDate,
});

export const noteInput = z.object({
  title: title(1, 160),
  body: z.string().max(20_000, 'errors.tooLong').default(''),
  kind: z.enum(['idea', 'daily', 'lesson', 'decision', 'project']).default('idea'),
  tags: z
    .string()
    .max(200, 'errors.tooLong')
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  goalId: optId,
  projectId: optId,
});

export const timeBlockInput = z
  .object({
    title: title(2, 120),
    date: isoDate,
    start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'errors.invalidTime'),
    end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'errors.invalidTime'),
    kind: z.enum(['work', 'break', 'personal']).default('work'),
    taskId: optId,
    projectId: optId,
    notes: z.string().max(1000, 'errors.tooLong').default(''),
  })
  .refine((v) => v.date !== null, { message: 'errors.dateRequired', path: ['date'] })
  .refine((v) => Number(v.start.replace(':', '')) < Number(v.end.replace(':', '')), {
    message: 'errors.endAfterStart',
    path: ['end'],
  });

export const manualTimeLogInput = z.object({
  date: isoDate,
  minutes: boundedNumber(1, 960, 'errors.minutesRange'),
  kind: z.enum(['focus', 'work', 'break']).default('focus'),
  taskId: optId,
  projectId: optId,
  category: z.string().trim().max(40, 'errors.tooLong').optional().nullable().default(null),
  note: z.string().max(500, 'errors.tooLong').default(''),
});

export const profileInput = z.object({
  name: title(1, 60),
  monthlyBudget: z.coerce.number().finite().min(0, 'errors.amountRange').max(1_000_000_000, 'errors.amountRange').default(0),
  dailyFocusTargetMinutes: boundedNumber(0, 1440, 'errors.minutesRange').default(120),
});

export const authInput = z.object({
  email: z.string().trim().email('errors.invalidEmail'),
  password: z.string().min(6, 'errors.passwordTooShort').max(128, 'errors.tooLong'),
});

export type FieldErrors = Record<string, string>;

export interface ParseResult<T> {
  ok: boolean;
  data: T | null;
  errors: FieldErrors;
  /** أول رسالة خطأ (لعرضها في تنبيه عام) */
  firstError: string | null;
}

function toFieldErrors(err: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function parseInput<S extends z.ZodTypeAny>(schema: S, raw: unknown): ParseResult<z.infer<S>> {
  const res = schema.safeParse(raw);
  if (res.success) return { ok: true, data: res.data as z.infer<S>, errors: {}, firstError: null };
  const errors = toFieldErrors(res.error);
  const firstError = Object.values(errors)[0] ?? 'errors.invalid';
  return { ok: false, data: null, errors, firstError };
}
