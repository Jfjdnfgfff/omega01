import { useEffect, useMemo, useRef, useState } from 'react';
import type { Goal } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, NumberField, SelectField, TextAreaField, TextField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { goalInput, parseInput, type FieldErrors } from '@/lib/validation';
import { createGoal, updateGoal, type GoalDraft } from '@/lib/store/actions';
import { useData } from '@/lib/store/store';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';

const HORIZONS: Goal['horizon'][] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

export function GoalForm({
  open,
  onClose,
  goal,
  defaultProjectId,
}: {
  open: boolean;
  onClose: () => void;
  goal?: Goal | null;
  defaultProjectId?: string;
}) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<Goal['priority']>('medium');
  const [horizon, setHorizon] = useState<Goal['horizon']>('monthly');
  const [projectId, setProjectId] = useState('');
  const [useMetric, setUseMetric] = useState(false);
  const [metricLabel, setMetricLabel] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [metricStart, setMetricStart] = useState('0');
  const [metricTarget, setMetricTarget] = useState('0');
  const [metricCurrent, setMetricCurrent] = useState('0');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setTitle(goal?.title ?? '');
    setDescription(goal?.description ?? '');
    setDeadline(goal?.deadline ?? '');
    setPriority(goal?.priority ?? 'medium');
    setHorizon(goal?.horizon ?? 'monthly');
    setProjectId(goal?.projectId ?? defaultProjectId ?? '');
    setUseMetric(!!goal?.metric);
    setMetricLabel(goal?.metric?.label ?? '');
    setMetricUnit(goal?.metric?.unit ?? '');
    setMetricStart(String(goal?.metric?.startValue ?? 0));
    setMetricTarget(String(goal?.metric?.targetValue ?? 0));
    setMetricCurrent(String(goal?.metric?.currentValue ?? 0));
    setErrors({});
  }, [open, goal, defaultProjectId]);

  const projectOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))],
    [data.projects],
  );

  async function submit() {
    const parsed = parseInput(goalInput, {
      title,
      description,
      deadline: deadline || '',
      priority,
      horizon,
      projectId: projectId || null,
      metricLabel,
      metricUnit,
      metricStart: Number(metricStart || 0),
      metricTarget: Number(metricTarget || 0),
      metricCurrent: Number(metricCurrent || 0),
    });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    const value = parsed.data;
    const metric =
      useMetric && (metricLabel.trim() || Number(metricTarget) !== 0)
        ? {
            label: metricLabel.trim() || t('goals.metric'),
            unit: metricUnit.trim(),
            startValue: value.metricStart,
            targetValue: value.metricTarget,
            currentValue: value.metricCurrent,
          }
        : null;

    setBusy(true);
    const draft: GoalDraft = {
      title: value.title,
      description: value.description,
      deadline: value.deadline,
      priority: value.priority,
      horizon: value.horizon,
      projectId: value.projectId,
      metric,
    };
    const ok = goal ? await updateGoal(goal.id, draft) : (await createGoal(draft, requestKey.current)) !== null;
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
      title={goal ? t('goals.edit') : t('goals.new')}
      subtitle={t('goals.subtitle')}
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
        <TextAreaField label={`${t('common.description')} (${t('common.optional')})`} value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="grid grid-cols-2 gap-3">
          <DateField label={`${t('goals.deadline')} (${t('common.optional')})`} value={deadline} onChange={(e) => setDeadline(e.target.value)} error={errors.deadline ? t(errors.deadline) : undefined} />
          <SelectField
            label={t('common.priority')}
            value={priority}
            onChange={(e) => setPriority(e.target.value as Goal['priority'])}
            options={['low', 'medium', 'high', 'urgent'].map((p) => ({ value: p, label: t(`priority.${p}`) }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label={t('goals.horizon')}
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as Goal['horizon'])}
            options={HORIZONS.map((h) => ({ value: h, label: t(`goals.horizon.${h}`) }))}
          />
          <SelectField label={`${t('goals.linkedProject')} (${t('common.optional')})`} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text)]">
          <input type="checkbox" checked={useMetric} onChange={(e) => setUseMetric(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          {t('goals.metric')}
        </label>

        {useMetric ? (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 sm:grid-cols-3">
            <TextField label={t('goals.metric.label')} value={metricLabel} onChange={(e) => setMetricLabel(e.target.value)} />
            <TextField label={t('goals.metric.unit')} value={metricUnit} onChange={(e) => setMetricUnit(e.target.value)} />
            <div />
            <NumberField label={t('goals.metric.start')} value={metricStart} onChange={(e) => setMetricStart(e.target.value)} />
            <NumberField label={t('goals.metric.current')} value={metricCurrent} onChange={(e) => setMetricCurrent(e.target.value)} />
            <NumberField label={t('goals.metric.target')} value={metricTarget} onChange={(e) => setMetricTarget(e.target.value)} />
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
