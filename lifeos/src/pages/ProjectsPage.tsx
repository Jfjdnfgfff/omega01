import { useMemo, useState } from 'react';
import type { Project, Task, TaskStatus } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, SegmentedControl, StatCard } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { ProjectForm } from '@/components/forms/ProjectForm';
import { TaskForm } from '@/components/forms/TaskForm';
import { useData, useSettings } from '@/lib/store/store';
import { addProjectUpdate, deleteProject, setTaskStatus, updateProject } from '@/lib/store/actions';
import { kanbanBuckets, projectCapacityRisk, projectDaysLeft, projectProgress } from '@/lib/domain/projects';
import { formatDate, todayISO } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const COLUMNS: TaskStatus[] = ['todo', 'doing', 'done'];

export function ProjectsPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [form, setForm] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [taskForm, setTaskForm] = useState<{ open: boolean; projectId: string | null; task: Task | null }>({ open: false, projectId: null, task: null });
  const [confirm, setConfirm] = useState<Project | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updateDraft, setUpdateDraft] = useState('');
  const [kanbanProject, setKanbanProject] = useState<string>('all');
  const [dragging, setDragging] = useState<string | null>(null);

  const projects = useMemo(() => data.projects, [data.projects]);
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const atRiskCount = projects.filter((p) => projectCapacityRisk(p, data.tasks, today, settings.dailyFocusTargetMinutes || 240).atRisk).length;

  const kanbanTasks = useMemo(() => {
    const source = kanbanProject === 'all' ? data.tasks.filter((task) => !task.archived) : data.tasks.filter((task) => task.projectId === kanbanProject && !task.archived);
    return {
      todo: source.filter((task) => task.status === 'todo'),
      doing: source.filter((task) => task.status === 'doing'),
      done: source.filter((task) => task.status === 'done'),
    };
  }, [data.tasks, kanbanProject]);

  async function moveTo(taskId: string, status: TaskStatus) {
    const ok = await setTaskStatus(taskId, status);
    if (!ok) toast.error('errors.saveFailed');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('projects.title')}
        subtitle={t('projects.subtitle')}
        actions={
          <>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: 'list', label: t('projects.view.list'), icon: 'list' },
                { value: 'kanban', label: t('projects.view.kanban'), icon: 'board' },
              ]}
            />
            <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, project: null })}>
              {t('projects.new')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('common.total')} value={projects.length} icon="folder" />
        <StatCard label={t('project.status.active')} value={activeCount} icon="chart" tone="brand" />
        <StatCard label={t('projects.atRisk')} value={atRiskCount} icon="alert" tone={atRiskCount > 0 ? 'warning' : 'success'} />
      </div>

      {view === 'kanban' ? (
        <Card className="p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select className="input w-auto" value={kanbanProject} onChange={(e) => setKanbanProject(e.target.value)} aria-label={t('tasks.project')}>
              <option value="all">{t('common.all')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-muted)]">{t('projects.kanban.move')}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {COLUMNS.map((column) => (
              <div
                key={column}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragging) void moveTo(dragging, column);
                  setDragging(null);
                }}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-[var(--text)]">{t(`task.status.${column}`)}</span>
                  <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{kanbanTasks[column].length}</span>
                </div>
                <ul className="space-y-2">
                  {kanbanTasks[column].length === 0 ? (
                    <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center text-[11px] text-[var(--text-muted)]">—</li>
                  ) : (
                    kanbanTasks[column].map((task) => (
                      <li
                        key={task.id}
                        draggable
                        onDragStart={() => setDragging(task.id)}
                        className="cursor-grab rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-sm active:cursor-grabbing"
                      >
                        <p className="text-sm font-medium text-[var(--text)]">{task.title}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge tone="neutral">{t(`priority.${task.priority}`)}</Badge>
                          {task.dueDate ? <span className="text-[11px] text-[var(--text-muted)]">{formatDate(task.dueDate, lang)}</span> : null}
                          {task.projectId ? (
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projects.find((p) => p.id === task.projectId)?.color ?? '#94a3b8' }} />
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-1">
                          {COLUMNS.filter((c) => c !== column).map((target) => (
                            <button key={target} type="button" className="btn-ghost !px-1.5 !py-1 text-[11px]" onClick={() => void moveTo(task.id, target)}>
                              <Icon name="chevronEnd" size={11} />
                              {t(`task.status.${target}`)}
                            </button>
                          ))}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon="folder"
            title={t('projects.empty')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, project: null })}>
                {t('projects.new')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const progress = projectProgress(project.id, data.tasks);
            const buckets = kanbanBuckets(project.id, data.tasks);
            const risk = projectCapacityRisk(project, data.tasks, today, settings.dailyFocusTargetMinutes || 240);
            const daysLeft = projectDaysLeft(project, today);
            const isOpen = expanded === project.id;
            const goal = data.goals.find((g) => g.id === project.goalId);

            return (
              <Card key={project.id}>
                <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-[var(--text)]">{project.name}</h2>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {t(`project.status.${project.status}`)} · {t(`priority.${project.priority}`)}
                        {daysLeft !== null ? ` · ${daysLeft >= 0 ? t('projects.daysLeft', { days: daysLeft }) : t('projects.overdueBy', { days: Math.abs(daysLeft) })}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {risk.atRisk ? <Badge tone="warning">{t('projects.atRisk')}</Badge> : null}
                    <button type="button" className="btn-ghost !px-1.5" onClick={() => setForm({ open: true, project })} aria-label={t('common.edit')}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" className="btn-ghost !px-1.5 text-red-500" onClick={() => setConfirm(project)} aria-label={t('common.delete')}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  {project.description ? <p className="text-xs leading-relaxed text-[var(--text-muted)]">{project.description}</p> : null}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">
                        {t('projects.progress')} · {progress.done}/{progress.total}
                      </span>
                      <span className="font-bold tabular-nums text-[var(--text)]">{progress.percent}%</span>
                    </div>
                    <Progress value={progress.percent} tone={risk.atRisk ? 'warning' : progress.percent >= 100 ? 'success' : 'brand'} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="chip">{t('projects.kanban.todo')}: {buckets.todo.length}</span>
                    <span className="chip">{t('projects.kanban.doing')}: {buckets.doing.length}</span>
                    <span className="chip">{t('projects.kanban.done')}: {buckets.done.length}</span>
                    {goal ? <span className="chip">{t('projects.goal')}: {goal.title}</span> : null}
                  </div>

                  {risk.atRisk ? <p className="text-[11px] text-amber-600 dark:text-amber-400">{t('projects.capacityRisk')}</p> : null}

                  <button type="button" className="btn-ghost w-full justify-start text-xs" onClick={() => setExpanded(isOpen ? null : project.id)}>
                    <Icon name={isOpen ? 'chevronStart' : 'chevronEnd'} size={13} />
                    {isOpen ? t('common.showLess') : t('common.showMore')}
                  </button>

                  {isOpen ? (
                    <div className="space-y-3 border-t border-[var(--border)] pt-3">
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <p className="label !mb-0">{t('projects.tasks')}</p>
                          <Button size="sm" icon="plus" onClick={() => setTaskForm({ open: true, projectId: project.id, task: null })}>
                            {t('projects.addTask')}
                          </Button>
                        </div>
                        {buckets.todo.length + buckets.doing.length + buckets.done.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)]">{t('projects.noTasks')}</p>
                        ) : (
                          <ul className="space-y-1">
                            {[...buckets.doing, ...buckets.todo, ...buckets.done].map((task) => (
                              <li key={task.id} className="flex items-center gap-2 text-sm">
                                <button
                                  type="button"
                                  onClick={() => void setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
                                  className={`flex items-center justify-center rounded-full border ${task.status === 'done' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[var(--border)]'}`}
                                  style={{ height: 18, width: 18 }}
                                  aria-label={task.title}
                                >
                                  {task.status === 'done' ? <Icon name="check" size={10} /> : null}
                                </button>
                                <span className={`flex-1 truncate ${task.status === 'done' ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text)]'}`}>{task.title}</span>
                                <button type="button" className="btn-ghost !px-1" onClick={() => setTaskForm({ open: true, projectId: project.id, task })} aria-label={t('common.edit')}>
                                  <Icon name="edit" size={13} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div>
                        <p className="label">{t('common.notes')}</p>
                        <textarea
                          className="input"
                          rows={3}
                          value={project.notes}
                          placeholder={t('common.notes')}
                          onChange={(e) => void updateProject(project.id, { notes: e.target.value })}
                        />
                      </div>

                      <div>
                        <p className="label">{t('projects.updates')}</p>
                        <div className="flex gap-2">
                          <input
                            className="input !py-1.5 text-xs"
                            placeholder={t('projects.updates.add')}
                            value={updateDraft}
                            onChange={(e) => setUpdateDraft(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && updateDraft.trim()) {
                                await addProjectUpdate(project.id, updateDraft.trim());
                                setUpdateDraft('');
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            icon="plus"
                            disabled={!updateDraft.trim()}
                            onClick={async () => {
                              await addProjectUpdate(project.id, updateDraft.trim());
                              setUpdateDraft('');
                            }}
                          >
                            {t('common.add')}
                          </Button>
                        </div>
                        {project.updates.length === 0 ? (
                          <p className="mt-2 text-xs text-[var(--text-muted)]">{t('projects.updates.empty')}</p>
                        ) : (
                          <ul className="mt-2 space-y-1.5">
                            {project.updates.slice(0, 8).map((update) => (
                              <li key={update.id} className="flex items-start gap-2 text-xs">
                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                                <span className="flex-1 text-[var(--text)]">{update.text}</span>
                                <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{formatDate(update.createdAt.slice(0, 10), lang)}</span>
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

      <ProjectForm open={form.open} project={form.project} onClose={() => setForm({ open: false, project: null })} />
      <TaskForm
        open={taskForm.open}
        task={taskForm.task}
        defaults={{ projectId: taskForm.projectId }}
        onClose={() => setTaskForm({ open: false, projectId: null, task: null })}
      />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await deleteProject(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}
