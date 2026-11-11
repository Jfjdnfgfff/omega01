import { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader, SegmentedControl } from '@/components/ui/primitives';
import { Checkbox } from '@/components/ui/fields';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { TaskForm } from '@/components/forms/TaskForm';
import { DashboardTop3Toggle } from '@/pages/DashboardPage';
import { useData, useSettings } from '@/lib/store/store';
import { deleteTask, rescheduleTasks, setTaskStatus } from '@/lib/store/actions';
import { isTaskOverdue, searchTasks, sortByUrgency, taskStats, tasksForDate, tasksForWeek } from '@/lib/domain/tasks';
import { formatDate, relativeDayLabel, todayISO, weekRange } from '@/lib/date';
import { minutesToHuman } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

type View = 'today' | 'week' | 'all' | 'overdue';

const STATUS_TONE: Record<TaskStatus, 'neutral' | 'brand' | 'success'> = { todo: 'neutral', doing: 'brand', done: 'success' };

export function TasksPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [view, setView] = useState<View>('today');
  const [term, setTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [form, setForm] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [confirm, setConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rescheduleDate, setRescheduleDate] = useState(today);

  const stats = useMemo(() => taskStats(data.tasks, today), [data.tasks, today]);

  const visible = useMemo(() => {
    let list: Task[];
    if (view === 'today') list = tasksForDate(data.tasks, today);
    else if (view === 'week') list = tasksForWeek(data.tasks, today, settings.weekStartsOn);
    else if (view === 'overdue') list = data.tasks.filter((task) => isTaskOverdue(task, today));
    else list = data.tasks.filter((task) => !task.archived);

    list = searchTasks(list, term);
    if (statusFilter !== 'all') list = list.filter((task) => task.status === statusFilter);
    if (priorityFilter !== 'all') list = list.filter((task) => task.priority === priorityFilter);
    return sortByUrgency(list, today);
  }, [data.tasks, view, today, settings.weekStartsOn, term, statusFilter, priorityFilter]);

  const grouped = useMemo(() => {
    if (view !== 'week') return null;
    const days = weekRange(today, settings.weekStartsOn);
    return days
      .map((date) => ({ date, tasks: visible.filter((task) => task.dueDate === date) }))
      .filter((group) => group.tasks.length > 0);
  }, [view, visible, today, settings.weekStartsOn]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkReschedule() {
    const ids = [...selected];
    const ok = await rescheduleTasks(ids, rescheduleDate);
    if (ok) {
      toast.success('tasks.reschedule');
      setSelected(new Set());
    } else toast.error('errors.saveFailed');
  }

  async function bulkDelete() {
    const results = await Promise.all([...selected].map((id) => deleteTask(id)));
    setConfirm({ open: false, ids: [] });
    setSelected(new Set());
    if (results.every(Boolean)) toast.success('common.delete');
    else toast.error('errors.saveFailed');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('tasks.title')}
        subtitle={`${t('dashboard.tasks.remaining')}: ${stats.remaining} · ${t('dashboard.tasks.completed')}: ${stats.completed}${stats.overdue ? ` · ${t('dashboard.tasks.overdue')}: ${stats.overdue}` : ''}`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, task: null })}>
            {t('tasks.new')}
          </Button>
        }
      />

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            value={view}
            onChange={setView}
            ariaLabel={t('tasks.title')}
            options={[
              { value: 'today', label: t('tasks.view.today') },
              { value: 'week', label: t('tasks.view.week') },
              { value: 'all', label: t('tasks.view.all') },
              { value: 'overdue', label: `${t('tasks.view.overdue')} (${stats.overdue})` },
            ]}
          />
          <div className="relative min-w-40 flex-1">
            <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-[var(--text-muted)]">
              <Icon name="search" size={15} />
            </span>
            <input className="input ps-8" placeholder={t('tasks.searchPlaceholder')} value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label={t('tasks.filterStatus')}>
            <option value="all">{t('common.all')}</option>
            {(['todo', 'doing', 'done'] as const).map((s) => (
              <option key={s} value={s}>
                {t(`task.status.${s}`)}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as typeof priorityFilter)} aria-label={t('tasks.filterPriority')}>
            <option value="all">{t('common.priority')}</option>
            {(['urgent', 'high', 'medium', 'low'] as const).map((p) => (
              <option key={p} value={p}>
                {t(`priority.${p}`)}
              </option>
            ))}
          </select>
        </div>

        {selected.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2">
            <span className="text-xs font-semibold text-[var(--text)]">{t('tasks.selected', { count: selected.size })}</span>
            <input type="date" className="input w-auto" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} aria-label={t('tasks.reschedule.to')} />
            <Button size="sm" icon="clock" onClick={() => void bulkReschedule()}>
              {t('tasks.bulkReschedule')}
            </Button>
            <Button size="sm" variant="danger" icon="trash" onClick={() => setConfirm({ open: true, ids: [...selected] })}>
              {t('tasks.bulkDelete')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t('common.clear')}
            </Button>
          </div>
        ) : null}
      </Card>

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon="checkSquare"
            title={term || statusFilter !== 'all' || priorityFilter !== 'all' ? t('common.noResults') : t('tasks.empty')}
            description={t('tasks.subtitle')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, task: null })}>
                {t('tasks.new')}
              </Button>
            }
          />
        </Card>
      ) : grouped ? (
        <div className="space-y-3">
          {grouped.map((group) => (
            <Card key={group.date}>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
                <span className="text-xs font-bold text-[var(--text)]">{relativeDayLabel(group.date, today, lang)}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{formatDate(group.date, lang)}</span>
              </div>
              <ul>
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    today={today}
                    selected={selected.has(task.id)}
                    onSelect={() => toggleSelect(task.id)}
                    onEdit={() => setForm({ open: true, task })}
                    onDelete={() => setConfirm({ open: true, ids: [task.id] })}
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <ul>
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                selected={selected.has(task.id)}
                onSelect={() => toggleSelect(task.id)}
                onEdit={() => setForm({ open: true, task })}
                onDelete={() => setConfirm({ open: true, ids: [task.id] })}
              />
            ))}
          </ul>
        </Card>
      )}

      <TaskForm open={form.open} task={form.task} onClose={() => setForm({ open: false, task: null })} />
      <ConfirmDialog
        open={confirm.open}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm({ open: false, ids: [] })}
        onConfirm={() => void bulkDelete()}
      />
    </div>
  );
}

