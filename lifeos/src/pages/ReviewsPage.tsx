import { useEffect, useMemo, useState } from 'react';
import type { Review, ReviewType } from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, SegmentedControl, StatCard } from '@/components/ui/primitives';
import { TextAreaField } from '@/components/ui/fields';
import { BarChart } from '@/components/charts/Charts';
import { useData, useSettings } from '@/lib/store/store';
import { saveReview } from '@/lib/store/actions';
import { buildReviewStats, buildWeeklySummary, DAILY_QUESTION_KEYS, periodKeyFor, recurringObstacles, suggestNextWeekPriorities, WEEKLY_QUESTION_KEYS } from '@/lib/domain/reviews';
import { addDays, formatDate, minutesToHuman, startOfISOWeek, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

export function ReviewsPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();

  const [type, setType] = useState<ReviewType>('daily');
  const [date, setDate] = useState(todayISO());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const periodKey = periodKeyFor(type, date);
  const existing = useMemo(
    () => data.reviews.find((review) => review.type === type && review.periodKey === periodKey) ?? null,
    [data.reviews, type, periodKey],
  );

  useEffect(() => {
    setAnswers(existing?.answers ?? {});
  }, [existing, type, date]);

  const stats = useMemo(() => buildReviewStats(data, type, date, settings.weekStartsOn), [data, type, date, settings.weekStartsOn]);
  const weekly = useMemo(() => buildWeeklySummary(data, date, settings.weekStartsOn), [data, date, settings.weekStartsOn]);
  const obstacles = useMemo(() => recurringObstacles(data, todayISO()), [data]);
  const suggestions = useMemo(() => suggestNextWeekPriorities(data, todayISO()), [data]);

  const questionKeys = type === 'daily' ? DAILY_QUESTION_KEYS : WEEKLY_QUESTION_KEYS;
  const history = useMemo(
    () =>
      data.reviews
        .filter((review) => review.type === type)
        .sort((a, b) => b.periodKey.localeCompare(a.periodKey))
        .slice(0, 12),
    [data.reviews, type],
  );

  async function submit() {
    setBusy(true);
    const ok = await saveReview(type, date, answers);
    setBusy(false);
    if (ok) toast.success('reviews.saved');
    else toast.error('errors.saveFailed');
  }

  const weekStart = startOfISOWeek(weekly.periodKey);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('reviews.title')}
        subtitle={t('reviews.subtitle')}
        actions={
          <>
            <SegmentedControl
              value={type}
              onChange={(value) => {
                setType(value);
                setAnswers({});
              }}
              options={[
                { value: 'daily', label: t('reviews.daily') },
                { value: 'weekly', label: t('reviews.weekly') },
              ]}
            />
            <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value || todayISO())} aria-label={t('reviews.date')} />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('reviews.stats.tasks')}
          value={`${stats.tasksCompleted}/${stats.tasksPlanned}`}
          icon="checkSquare"
          tone={stats.tasksPlanned > 0 && stats.tasksCompleted >= stats.tasksPlanned ? 'success' : 'brand'}
        />
        <StatCard label={t('reviews.stats.focus')} value={minutesToHuman(stats.focusMinutes, lang)} icon="clock" />
        <StatCard label={t('reviews.stats.habits')} value={`${stats.habitAdherence}%`} icon="flame" tone={stats.habitAdherence >= 70 ? 'success' : 'warning'} />
        <StatCard label={t('reviews.stats.goals')} value={`${stats.goalsProgress}%`} icon="target" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader
              title={type === 'daily' ? t('reviews.daily') : t('reviews.weekly')}
              subtitle={type === 'daily' ? formatDate(date, lang, 'long') : `${formatDate(weekStart, lang)} — ${formatDate(addDays(weekStart, 6), lang)}`}
              icon="review"
              action={existing ? <Badge tone="success">{t('reviews.existing')}</Badge> : null}
            />
            <div className="space-y-3 p-4">
              {questionKeys.map((key) => (
                <TextAreaField
                  key={key}
                  label={t(`reviews.q.${key}`)}
                  rows={2}
                  value={answers[key] ?? ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="primary" icon="check" loading={busy} onClick={() => void submit()}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          </Card>

          {type === 'weekly' ? (
            <>
              <Card>
                <CardHeader title={t('reviews.weekly.plannedVsDone')} icon="chart" />
                <div className="p-4">
                  <Progress value={stats.tasksPlanned ? Math.round((stats.tasksCompleted / stats.tasksPlanned) * 100) : 0} showLabel />
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    {stats.tasksCompleted} / {stats.tasksPlanned}
                  </p>
                  <div className="mt-4">
                    <p className="label">{t('reviews.weekly.timePerDay')}</p>
                    <BarChart
                      data={weekly.timePerDay.map((day) => ({ label: formatDate(day.date, lang, 'weekday'), value: day.minutes }))}
                      rtl={lang === 'ar'}
                      formatValue={(v) => minutesToHuman(v, lang)}
                    />
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title={t('reviews.weekly.obstacles')} subtitle={t('coach.dataDisclaimer')} icon="alert" />
                <div className="p-4">
                  {obstacles.length === 0 ? (
                    <p className="text-sm text-[var(--text-muted)]">{t('reviews.noDataYet')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {obstacles.map((item) => (
                        <li key={item.key} className="flex items-center justify-between text-sm">
                          <span className="text-[var(--text)]">{t(`reviews.obstacle.${item.key}`, { value: item.value })}</span>
                          <span className="tabular-nums font-semibold text-[var(--text-muted)]">{item.value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            </>
          ) : null}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('reviews.weekly.suggestions')} icon="sparkles" />
            <div className="p-3">
              {suggestions.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">{t('reviews.noDataYet')}</p>
              ) : (
                <ul className="space-y-2">
                  {suggestions.map((s) => {
                    const task = data.tasks.find((item) => item.id === s.taskId);
                    if (!task) return null;
                    return (
                      <li key={s.taskId} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-[var(--text)]">{task.title}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{t(`reviews.weekly.suggestion.${s.reason}`)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          {settings.privacy.showFinanceOnDashboard ? (
            <Card>
              <CardHeader title={t('reviews.stats.money')} icon="wallet" />
              <div className="space-y-1.5 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">{t('finance.income')}</span>
                  <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{formatMoney(stats.income, settings.currency, lang)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">{t('finance.expenses')}</span>
                  <span className="tabular-nums font-semibold text-red-600 dark:text-red-400">{formatMoney(stats.expenses, settings.currency, lang)}</span>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
            <CardHeader title={t('reviews.history')} icon="list" />
            <div className="p-2">
              {history.length === 0 ? (
                <EmptyState icon="review" title={t('reviews.history.empty')} />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {history.map((review: Review) => (
                    <li key={review.id}>
                      <button
                        type="button"
                        className="w-full px-2 py-2 text-start"
                        onClick={() => {
                          setType(review.type);
                          setDate(review.type === 'daily' ? review.periodKey : startOfISOWeek(review.periodKey));
                        }}
                      >
                        <p className="text-sm font-medium text-[var(--text)]">
                          {review.type === 'daily' ? formatDate(review.periodKey, lang) : review.periodKey}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {review.stats.tasksCompleted}/{review.stats.tasksPlanned} · {minutesToHuman(review.stats.focusMinutes, lang)} · {review.stats.habitAdherence}%
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
