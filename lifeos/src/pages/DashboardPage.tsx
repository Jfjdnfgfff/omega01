import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Task } from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, StatCard } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { Sparkline } from '@/components/charts/Charts';
import { TaskForm } from '@/components/forms/TaskForm';
import { GoalForm } from '@/components/forms/GoalForm';
import { NoteForm } from '@/components/forms/NoteForm';
import { useData, useSettings } from '@/lib/store/store';
import { setTaskStatus, setTop3 } from '@/lib/store/actions';
import { buildDashboard } from '@/lib/domain/dashboard';
import { completedPerDay } from '@/lib/domain/tasks';
import { formatDate, minutesToHuman, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import { useT, useLang } from '@/i18n';
import { toast } from '@/lib/store/toast';

function greetingKey(hour: number): string {
  if (hour < 12) return 'dashboard.greeting.morning';
  if (hour < 17) return 'dashboard.greeting.afternoon';
  if (hour < 21) return 'dashboard.greeting.evening';
  return 'dashboard.greeting.night';
}

export function DashboardPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [taskForm, setTaskForm] = useState<{ open: boolean; presetDate?: string }>({ open: false });
  const [goalForm, setGoalForm] = useState(false);
  const [noteForm, setNoteForm] = useState(false);

  const model = useMemo(() => buildDashboard(data, settings, today), [data, settings, today]);
  const last7 = useMemo(() => completedPerDay(data.tasks, today, 7), [data.tasks, today]);
  const name = settings.profile.name?.trim();
  const hour = new Date().getHours();

  async function toggle(task: Task) {
    const ok = task.status === 'done' ? await setTaskStatus(task.id, 'todo') : await setTaskStatus(task.id, 'done');
    if (!ok) toast.error('errors.saveFailed');
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${t(greetingKey(hour))}${name ? `، ${name}` : ''}`}
        subtitle={`${formatDate(today, lang, 'long')} — ${t('dashboard.subtitle')}`}
        actions={
          <>
            <Button variant="primary" icon="plus" onClick={() => setTaskForm({ open: true })}>
              {t('dashboard.quick.task')}
            </Button>
            <Button icon="target" onClick={() => setGoalForm(true)}>
              {t('dashboard.quick.goal')}
            </Button>
            <Button icon="note" onClick={() => setNoteForm(true)}>
              {t('dashboard.quick.note')}
            </Button>
          </>
        }
      />

      {model.alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {model.alerts.map((alert) => (
            <span
              key={alert.id}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                alert.severity === 'danger'
                  ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                  : alert.severity === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300'
              }`}
            >
              <Icon name="alert" size={13} />
              {t(`dashboard.alert.${alert.kind}`, { count: alert.value, value: alert.value })}
            </span>
          ))}
        </div>
      ) : null}

      {model.empty ? (
        <Card>
          <EmptyState
            icon="sparkles"
            title={t('dashboard.empty.title')}
            description={t('dashboard.empty.body')}
            action={
              <div className="flex gap-2">
                <Button variant="primary" icon="plus" onClick={() => setTaskForm({ open: true })}>
                  {t('tasks.new')}
                </Button>
                <Button icon="target" onClick={() => setGoalForm(true)}>
                  {t('goals.new')}
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('dashboard.tasks.remaining')}
          value={model.tasks.remaining}
          icon="checkSquare"
          tone={model.tasks.overdue > 0 ? 'danger' : 'brand'}
          hint={model.tasks.overdue > 0 ? `${t('dashboard.tasks.overdue')}: ${model.tasks.overdue}` : `${t('dashboard.tasks.completed')}: ${model.tasks.completed}`}
        />
        <StatCard
          label={t('dashboard.tasks.completionRate')}
          value={`${model.tasks.completionRate}%`}
          icon="chart"
          tone="success"
          hint={`${model.tasks.completed} / ${model.tasks.total}`}
        />
        <StatCard
          label={t('dashboard.goals.title')}
          value={`${model.goals.averageProgress}%`}
          icon="target"
          hint={`${t('dashboard.goals.active')}: ${model.goals.active}`}
        />
        <StatCard
          label={t('dashboard.habits.title')}
          value={`${model.habits.percentToday}%`}
          icon="flame"
          tone={model.habits.needsAttention > 0 ? 'warning' : 'success'}
          hint={`${t('dashboard.habits.streak')}: ${model.habits.currentStreak}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* ------------------------------------------------ top 3 */}
          <Card>
            <CardHeader
              title={t('dashboard.top3')}
              subtitle={t('dashboard.top3.hint')}
              icon="target"
              action={
                <Link to="/tasks" className="btn-ghost text-xs">
                  {t('common.viewAll')}
                </Link>
              }
            />
            <div className="p-2">
              {model.top3.length === 0 ? (
                <EmptyState
                  icon="checkSquare"
                  title={t('dashboard.top3')}
                  description={t('dashboard.top3.hint')}
                  action={
                    <Button variant="primary" icon="plus" onClick={() => setTaskForm({ open: true, presetDate: today })}>
                      {t('tasks.new')}
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {model.top3.map((task, index) => (
                    <li key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="w-5 text-center text-xs font-bold text-[var(--text-muted)]">{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => void toggle(task)}
                        aria-label={task.status === 'done' ? t('tasks.reopen') : t('tasks.complete')}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)] hover:border-brand-500'
                        }`}
                      >
                        {task.status === 'done' ? <Icon name="check" size={12} /> : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${task.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>
                          {task.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {t(`priority.${task.priority}`)}
                          {task.dueDate ? ` · ${formatDate(task.dueDate, lang)}` : ''}
                          {task.estimatedMinutes ? ` · ${minutesToHuman(task.estimatedMinutes, lang)}` : ''}
                        </p>
                      </div>
                      {task.dueDate && task.dueDate < today && task.status !== 'done' ? <Badge tone="danger">{t('tasks.overdueBadge')}</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          {/* ------------------------------------------------ goals */}
          <Card>
            <CardHeader
              title={t('dashboard.goals.title')}
              subtitle={`${t('dashboard.goals.active')}: ${model.goals.active}`}
              icon="target"
              action={
                <Link to="/goals" className="btn-ghost text-xs">
                  {t('common.viewAll')}
                </Link>
              }
            />
            <div className="space-y-3 p-4">
              {model.goals.list.length === 0 ? (
                <EmptyState icon="target" title={t('goals.empty')} action={<Button variant="primary" onClick={() => setGoalForm(true)}>{t('goals.new')}</Button>} />
              ) : (
                model.goals.list.map((item) => (
                  <div key={item.goal.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-[var(--text)]">{item.goal.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {item.overdue ? <Badge tone="danger">{t('goals.overdue')}</Badge> : null}
                        <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">{item.progress}%</span>
                      </span>
                    </div>
                    <Progress value={item.progress} tone={item.overdue ? 'danger' : item.progress >= 100 ? 'success' : 'brand'} />
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* --------------------------------------------- projects */}
          <Card>
            <CardHeader
              title={t('dashboard.projects.title')}
              icon="folder"
              action={
                <Link to="/projects" className="btn-ghost text-xs">
                  {t('common.viewAll')}
                </Link>
              }
            />
            <div className="p-2">
              {model.projects.length === 0 ? (
                <EmptyState icon="folder" title={t('projects.empty')} />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {model.projects.map(({ project, done, total, percent, atRisk }) => (
                    <li key={project.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">{project.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {t(`project.status.${project.status}`)} · {done}/{total} {t('projects.tasks')}
                        </p>
                      </div>
                      {atRisk ? <Badge tone="warning">{t('projects.atRisk')}</Badge> : null}
                      <span className="w-24"><Progress value={percent} /></span>
                      <span className="w-8 text-end text-xs font-semibold tabular-nums text-[var(--text-muted)]">{percent}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {/* ---------------------------------------------- habits */}
          <Card>
            <CardHeader title={t('dashboard.habits.title')} icon="flame" action={<Link to="/habits" className="btn-ghost text-xs">{t('common.viewAll')}</Link>} />
            <div className="space-y-3 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-extrabold tabular-nums text-[var(--text)]">{model.habits.doneToday}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('dashboard.habits.today')}</p>
                </div>
                <div className="text-end">
                  <p className="text-3xl font-extrabold tabular-nums text-[var(--text)]">{model.habits.currentStreak}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('dashboard.habits.streak')}</p>
                </div>
              </div>
              <Progress value={model.habits.percentToday} tone={model.habits.percentToday >= 100 ? 'success' : 'brand'} showLabel />
              {model.habits.total === 0 ? <p className="text-xs text-[var(--text-muted)]">{t('habits.empty')}</p> : null}
            </div>
          </Card>

          {/* ------------------------------------------------ time */}
          <Card>
            <CardHeader title={t('dashboard.time.title')} icon="clock" action={<Link to="/time" className="btn-ghost text-xs">{t('common.viewAll')}</Link>} />
            <div className="space-y-3 p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-extrabold tabular-nums text-[var(--text)]">{minutesToHuman(model.time.todayMinutes, lang)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('dashboard.time.today')}</p>
                </div>
                <div className="text-end">
                  <p className="text-2xl font-extrabold tabular-nums text-[var(--text)]">{minutesToHuman(model.time.weekMinutes, lang)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{t('dashboard.time.week')}</p>
                </div>
              </div>
              <Sparkline
                values={last7.map((d) => d.count)}
                labels={last7.map((d) => formatDate(d.date, lang, 'weekday'))}
                formatValue={(v) => `${v}`}
                color="#0ea5e9"
              />
              {model.time.breakdown.length > 0 ? (
                <ul className="space-y-1.5">
                  {model.time.breakdown.slice(0, 3).map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 text-[var(--text-muted)]">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="truncate">{row.label === '__unassigned__' ? t('time.unassigned') : row.label}</span>
                      </span>
                      <span className="font-semibold tabular-nums text-[var(--text)]">{minutesToHuman(row.minutes, lang)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">{t('time.summary.empty')}</p>
              )}
            </div>
          </Card>

          {/* --------------------------------------------- finance */}
          {model.finance ? (
            <Card>
              <CardHeader title={t('dashboard.finance.title')} icon="wallet" action={<Link to="/finance" className="btn-ghost text-xs">{t('common.viewAll')}</Link>} />
              <div className="space-y-2 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t('finance.income')}</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatMoney(model.finance.income, settings.currency, lang)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t('finance.expenses')}</span>
                  <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">{formatMoney(model.finance.expenses, settings.currency, lang)}</span>
                </div>
                <div className="divider" />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[var(--text)]">{t('dashboard.finance.net')}</span>
                  <span className={`font-bold tabular-nums ${model.finance.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMoney(model.finance.net, settings.currency, lang)}
                  </span>
                </div>
                {model.finance.budget.budget > 0 ? (
                  <div className="pt-1">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{t('dashboard.finance.budget')}</span>
                      <span className="tabular-nums">{model.finance.budget.usedPercent}%</span>
                    </div>
                    <Progress value={model.finance.budget.usedPercent} tone={model.finance.budget.overBudget ? 'danger' : 'brand'} />
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}

          {/* ---------------------------------------------- review */}
          <Card>
            <CardHeader title={t('dashboard.review.title')} icon="review" />
            <div className="space-y-3 p-4">
              <p className="text-sm text-[var(--text-muted)]">{model.reviewDoneToday ? t('dashboard.review.done') : t('dashboard.review.pending')}</p>
              <Link to="/reviews" className="btn-primary w-full">
                {model.reviewDoneToday ? t('common.viewAll') : t('dashboard.review.start')}
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <TaskForm open={taskForm.open} onClose={() => setTaskForm({ open: false })} defaults={{ dueDate: taskForm.presetDate ?? today }} />
      <GoalForm open={goalForm} onClose={() => setGoalForm(false)} />
      <NoteForm open={noteForm} onClose={() => setNoteForm(false)} />
    </div>
  );
}

export function DashboardTop3Toggle({ taskId, active }: { taskId: string; active: boolean }) {
  const t = useT();
  return (
    <button type="button" className="btn-ghost text-xs" onClick={() => void setTop3(taskId, active ? null : todayISO())}>
      {active ? t('dashboard.top3.removeFromDay') : t('dashboard.top3.addToDay')}
    </button>
  );
}
