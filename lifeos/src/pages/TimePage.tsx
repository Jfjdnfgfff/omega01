import { useMemo, useState } from 'react';
import type { TimeBlock } from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, SegmentedControl } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { BarChart, DonutChart } from '@/components/charts/Charts';
import { Pomodoro } from '@/components/time/Pomodoro';
import { ManualTimeLogForm, TimeBlockForm } from '@/components/forms/TimeForms';
import { useData, useSettings } from '@/lib/store/store';
import { createTimeBlock, deleteTimeBlock, deleteTimeLog } from '@/lib/store/actions';
import { blocksForDate, dayLoad, durationMinutes, findConflicts, isScheduleUnrealistic, timeBreakdown } from '@/lib/domain/time';
import { buildDailyPlan, type DailyPlan } from '@/lib/domain/coach';
import { addDays, formatDate, minutesToHuman, timeToMinutes, todayISO, weekRange } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 44;

export function TimePage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const [today, setToday] = useState(todayISO());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [blockForm, setBlockForm] = useState<{ open: boolean; block: TimeBlock | null; start?: string }>({ open: false, block: null });
  const [logForm, setLogForm] = useState(false);
  const [confirm, setConfirm] = useState<TimeBlock | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);

  const blocks = useMemo(() => blocksForDate(data.timeBlocks, today), [data.timeBlocks, today]);
  const conflicts = useMemo(() => findConflicts(blocks), [blocks]);
  const load = useMemo(() => dayLoad(blocks, settings.dailyFocusTargetMinutes || 480), [blocks, settings.dailyFocusTargetMinutes]);
  const realism = useMemo(() => isScheduleUnrealistic(blocks, { maxWorkMinutes: (settings.dailyFocusTargetMinutes || 480) + 120 }), [blocks, settings.dailyFocusTargetMinutes]);

  const breakdown = useMemo(
    () => timeBreakdown(data.timeLogs, addDays(today, -6), today, data.projects, data.tasks, 'project'),
    [data.timeLogs, data.projects, data.tasks, today],
  );
  const todayLogs = useMemo(() => data.timeLogs.filter((l) => l.date === today), [data.timeLogs, today]);

  const weekDays = useMemo(() => weekRange(today, settings.weekStartsOn), [today, settings.weekStartsOn]);

  async function applyPlan() {
    if (!plan) return;
    const results = await Promise.all(
      plan.steps.map((step) =>
        createTimeBlock({
          title: step.title,
          date: plan.date,
          start: step.start,
          end: step.end,
          kind: 'work',
          taskId: step.taskId,
        }),
      ),
    );
    const breaks = await Promise.all(
      plan.breaks.map((b) => createTimeBlock({ title: t('time.kind.break'), date: plan.date, start: b.start, end: b.end, kind: 'break' })),
    );
    if ([...results, ...breaks].every(Boolean)) {
      toast.success('coach.plan.applied', { count: results.length });
      setPlan(null);
    } else {
      toast.error('errors.saveFailed');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('time.title')}
        subtitle={t('time.subtitle')}
        actions={
          <>
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: 'day', label: t('time.day') },
                { value: 'week', label: t('time.week') },
              ]}
            />
            <Button icon="clock" onClick={() => setLogForm(true)}>
              {t('time.logTime')}
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setBlockForm({ open: true, block: null })}>
              {t('time.newBlock')}
            </Button>
          </>
        }
      />

      {realism.overloaded ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <Icon name="alert" size={14} />
          {t('time.overloaded')}
        </div>
      ) : blocks.length > 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Icon name="check" size={14} />
          {t('time.realistic')}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title={view === 'day' ? formatDate(today, lang, 'long') : `${formatDate(weekDays[0], lang)} — ${formatDate(weekDays[6], lang)}`}
              subtitle={`${t('time.planned')}: ${minutesToHuman(load.workMinutes, lang)} · ${t('time.capacity')}: ${minutesToHuman(settings.dailyFocusTargetMinutes || 480, lang)}`}
              icon="calendar"
              action={
                <div className="flex items-center gap-1">
                  <button type="button" className="btn-ghost !px-1.5" onClick={() => setToday(addDays(today, view === 'day' ? -1 : -7))} aria-label="prev">
                    <Icon name="chevronStart" size={16} />
                  </button>
                  <button type="button" className="btn-ghost text-xs" onClick={() => setToday(todayISO())}>
                    {t('common.today')}
                  </button>
                  <button type="button" className="btn-ghost !px-1.5" onClick={() => setToday(addDays(today, view === 'day' ? 1 : 7))} aria-label="next">
                    <Icon name="chevronEnd" size={16} />
                  </button>
                </div>
              }
            />

            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">{t('time.load')}</span>
                <div className="flex-1">
                  <Progress value={load.loadPercent} tone={load.overloaded ? 'warning' : 'brand'} />
                </div>
                <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">{load.loadPercent}%</span>
              </div>

              {conflicts.length > 0 ? (
                <ul className="mb-2 space-y-1">
                  {conflicts.map((c, i) => (
                    <li key={i} className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-700 dark:text-red-400">
                      {t('time.conflictDetail', { a: c.a.title, b: c.b.title, minutes: c.overlapMinutes })}
                    </li>
                  ))}
                </ul>
              ) : null}

              {view === 'day' ? (
                blocks.length === 0 ? (
                  <EmptyState
                    icon="clock"
                    title={t('time.empty')}
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button variant="primary" icon="plus" onClick={() => setBlockForm({ open: true, block: null })}>
                          {t('time.newBlock')}
                        </Button>
                        <Button icon="sparkles" onClick={() => setPlan(buildDailyPlan(data, settings, today))}>
                          {t('time.autoPlan')}
                        </Button>
                      </div>
                    }
                  />
                ) : (
                  <div className="relative rounded-lg border border-[var(--border)]" style={{ height: (HOUR_END - HOUR_START + 1) * HOUR_HEIGHT }}>
                    {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i).map((hour, index) => (
                      <div
                        key={hour}
                        className="absolute inset-x-0 flex items-start gap-2 border-b border-[var(--border)] px-2"
                        style={{ top: index * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                      >
                        <span className="w-9 shrink-0 pt-0.5 text-[10px] tabular-nums text-[var(--text-muted)]">{`${hour}:00`}</span>
                        <button
                          type="button"
                          className="flex-1 self-stretch text-start text-[10px] text-transparent hover:text-[var(--text-muted)]"
                          onClick={() => setBlockForm({ open: true, block: null, start: `${`${hour}`.padStart(2, '0')}:00` })}
                        >
                          +
                        </button>
                      </div>
                    ))}

                    {blocks.map((block) => {
                      const startMin = timeToMinutes(block.start);
                      const endMin = timeToMinutes(block.end);
                      const top = Math.max(0, ((startMin - HOUR_START * 60) / 60) * HOUR_HEIGHT);
                      const height = Math.max(22, ((endMin - startMin) / 60) * HOUR_HEIGHT - 3);
                      const isConflict = conflicts.some((c) => c.a.id === block.id || c.b.id === block.id);
                      const colors = { work: 'border-brand-500/40 bg-brand-500/10', break: 'border-emerald-500/40 bg-emerald-500/10', personal: 'border-violet-500/40 bg-violet-500/10' };
                      return (
                        <div
                          key={block.id}
                          className={`absolute start-11 end-2 overflow-hidden rounded-md border px-2 py-1 ${isConflict ? 'border-red-500 bg-red-500/15' : colors[block.kind]}`}
                          style={{ top: top + 1, height }}
                        >
                          <button type="button" className="block w-full text-start" onClick={() => setBlockForm({ open: true, block })}>
                            <p className="truncate text-xs font-semibold text-[var(--text)]">{block.title}</p>
                            <p className="text-[10px] tabular-nums text-[var(--text-muted)]">
                              {block.start}–{block.end} · {minutesToHuman(durationMinutes(block), lang)}
                            </p>
                          </button>
                          {height > 34 ? (
                            <button
                              type="button"
                              className="absolute end-1 top-1 text-[var(--text-muted)] hover:text-red-500"
                              onClick={() => setConfirm(block)}
                              aria-label={t('common.delete')}
                            >
                              <Icon name="trash" size={12} />
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {weekDays.map((date) => {
                    const dayBlocks = blocksForDate(data.timeBlocks, date);
                    const minutes = dayBlocks.filter((b) => b.kind !== 'break').reduce((s, b) => s + durationMinutes(b), 0);
                    const isToday = date === todayISO();
                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => {
                          setToday(date);
                          setView('day');
                        }}
                        className={`rounded-lg border p-2 text-start transition-colors ${isToday ? 'border-brand-500 bg-brand-500/10' : 'border-[var(--border)] hover:bg-[var(--surface-3)]'}`}
                      >
                        <p className="text-[11px] font-semibold text-[var(--text)]">{formatDate(date, lang, 'weekday')}</p>
                        <p className="text-[10px] tabular-nums text-[var(--text-muted)]">{formatDate(date, lang)}</p>
                        <p className="mt-1 text-xs font-bold tabular-nums text-[var(--text)]">{minutes > 0 ? minutesToHuman(minutes, lang) : '—'}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{dayBlocks.length}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          {plan ? (
            <Card>
              <CardHeader title={t('coach.plan.title')} subtitle={t('time.autoPlan.hint')} icon="sparkles" action={<Button size="sm" variant="ghost" onClick={() => setPlan(null)}>{t('common.close')}</Button>} />
              <div className="p-3">
                {plan.steps.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">{t('coach.plan.empty')}</p>
                ) : (
                  <>
                    <ul className="divide-y divide-[var(--border)]">
                      {plan.steps.map((step) => (
                        <li key={step.taskId} className="flex items-center gap-3 py-2">
                          <span className="w-24 shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                            {step.start}–{step.end}
                          </span>
                          <span className="flex-1 truncate text-sm text-[var(--text)]">{step.title}</span>
                          <Badge tone={step.reason === 'overdue' ? 'danger' : step.reason === 'priority' ? 'warning' : 'neutral'}>{t(`coach.reason.${step.reason}`)}</Badge>
                        </li>
                      ))}
                    </ul>
                    {plan.deferred > 0 ? <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">{t('coach.plan.deferred', { count: plan.deferred })}</p> : null}
                    <div className="mt-3 flex gap-2">
                      <Button variant="primary" icon="check" onClick={() => void applyPlan()}>
                        {t('time.autoPlan.apply')}
                      </Button>
                      <Button variant="ghost" onClick={() => setPlan(null)}>
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4">
          <Pomodoro />

          <Card>
            <CardHeader title={t('time.summary.project')} subtitle={t('time.last7')} icon="chart" />
            <div className="p-4">
              {breakdown.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">{t('time.summary.empty')}</p>
              ) : (
                <DonutChart
                  segments={breakdown.map((row) => ({
                    label: row.label === '__unassigned__' ? t('time.unassigned') : row.label,
                    value: row.minutes,
                    color: row.color,
                  }))}
                  centerValue={minutesToHuman(breakdown.reduce((s, r) => s + r.minutes, 0), lang)}
                  centerLabel={t('time.last7')}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('time.todayLogs')} icon="clock" action={<Button size="sm" icon="sparkles" onClick={() => setPlan(buildDailyPlan(data, settings, today))}>{t('time.autoPlan')}</Button>} />
            <div className="p-2">
              {todayLogs.length === 0 ? (
                <EmptyState icon="clock" title={t('time.summary.empty')} />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {todayLogs.map((log) => (
                    <li key={log.id} className="flex items-center gap-2 px-2 py-2">
                      <span className="flex-1 truncate text-sm text-[var(--text)]">{log.note || t(`time.pomodoro.${log.kind === 'focus' ? 'focus' : 'shortBreak'}`)}</span>
                      <Badge tone="neutral">{minutesToHuman(log.minutes, lang)}</Badge>
                      <button type="button" className="btn-ghost !px-1 text-red-500" onClick={() => void deleteTimeLog(log.id)} aria-label={t('common.delete')}>
                        <Icon name="trash" size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('time.last7')} icon="chart" />
            <div className="p-4">
              <BarChart
                data={weekDays.map((date) => ({
                  label: formatDate(date, lang, 'weekday'),
                  value: data.timeLogs.filter((l) => l.date === date && l.kind !== 'break').reduce((s, l) => s + l.minutes, 0),
                }))}
                rtl={lang === 'ar'}
                formatValue={(v) => minutesToHuman(v, lang)}
                color="#8b5cf6"
              />
            </div>
          </Card>
        </div>
      </div>

      <TimeBlockForm
        open={blockForm.open}
        block={blockForm.block}
        defaultDate={today}
        defaultStart={blockForm.start}
        onClose={() => setBlockForm({ open: false, block: null })}
      />
      <ManualTimeLogForm open={logForm} defaultDate={today} onClose={() => setLogForm(false)} />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await deleteTimeBlock(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}
