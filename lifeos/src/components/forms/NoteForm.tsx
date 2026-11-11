import { useEffect, useMemo, useRef, useState } from 'react';
import type { Note } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { SelectField, TextAreaField, TextField } from '@/components/ui/fields';
import { useT } from '@/i18n';
import { noteInput, parseInput, type FieldErrors } from '@/lib/validation';
import { createNote, updateNote } from '@/lib/store/actions';
import { useData } from '@/lib/store/store';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';

const KINDS: Note['kind'][] = ['idea', 'daily', 'lesson', 'decision', 'project'];

export function NoteForm({
  open,
  onClose,
  note,
  defaultKind = 'idea',
  defaultTitle = '',
}: {
  open: boolean;
  onClose: () => void;
  note?: Note | null;
  defaultKind?: Note['kind'];
  defaultTitle?: string;
}) {
  const t = useT();
  const data = useData();
  const requestKey = useRef(uid('req'));

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [kind, setKind] = useState<Note['kind']>(defaultKind);
  const [tags, setTags] = useState('');
  const [goalId, setGoalId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setTitle(note?.title ?? defaultTitle);
    setBody(note?.body ?? '');
    setKind(note?.kind ?? defaultKind);
    setTags(note?.tags.join(', ') ?? '');
    setGoalId(note?.goalId ?? '');
    setProjectId(note?.projectId ?? '');
    setErrors({});
  }, [open, note, defaultKind, defaultTitle]);

  const goalOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.goals.map((g) => ({ value: g.id, label: g.title }))],
    [data.goals, t],
  );
  const projectOptions = useMemo(
    () => [{ value: '', label: t('common.none') }, ...data.projects.map((p) => ({ value: p.id, label: p.name }))],
    [data.projects],
  );

  async function submit() {
    const parsed = parseInput(noteInput, { title, body, kind, tags, goalId: goalId || null, projectId: projectId || null });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const ok = note ? await updateNote(note.id, parsed.data) : (await createNote(parsed.data, requestKey.current)) !== null;
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
      title={note ? t('notes.edit') : t('notes.new')}
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
        <TextAreaField label={t('notes.body')} value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label={t('notes.kind')}
            value={kind}
            onChange={(e) => setKind(e.target.value as Note['kind'])}
            options={KINDS.map((k) => ({ value: k, label: t(`notes.kind.${k}`) }))}
          />
          <TextField label={t('notes.tags')} hint={t('notes.tagsHint')} value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField label={t('notes.linkGoal')} value={goalId} onChange={(e) => setGoalId(e.target.value)} options={goalOptions} />
          <SelectField label={t('notes.linkProject')} value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projectOptions} />
        </div>
      </div>
    </Modal>
  );
}
