import { useMemo, useState } from 'react';
import type { Goal, Horizon } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SegmentedControl } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { GoalForm } from '@/components/forms/GoalForm';
import { TaskForm } from '@/components/forms/TaskForm';
import { useData, useSettings } from '@/lib/store/store';
import { addMilestone, archiveGoal, deleteGoal, removeMilestone, restoreGoal, setGoalProgress, setTaskStatus, toggleMilestone, updateGoalMetric } from '@/lib/store/actions';
import { daysUntil, goalIsOverdue, goalProgress, linkedTaskProgress, metricProgress, milestoneProgress, sortGoals } from '@/lib/domain/goals';
import { formatDate, todayISO } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

type Filter = 'active' | 'achieved' | 'archived' | 'overdue';

export function GoalsPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [filter, setFilter] = useState<Filter>('active');
  const [horizon, setHorizon] = useState<'all' | Horizon>('all');
  const [form, setForm] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const [taskForm, setTaskForm] = useState<{ open: boolean; goalId: string | null }>({ open: false, goalId: null });
  const [confirm, setConfirm] = useState<Goal | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [milestoneDraft, setMilestoneDraft] = useState('');

  const goals = useMemo(() => {
    let list = data.goals.filter((g) => {
      if (filter === 'overdue') return goalIsOverdue(g, today);
      return g.status === filter;
    });
    if (horizon !== 'all') list = list.filter((g) => g.horizon === horizon);
    return sortGoals(list, data.tasks, today);
  }, [data.goals, data.tasks, filter, horizon, today]);

  const overdueCount = useMemo(() => data.goals.filter((g) => goalIsOverdue(g, today)).length, [data.goals, today]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, goal: null })}>
            {t('goals.new')}
          </Button>
        }
      />

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: t('goals.filter.active') },
            { value: 'achieved', label: t('goals.filter.achieved') },
            { value: 'archived', label: t('goals.filter.archived') },
            { value: 'overdue', label: `${t('goals.filter.overdue')} (${overdueCount})` },
          ]}
        />
        <select className="input w-auto" value={horizon} onChange={(e) => setHorizon(e.target.value as typeof horizon)} aria-label={t('goals.horizon')}>
          <option value="all">{t('goals.horizon')}</option>
          {(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as Horizon[]).map((h) => (
            <option key={h} value={h}>
              {t(`goals.horizon.${h}`)}
            </option>
          ))}
        </select>
      </Card>

      {goals.length === 0 ? (
        <Card>
          <EmptyState
            icon="target"
            title={t('goals.empty')}
            description={t('goals.subtitle')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, goal: null })}>
                {t('goals.new')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {goals.map((goal) => {
            const progress = goalProgress(goal, data.tasks);
            const ms = milestoneProgress(goal);
            const lt = linkedTaskProgress(goal.id, data.tasks);
            const metric = goal.metric ? metricProgress(goal) : null;
            const due = daysUntil(goal.deadline, today);
            const isOpen = expanded === goal.id;
            const linkedTasks = data.tasks.filter((task) => task.goalId === goal.id && !task.archived);

            return (
              <Card key={goal.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-base font-bold text-[var(--text)]">{goal.title}</h2>
                      <Badge tone={goalIsOverdue(goal, today) ? 'danger' : goal.status === 'achieved' ? 'success' : 'brand'}>
                        {t(`goal.status.${goal.status}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {t(`goals.horizon.${goal.horizon}`)} · {t(`priority.${goal.priority}`)} ·{' '}
                      {goal.deadline ? (due !== null && due < 0 ? t('goals.daysAgo', { days: Math.abs(due) }) : t('goals.dueIn', { days: Math.max(0, due ?? 0) })) : t('goals.noDeadline')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" className="btn-ghost !px-1.5" onClick={() => setForm({ open: true, goal })} aria-label={t('common.edit')}>
                      <Icon name="edit" size={15} />
                    </button>
                    {goal.status === 'archived' ? (
                      <button type="button" className="btn-ghost !px-1.5" onClick={() => void restoreGoal(goal.id)} aria-label={t('common.restore')}>
                        <Icon name="reset" size={15} />
                      </button>
                    ) : (
                      <button type="button" className="btn-ghost !px-1.5" onClick={() => void archiveGoal(goal.id)} aria-label={t('goals.archive')}>
                        <Icon name="folder" size={15} />
                      </button>
                    )}
                    <button type="button" className="btn-ghost !px-1.5 text-red-500" onClick={() => setConfirm(goal)} aria-label={t('common.delete')}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                {goal.description ? <p className="px-4 pt-3 text-xs leading-relaxed text-[var(--text-muted)]">{goal.description}</p> : null}

                <div className="space-y-3 p-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{t('goals.progress')}</span>
                      <span className="font-bold tabular-nums text-[var(--text)]">{progress}%</span>
                    </div>
                    <Progress value={progress} tone={goalIsOverdue(goal, today) ? 'danger' : progress >= 100 ? 'success' : 'brand'} />
                  </div>

                  {goal.metric ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--text)]">{goal.metric.label || t('goals.metric')}</span>
                        <span className="tabular-nums text-[var(--text-muted)]">
                          {goal.metric.currentValue} / {goal.metric.targetValue} {goal.metric.unit}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Progress value={metric?.percent ?? 0} showLabel />
                      </div>
                      {metric ? (
                        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                          {t('goals.metric.remaining')}: {metric.remaining} {goal.metric.unit}
                        </p>
                      ) : null}
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          className="input !py-1 text-xs"
                          placeholder={String(goal.metric.currentValue)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = Number((e.target as HTMLInputElement).value);
                              if (Number.isFinite(value)) void updateGoalMetric(goal.id, { currentValue: value });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => void updateGoalMetric(goal.id, { currentValue: goal.metric!.currentValue + 1 })}
                        >
                          +1
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                    <span className="chip">
                      {t('goals.milestones')}: {ms.done}/{ms.total}
                    </span>
                    <span className="chip">
                      {t('goals.linkedTasks')}: {lt.done}/{lt.total}
                    </span>
                    {settings.weekStartsOn !== undefined ? null : null}
                  </div>

                  <button type="button" className="btn-ghost w-full justify-start text-xs" onClick={() => setExpanded(isOpen ? null : goal.id)}>
                    <Icon name={isOpen ? 'chevronStart' : 'chevronEnd'} size={13} />
                    {isOpen ? t('common.showLess') : t('common.showMore')}
                  </button>

                  {isOpen ? (
                    <div className="space-y-3 border-t border-[var(--border)] pt-3">
                      <div>
                        <p className="label">{t('goals.progress.manual')}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            defaultValue={goal.manualProgress ?? progress}
                            className="flex-1 accent-brand-600"
                            onChange={(e) => {
                              const label = e.target.nextElementSibling as HTMLElement | null;
                              if (label) label.textContent = `${e.target.value}%`;
                            }}
                            onMouseUp={(e) => void setGoalProgress(goal.id, Number((e.target as HTMLInputElement).value))}
                            onTouchEnd={(e) => void setGoalProgress(goal.id, Number((e.target as HTMLInputElement).value))}
                          />
                          <span className="w-10 text-end text-xs font-semibold tabular-nums text-[var(--text)]">{goal.manualProgress ?? progress}%</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">{goal.manualProgress === null ? t('goals.progress.auto') : t('goals.progress.manual')}</p>
                      </div>

                      <div>
                        <p className="label">{t('goals.milestones')}</p>
                        {goal.milestones.length === 0 ? <p className="mb-2 text-xs text-[var(--text-muted)]">{t('goals.milestones.empty')}</p> : null}
                        <ul className="space-y-1">
                          {goal.milestones.map((m) => (
                            <li key={m.id} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void toggleMilestone(goal.id, m.id)}
                                className={`flex h-4.5 w-4.5 items-center justify-center rounded border ${m.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)]'}`}
                                style={{ height: 18, width: 18 }}
                                aria-label={m.title}
                              >
                                {m.done ? <Icon name="check" size={11} /> : null}
                              </button>
                              <span className={`flex-1 text-sm ${m.done ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>{m.title}</span>
                              <button type="button" className="btn-ghost !px-1 text-red-500" onClick={() => void removeMilestone(goal.id, m.id)} aria-label={t('common.delete')}>
                                <Icon name="close" size={13} />
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex gap-2">
                          <input
                            className="input !py-1.5 text-xs"
                            placeholder={t('goals.milestones.add')}
                            value={milestoneDraft}
                            onChange={(e) => setMilestoneDraft(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && milestoneDraft.trim()) {
                                await addMilestone(goal.id, milestoneDraft.trim());
                                setMilestoneDraft('');
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            icon="plus"
                            disabled={!milestoneDraft.trim()}
                            onClick={async () => {
                              await addMilestone(goal.id, milestoneDraft.trim());
                              setMilestoneDraft('');
                            }}
                          >
                            {t('common.add')}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="label !mb-0">{t('goals.linkedTasks')}</p>
                          <Button size="sm" icon="plus" onClick={() => setTaskForm({ open: true, goalId: goal.id })}>
                            {t('goals.addTask')}
                          </Button>
                        </div>
                        {linkedTasks.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)]">{t('tasks.empty')}</p>
                        ) : (
                          <ul className="space-y-1">
                            {linkedTasks.map((task) => (
                              <li key={task.id} className="flex items-center gap-2 text-sm">
                                <button
                                  type="button"
                                  onClick={() => void setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                                  className={`flex h-4 items-center justify-center rounded-full border px-1 ${task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)]'}`}
                                  style={{ height: 18, width: 18 }}
                                  aria-label={task.title}
                                >
                                  {task.status === 'done' ? <Icon name="check" size={10} /> : null}
                                </button>
                                <span className={`flex-1 truncate ${task.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>{task.title}</span>
                                {task.dueDate ? <span className="text-[11px] text-[var(--text-muted)]">{formatDate(task.dueDate, lang)}</span> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GoalForm open={form.open} goal={form.goal} onClose={() => setForm({ open: false, goal: null })} />
      <TaskForm open={taskForm.open} defaults={{ goalId: taskForm.goalId }} onClose={() => setTaskForm({ open: false, goalId: null })} />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await deleteGoal(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}

export function GoalStatusBadge({ goal, today }: { goal: Goal; today: string }) {
  const t = useT();
  return <Badge tone={goalIsOverdue(goal, today) ? 'danger' : 'neutral'}>{t(`goal.status.${goal.status}`)}</Badge>;
}
