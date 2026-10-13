import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, CardHeader } from '@/components/ui/primitives';
import { SelectField } from '@/components/ui/fields';
import { Icon } from '@/components/ui/Icon';
import { useData, useSettings } from '@/lib/store/store';
import { addTimeLog } from '@/lib/store/actions';
import { formatMinutes, todayISO } from '@/lib/date';
import { useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

type Mode = 'focus' | 'shortBreak' | 'longBreak';

/**
 * مؤقت تركيز (Pomodoro) قابل للتشغيل والإيقاف وإعادة الضبط.
 * عند انتهاء جلسة التركيز يُسجَّل الوقت الفعلي تلقائيًا.
 */
export function Pomodoro() {
  const t = useT();
  const data = useData();
  const settings = useSettings();

  const durations = useMemo<Record<Mode, number>>(
    () => ({
      focus: settings.pomodoro.focusMinutes * 60,
      shortBreak: settings.pomodoro.shortBreakMinutes * 60,
      longBreak: settings.pomodoro.longBreakMinutes * 60,
    }),
    [settings.pomodoro],
  );

  const [mode, setMode] = useState<Mode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(durations.focus);
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(1);
  const [taskId, setTaskId] = useState('');
  const endsAt = useRef<number | null>(null);

  useEffect(() => {
    setSecondsLeft(durations[mode]);
    setRunning(false);
    endsAt.current = null;
  }, [durations, mode]);

  useEffect(() => {
    if (!running) return;
    endsAt.current = Date.now() + secondsLeft * 1000;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.round(((endsAt.current ?? Date.now()) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(interval);
        setRunning(false);
        void complete();
      }
    }, 250);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  async function complete() {
    if (mode === 'focus') {
      const minutes = settings.pomodoro.focusMinutes;
      const task = data.tasks.find((task) => task.id === taskId) ?? null;
      const ok = await addTimeLog({
        date: todayISO(),
        minutes,
        kind: 'focus',
        taskId: task?.id ?? null,
        projectId: task?.projectId ?? null,
        category: task?.category ?? null,
        source: 'pomodoro',
        note: task ? task.title : '',
      });
      if (ok) toast.success('time.pomodoro.saved', { minutes });
      else toast.error('errors.saveFailed');
      const nextRound = round + 1;
      setRound(nextRound);
      setMode(nextRound % 4 === 0 ? 'longBreak' : 'shortBreak');
    } else {
      setMode('focus');
    }
  }

  const taskOptions = useMemo(
    () => [
      { value: '', label: t('common.none') },
      ...data.tasks.filter((task) => task.status !== 'done' && !task.archived).map((task) => ({ value: task.id, label: task.title })),
    ],
    [data.tasks, t],
  );

  const total = durations[mode];
  const percent = total > 0 ? ((total - secondsLeft) / total) * 100 : 0;

  return (
    <Card>
      <CardHeader title={t('time.pomodoro')} subtitle={`${t('time.pomodoro.round', { n: round })}`} icon="clock" />
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-center">
          <div className="relative flex h-36 w-36 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--surface-3)" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={mode === 'focus' ? '#2563eb' : '#10b981'}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(percent / 100) * 276.46} 276.46`}
              />
            </svg>
            <div className="text-center">
              <p className="text-3xl font-extrabold tabular-nums text-[var(--text)]">{formatMinutes(secondsLeft)}</p>
              <p className="text-[11px] text-[var(--text-muted)]">{t(`time.pomodoro.${mode}`)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-1">
          {(['focus', 'shortBreak', 'longBreak'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={m === mode ? 'chip-active' : 'chip'}
            >
              {t(`time.pomodoro.${m}`)}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          <Button variant={running ? 'secondary' : 'primary'} icon={running ? 'pause' : 'play'} onClick={() => setRunning((r) => !r)}>
            {running ? t('common.pause') : secondsLeft < total ? t('common.resume') : t('common.start')}
          </Button>
          <Button
            icon="reset"
            onClick={() => {
              setRunning(false);
              setSecondsLeft(total);
            }}
          >
            {t('common.reset')}
          </Button>
        </div>

        <SelectField label={t('time.pomodoro.linkTask')} value={taskId} onChange={(e) => setTaskId(e.target.value)} options={taskOptions} />

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <Icon name="alert" size={12} />
          {t('time.pomodoro.save')}
        </p>
      </div>
    </Card>
  );
}
