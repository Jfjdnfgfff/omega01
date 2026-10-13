import { useEffect, useMemo, useRef, useState } from 'react';
import type { Task } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, Field, NumberField, SelectField, TextAreaField, TextField, TimeField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { parseInput, taskInput, type FieldErrors } from '@/lib/validation';
import { createTask, updateTask, type TaskDraft } from '@/lib/store/actions';
import { useData } from '@/lib/store/store';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';
import { todayISO } from '@/lib/date';

export function TaskForm({
  open,
  onClose,
  task,
  defaults,
}: {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
  defaults?: Partial<TaskDraft>;
}) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [estimated, setEstimated] = useState('');
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  // القيم الافتراضية قد تُمرَّر ككائن جديد في كل رسم؛ نقرأها عبر مرجع
  // حتى لا يُعاد ضبط النموذج (وتدخل الحلقة) عند كل تحديث.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;

  useEffect(() => {
    if (!open) return;
    const preset = defaultsRef.current;
    requestKey.current = uid('req');
    setTitle(task?.title ?? '');
    setNotes(task?.notes ?? '');
    setDueDate(task?.dueDate ?? preset?.dueDate ?? todayISO());
    setDueTime(task?.dueTime ?? preset?.dueTime ?? '');
    setPriority(task?.priority ?? preset?.priority ?? 'medium');
    setEstimated(
      task?.estimatedMinutes != null
        ? String(task.estimatedMinutes)
        : preset?.estimatedMinutes != null
          ? String(preset.estimatedMinutes)
          : '',
    );
    setGoalId(task?.goalId ?? preset?.goalId ?? '');
    setProjectId(task?.projectId ?? preset?.projectId ?? '');
    setCategory(task?.category ?? preset?.category ?? '');
    setStatus(task?.status ?? preset?.status ?? 'todo');
    setErrors({});
  }, [open, task]);

  const goalOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.goals.filter((g) => g.status !== 'archived').map((g) => ({ value: g.id, label: g.title }))],
    [data.goals, t],
  );
  const projectOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))],
    [data.projects],
  );

  async function submit() {
    const parsed = parseInput(taskInput, {
      title,
      notes,
      dueDate: dueDate || '',
      dueTime: dueTime || '',
      priority,
      estimatedMinutes: estimated,
      goalId: goalId || null,
      projectId: projectId || null,
      category: category || null,
    });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    setBusy(true);
    const draft: TaskDraft = {
      ...parsed.data,
      status,
    };
    const ok = task ? await updateTask(task.id, draft) : (await createTask(draft, requestKey.current)) !== null;
    setBusy(false);
    if (ok) {
      toast.success(task ? 'common.save' : 'common.add');
      onClose();
    } else {
      toast.error('errors.saveFailed');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? t('tasks.edit') : t('tasks.new')}
      subtitle={t('tasks.estimateHint')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={busy} icon="check">
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <TextField
          label={t('common.title')}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title ? t(errors.title) : undefined}
          placeholder={t('tasks.new')}
        />

        <div className="grid grid-cols-2 gap-3">
          <DateField label={t('tasks.dueDate')} value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={errors.dueDate ? t(errors.dueDate) : undefined} />
          <TimeField label={`${t('tasks.dueTime')} (${t('common.optional')})`} value={dueTime} onChange={(e) => setDueTime(e.target.value)} error={errors.dueTime ? t(errors.dueTime) : undefined} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('common.priority')}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            options={['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: t(`priority.${p}`) }))}
          />
          <NumberField
            label={`${t('tasks.estimated')} (${t('common.minutes')})`}
            min={0}
            max={1440}
            value={estimated}
            onChange={(e) => setEstimated(e.target.value)}
            error={errors.estimatedMinutes ? t(errors.estimatedMinutes) : undefined}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label={t('tasks.goal')} value={goalId} onChange={(e) => setGoalId(e.target.value)} options={goalOptions} />
          <SelectField label={t('tasks.project')} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={`${t('tasks.category')} (${t('common.optional')})`} error={errors.category ? t(errors.category) : undefined}>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t('tasks.category')} />
          </Field>
          <SelectField
            label={t('tasks.status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as Task['status'])}
            options={['todo', 'doing', 'done'].map((s) => ({ value: s, label: t(`task.status.${s}`) }))}
          />
        </div>

        <TextAreaField label={`${t('common.notes')} (${t('common.optional')})`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
    </Modal>
  );
}
