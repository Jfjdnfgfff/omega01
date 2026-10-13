import { useEffect, useMemo, useRef, useState } from 'react';
import type { TimeBlock } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, NumberField, SelectField, TextAreaField, TextField, TimeField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { manualTimeLogInput, parseInput, timeBlockInput, type FieldErrors } from '@/lib/validation';
import { addTimeLog, createTimeBlock, updateTimeBlock } from '@/lib/store/actions';
import { useData } from '@/lib/store/store';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';
import { minutesToTime, timeToMinutes, todayISO } from '@/lib/date';

export function TimeBlockForm({
  open,
  onClose,
  block,
  defaultDate,
  defaultStart,
}: {
  open: boolean;
  onClose: () => void;
  block?: TimeBlock | null;
  defaultDate?: string;
  defaultStart?: string;
}) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [kind, setKind] = useState<TimeBlock['kind']>('work');
  const [taskId, setTaskId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setTitle(block?.title ?? '');
    setDate(block?.date ?? defaultDate ?? todayISO());
    setStart(block?.start ?? defaultStart ?? '09:00');
    setEnd(block?.end ?? minutesToTime(timeToMinutes(defaultStart ?? '09:00') + 60));
    setKind(block?.kind ?? 'work');
    setTaskId(block?.taskId ?? '');
    setProjectId(block?.projectId ?? '');
    setNotes(block?.notes ?? '');
    setErrors({});
  }, [open, block, defaultDate, defaultStart]);

  const taskOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.tasks.filter((task) => !task.archived).map((task) => ({ value: task.id, label: task.title }))],
    [data.tasks, t],
  );
  const projectOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))],
    [data.projects],
  );

  async function submit() {
    const parsed = parseInput(timeBlockInput, { title, date, start, end, kind, taskId: taskId || null, projectId: projectId || null, notes });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const ok = block
      ? await updateTimeBlock(block.id, { ...parsed.data, date: parsed.data.date ?? date })
      : (await createTimeBlock({ ...parsed.data, date: parsed.data.date ?? date }, requestKey.current)) !== null;
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
      title={block ? t('time.editBlock') : t('time.newBlock')}
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
        <TextField label={t('common.title')} required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title ? t(errors.title) : undefined} />
        <div className="grid grid-cols-3 gap-3">
          <DateField label={t('common.date')} value={date} onChange={(e) => setDate(e.target.value)} error={errors.date ? t(errors.date) : undefined} />
          <TimeField label={t('time.start')} value={start} onChange={(e) => setStart(e.target.value)} error={errors.start ? t(errors.start) : undefined} />
          <TimeField label={t('time.end')} value={end} onChange={(e) => setEnd(e.target.value)} error={errors.end ? t(errors.end) : undefined} />
        </div>
        <SelectField
          label={t('time.kind')}
          value={kind}
          onChange={(e) => setKind(e.target.value as TimeBlock['kind'])}
          options={['work', 'break', 'personal'].map((k) => ({ value: k, label: t(`time.kind.${k}`) }))}
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label={t('tasks.title')} value={taskId} onChange={(e) => setTaskId(e.target.value)} options={taskOptions} />
          <SelectField label={t('tasks.project')} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />
        </div>
        <TextAreaField label={`${t('common.notes')} (${t('common.optional')})`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}

export function ManualTimeLogForm({ open, onClose, defaultDate }: { open: boolean; onClose: () => void; defaultDate?: string }) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [date, setDate] = useState(todayISO());
  const [minutes, setMinutes] = useState('30');
  const [kind, setKind] = useState<'focus' | 'work' | 'break'>('focus');
  const [taskId, setTaskId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setDate(defaultDate ?? todayISO());
    setMinutes('30');
    setKind('focus');
    setTaskId('');
    setCategory('');
    setNote('');
    setErrors({});
  }, [open, defaultDate]);

  const taskOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.tasks.filter((task) => !task.archived).map((task) => ({ value: task.id, label: task.title }))],
    [data.tasks, t],
  );

  async function submit() {
    const parsed = parseInput(manualTimeLogInput, { date, minutes: Number(minutes), kind, taskId: taskId || null, category: category || null, note });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const ok = (await addTimeLog({ ...parsed.data, source: 'manual', date: parsed.data.date ?? date }, requestKey.current)) !== null;
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
      title={t('time.logTime')}
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
        <div className="grid grid-cols-2 gap-3">
          <DateField label={t('common.date')} value={date} onChange={(e) => setDate(e.target.value)} />
          <NumberField label={t('time.minutes')} min={1} max={960} value={minutes} onChange={(e) => setMinutes(e.target.value)} error={errors.minutes ? t(errors.minutes) : undefined} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('time.kind')}
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            options={[
              { value: 'focus', label: t('time.pomodoro.focus') },
              { value: 'work', label: t('time.kind.work') },
              { value: 'break', label: t('time.kind.break') },
            ]}
          />
          <SelectField label={t('tasks.title')} value={taskId} onChange={(e) => setTaskId(e.target.value)} options={taskOptions} />
        </div>
        <TextField label={`${t('tasks.category')} (${t('common.optional')})`} value={category} onChange={(e) => setCategory(e.target.value)} />
        <TextAreaField label={`${t('common.notes')} (${t('common.optional')})`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
    </Modal>
  );
}
