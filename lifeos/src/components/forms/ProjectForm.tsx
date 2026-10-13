import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, SelectField, TextAreaField, TextField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { parseInput, projectInput, type FieldErrors } from '@/lib/validation';
import { createProject, updateProject } from '@/lib/store/actions';
import { useData } from '@/lib/store/store';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';
import { todayISO } from '@/lib/date';

const COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function ProjectForm({
  open,
  onClose,
  project,
  defaultGoalId,
}: {
  open: boolean;
  onClose: () => void;
  project?: Project | null;
  defaultGoalId?: string;
}) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [goalId, setGoalId] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Project['status']>('active');
  const [priority, setPriority] = useState<Project['priority']>('medium');
  const [color, setColor] = useState(COLORS[0]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setName(project?.name ?? '');
    setDescription(project?.description ?? '');
    setGoalId(project?.goalId ?? defaultGoalId ?? '');
    setStartDate(project?.startDate ?? todayISO());
    setEndDate(project?.endDate ?? '');
    setStatus(project?.status ?? 'active');
    setPriority(project?.priority ?? 'medium');
    setColor(project?.color ?? COLORS[0]);
    setErrors({});
  }, [open, project, defaultGoalId]);

  const goalOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.goals.filter((g) => g.status !== 'archived').map((g) => ({ value: g.id, label: g.title }))],
    [data.goals, t],
  );

  async function submit() {
    const parsed = parseInput(projectInput, {
      name,
      description,
      goalId: goalId || null,
      startDate: startDate || '',
      endDate: endDate || '',
      status,
      priority,
      color,
    });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const draft = {
      name: parsed.data.name,
      description: parsed.data.description,
      goalId: parsed.data.goalId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      status: parsed.data.status,
      priority: parsed.data.priority,
      color: parsed.data.color,
    };
    const ok = project ? await updateProject(project.id, draft) : (await createProject(draft, requestKey.current)) !== null;
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
      title={project ? t('projects.edit') : t('projects.new')}
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
          <DateField label={t('projects.startDate')} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <DateField label={`${t('projects.endDate')} (${t('common.optional')})`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('common.status')}
            value={status}
            onChange={(e) => setStatus(e.target.value as Project['status'])}
            options={['planning', 'active', 'paused', 'done'].map((s) => ({ value: s, label: t(`project.status.${s}`) }))}
          />
          <SelectField
            label={t('common.priority')}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Project['priority'])}
            options={['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: t(`priority.${p}`) }))}
          />
        </div>
        <SelectField label={t('projects.goal')} value={goalId} onChange={(e) => setGoalId(e.target.value)} options={goalOptions} />
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