function TaskRow({
  task,
  today,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: {
  task: Task;
  today: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const overdue = isTaskOverdue(task, today);
  const goal = data.goals.find((g) => g.id === task.goalId);
  const project = data.projects.find((p) => p.id === task.projectId);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: TaskStatus) {
    setBusy(true);
    const ok = await setTaskStatus(task.id, status);
    setBusy(false);
    if (!ok) toast.error('errors.saveFailed');
  }

  return (
    <li className="flex items-start gap-3 border-b border-[var(--border)] px-3 py-3 last:border-b-0">
      <div className="pt-1">
        <Checkbox checked={selected} onChange={onSelect} />
      </div>
      <button
        type="button"
        onClick={() => void setStatus(task.status === 'done' ? 'todo' : 'done')}
        disabled={busy}
        aria-label={task.status === 'done' ? t('tasks.reopen') : t('tasks.complete')}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
          task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)] hover:border-brand-500'
        }`}
      >
        {task.status === 'done' ? <Icon name="check" size={12} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${task.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span>{t(`priority.${task.priority}`)}</span>
          {task.dueDate ? <span>· {relativeDayLabel(task.dueDate, today, lang)}</span> : <span>· {t('tasks.noDueDate')}</span>}
          {task.estimatedMinutes ? <span>· {minutesToHuman(task.estimatedMinutes, lang)}</span> : null}
          {goal ? <span>· {goal.title}</span> : null}
          {project ? <span>· {project.name}</span> : null}
          {task.category ? <span>· {task.category}</span> : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {overdue ? <Badge tone="danger">{t('tasks.overdueBadge')}</Badge> : null}
        {task.top3Date === today ? <Badge tone="brand">{t('tasks.top3')}</Badge> : null}
        <Badge tone={STATUS_TONE[task.status]}>{t(`task.status.${task.status}`)}</Badge>
        <DashboardTop3Toggle taskId={task.id} active={task.top3Date === today} />
        <button type="button" className="btn-ghost !px-1.5" onClick={onEdit} aria-label={t('common.edit')}>
          <Icon name="edit" size={15} />
        </button>
        <button type="button" className="btn-ghost !px-1.5 text-red-500" onClick={onDelete} aria-label={t('common.delete')}>
          <Icon name="trash" size={15} />
        </button>
      </div>
    </li>
  );
}
