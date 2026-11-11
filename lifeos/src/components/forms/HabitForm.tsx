import { useEffect, useRef, useState } from 'react';
import type { Habit } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, NumberField, SelectField, TextAreaField, TextField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { habitInput, parseInput, type FieldErrors } from '@/lib/validation';
import { createHabit, updateHabit } from '@/lib/store/actions';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';
import { todayISO } from '@/lib/date';

const COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function HabitForm({ open, onClose, habit }: { open: boolean; onClose: () => void; habit?: Habit | null }) {
  const t = useT();
  const requestKey = useRef(uid('req'));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cadence, setCadence] = useState<Habit['cadence']>('daily');
  const [targetCount, setTargetCount] = useState('1');
  const [repsPerDay, setRepsPerDay] = useState('1');
  const [color, setColor] = useState(COLORS[0]);
  const [startDate, setStartDate] = useState(todayISO());
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setName(habit?.name ?? '');
    setDescription(habit?.description ?? '');
    setCadence(habit?.cadence ?? 'daily');
    setTargetCount(String(habit?.targetCount ?? 1));
    setRepsPerDay(String(habit?.repsPerDay ?? 1));
    setColor(habit?.color ?? COLORS[0]);
    setStartDate(habit?.startDate ?? todayISO());
    setErrors({});
  }, [open, habit]);

  async function submit() {
    const parsed = parseInput(habitInput, {
      name,
      description,
      cadence,
      targetCount: Number(targetCount),
      repsPerDay: Number(repsPerDay),
      color,
      startDate: startDate || todayISO(),
    });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const draft = {
      name: parsed.data.name,
      description: parsed.data.description,
      cadence: parsed.data.cadence,
      targetCount: parsed.data.targetCount,
      repsPerDay: parsed.data.repsPerDay,
      color: parsed.data.color,
      startDate: parsed.data.startDate ?? todayISO(),
    };
    const ok = habit ? await updateHabit(habit.id, draft) : (await createHabit(draft, requestKey.current)) !== null;
    setBusy(false);
    if (ok) {
      toast.success('common.save');
      onClose();
    } else {
      toast.error('errors.saveFailed');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? t('habits.edit') : t('habits.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" icon="check" loading={busy} onClick={() => void submit()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <TextField label={t('common.title')} required value={name} onChange={(e) => setName(e.target.value)} error={errors.name ? t(errors.name) : undefined} />
        <TextAreaField label={`${t('common.description')} (${t('common.optional')})`} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('habits.cadence')}
            value={cadence}
            onChange={(e) => setCadence(e.target.value as Habit['cadence'])}
            options={[
              { value: 'daily', label: t('habits.cadence.daily') },
              { value: 'weekly', label: t('habits.cadence.weekly') },
            ]}
          />
          <NumberField
            label={cadence === 'daily' ? t('habits.targetCountDaily') : t('habits.targetCountWeekly')}
            min={1}
            max={30}
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
            error={errors.targetCount ? t(errors.targetCount) : undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label={t('habits.reps')}
            min={1}
            max={50}
            value={repsPerDay}
            onChange={(e) => setRepsPerDay(e.target.value)}
            error={errors.repsPerDay ? t(errors.repsPerDay) : undefined}
          />
          <DateField label={t('common.date')} value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate ? t(errors.startDate) : undefined} />
        </div>

        <div>
          <p className="label">{t('settings.avatar')}</p>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-[var(--text)] scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
