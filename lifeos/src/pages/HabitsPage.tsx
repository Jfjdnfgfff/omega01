import { useMemo, useState } from 'react';
import type { Habit } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader, Progress, StatCard } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { MonthGrid } from '@/components/charts/Charts';
import { HabitForm } from '@/components/forms/HabitForm';
import { useData, useSettings } from '@/lib/store/store';
import { deleteHabit, incrementHabitLog, toggleHabitLog } from '@/lib/store/actions';
import { habitCalendar, habitMetOn, habitMonthSummary, habitNeedsAttention, habitStreaks, habitWeekSummary, habitsOverview } from '@/lib/domain/habits';
import { monthKey, todayISO, weekdayIndex } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

export function HabitsPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();
  const month = monthKey(today);

  const [form, setForm] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
  const [confirm, setConfirm] = useState<Habit | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const overview = useMemo(
    () => habitsOverview(data.habits, data.habitLogs, today, settings.weekStartsOn),
    [data.habits, data.habitLogs, today, settings.weekStartsOn],
  );
  const habits = useMemo(() => data.habits.filter((h) => !h.archived), [data.habits]);

  const weekdayLabels = [0, 1, 2, 3, 4, 5, 6].map((i) => t(`weekday.${i}`));

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('habits.title')}
        subtitle={t('habits.subtitle')}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, habit: null })}>
            {t('habits.new')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('habits.today')} value={`${overview.doneToday}/${overview.total}`} icon="check" tone={overview.percentToday >= 100 ? 'success' : 'brand'} />
        <StatCard label={t('habits.streak.best')} value={overview.currentStreak} icon="flame" tone="warning" hint={t('habits.streak.current')} />
        <StatCard label={t('habits.needsAttention')} value={overview.needsAttention} icon="alert" tone={overview.needsAttention > 0 ? 'danger' : 'success'} />
        <StatCard label={t('habits.overview')} value={`${overview.percentToday}%`} icon="chart" />
      </div>

      {habits.length === 0 ? (
        <Card>
          <EmptyState
            icon="repeat"
            title={t('habits.empty')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, habit: null })}>
                {t('habits.new')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const streaks = habitStreaks(habit, data.habitLogs, today);
            const week = habitWeekSummary(habit, data.habitLogs, today, settings.weekStartsOn);
            const monthly = habitMonthSummary(habit, data.habitLogs, month);
            const attention = habitNeedsAttention(habit, data.habitLogs, today, settings.weekStartsOn);
            const doneToday = habitMetOn(data.habitLogs, habit, today);
            const isOpen = expanded === habit.id;
            const calendar = isOpen
              ? habitCalendar(habit, data.habitLogs, month).map((day) => {
                  const offset = (weekdayIndex(`${month}-01`) - settings.weekStartsOn + 7) % 7;
                  return {
                    date: day.date,
                    day: Number(day.date.slice(8, 10)),
                    state: day.future ? 'future' : day.met ? 'met' : day.count > 0 ? 'pending' : 'missed',
                    offset,
                  };
                })
              : [];
            const leading = calendar.length ? calendar[0].offset : 0;

            return (
              <Card key={habit.id}>
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => void toggleHabitLog(habit.id, today)}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                      doneToday ? 'border-transparent text-white' : 'border-[var(--border)] text-transparent hover:border-brand-500'
                    }`}
                    style={doneToday ? { backgroundColor: habit.color } : undefined}
                    aria-label={doneToday ? t('habits.undo') : t('habits.markDone')}
                  >
                    <Icon name="check" size={20} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h2 className="truncate text-sm font-bold text-[var(--text)]">{habit.name}</h2>
                      {attention ? <Badge tone="warning">{t('habits.needsAttention')}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {habit.cadence === 'daily' ? t('habits.targetCountDaily') : t('habits.targetCountWeekly')} · {habit.targetCount} ·{' '}
                      {t('habits.streak.current')}: {streaks.current} · {t('habits.streak.best')}: {streaks.best}
                    </p>
                    {habit.description ? <p className="mt-1 text-xs text-[var(--text-muted)]">{habit.description}</p> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="w-24 text-center">
                      <p className="text-xs text-[var(--text-muted)]">{t('habits.week')}</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--text)]">{week.percent}%</p>
                    </div>
                    <div className="w-24 text-center">
                      <p className="text-xs text-[var(--text-muted)]">{t('habits.month')}</p>
                      <p className="text-sm font-bold tabular-nums text-[var(--text)]">{monthly.percent}%</p>
                    </div>
                    {habit.repsPerDay > 1 ? (
                      <Button size="sm" icon="plus" onClick={() => void incrementHabitLog(habit.id, today, habit.repsPerDay)}>
                        {t('habits.increment')}
                      </Button>
                    ) : null}
                    <button type="button" className="btn-ghost !px-1.5" onClick={() => setForm({ open: true, habit })} aria-label={t('common.edit')}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" className="btn-ghost !px-1.5 text-red-500" onClick={() => setConfirm(habit)} aria-label={t('common.delete')}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>

                <div className="border-t border-[var(--border)] px-4 py-3">
                  <Progress value={week.percent} tone={week.percent >= 100 ? 'success' : 'brand'} showLabel />
                  <button type="button" className="btn-ghost mt-2 w-full justify-start text-xs" onClick={() => setExpanded(isOpen ? null : habit.id)}>
                    <Icon name="calendar" size={13} />
                    {t('habits.calendar')} — {month}
                  </button>
                  {isOpen ? (
                    <div className="mt-3">
                      <MonthGrid
                        days={[
                          ...Array.from({ length: leading }, (_, i) => ({ date: `pad-${i}`, day: 0, state: 'future' as const })),
                          ...calendar.map(({ date, day, state }) => ({ date, day, state: state as 'met' | 'missed' | 'future' | 'pending' })),
                        ]}
                        weekdayLabels={weekdayLabels}
                        firstWeekday={settings.weekStartsOn}
                        rtl={lang === 'ar'}
                        onSelect={(date) => {
                          if (!date.startsWith('pad')) void toggleHabitLog(habit.id, date);
                        }}
                      />
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                        {t('habits.loggedToday', { count: overview.doneToday, total: overview.total })}
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <HabitForm open={form.open} habit={form.habit} onClose={() => setForm({ open: false, habit: null })} />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await deleteHabit(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}
