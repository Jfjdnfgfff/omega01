import { useMemo, useState } from 'react';
import type { Note, NoteKind } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { NoteForm } from '@/components/forms/NoteForm';
import { useData } from '@/lib/store/store';
import { deleteNote, updateNote } from '@/lib/store/actions';
import { formatDate, todayISO } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const KINDS: NoteKind[] = ['idea', 'daily', 'lesson', 'decision', 'project'];
const KIND_TONE: Record<NoteKind, 'neutral' | 'brand' | 'success' | 'warning' | 'danger'> = {
  idea: 'brand',
  daily: 'neutral',
  lesson: 'success',
  decision: 'warning',
  project: 'danger',
};

export function NotesPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();

  const [term, setTerm] = useState('');
  const [kind, setKind] = useState<'all' | NoteKind>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; note: Note | null }>({ open: false, note: null });
  const [confirm, setConfirm] = useState<Note | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    data.notes.forEach((note) => note.tags.forEach((item) => set.add(item)));
    return [...set].sort();
  }, [data.notes]);

  const notes = useMemo(() => {
    const q = term.trim().toLowerCase();
    return data.notes
      .filter((note) => !note.archived)
      .filter((note) => (kind === 'all' ? true : note.kind === kind))
      .filter((note) => (tag ? note.tags.includes(tag) : true))
      .filter((note) => (q ? note.title.toLowerCase().includes(q) || note.body.toLowerCase().includes(q) : true))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [data.notes, term, kind, tag]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('notes.title')}
        subtitle={t('notes.subtitle')}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, note: null })}>
            {t('notes.new')}
          </Button>
        }
      />

      <Card className="space-y-2 p-3">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-[var(--text-muted)]">
            <Icon name="search" size={15} />
          </span>
          <input className="input ps-8" placeholder={t('notes.searchPlaceholder')} value={term} onChange={(e) => setTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={kind === 'all' ? 'chip-active' : 'chip'} onClick={() => setKind('all')}>
            {t('common.all')}
          </button>
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'chip-active' : 'chip'} onClick={() => setKind(k)}>
              {t(`notes.kind.${k}`)}
            </button>
          ))}
          {allTags.map((item) => (
            <button key={item} type="button" className={tag === item ? 'chip-active' : 'chip'} onClick={() => setTag(tag === item ? null : item)}>
              #{item}
            </button>
          ))}
        </div>
      </Card>

      {notes.length === 0 ? (
        <Card>
          <EmptyState
            icon="note"
            title={term || kind !== 'all' || tag ? t('common.noResults') : t('notes.empty')}
            action={
              <Button variant="primary" icon="plus" onClick={() => setForm({ open: true, note: null })}>
                {t('notes.new')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {notes.map((note) => {
            const goal = data.goals.find((g) => g.id === note.goalId);
            const project = data.projects.find((p) => p.id === note.projectId);
            return (
              <Card key={note.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge tone={KIND_TONE[note.kind]}>{t(`notes.kind.${note.kind}`)}</Badge>
                    {note.pinned ? <Badge tone="warning">★</Badge> : null}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className="btn-ghost !px-1.5"
                      onClick={() => void updateNote(note.id, { pinned: !note.pinned })}
                      aria-label={note.pinned ? t('notes.unpin') : t('notes.pin')}
                    >
                      <Icon name="target" size={14} />
                    </button>
                    <button type="button" className="btn-ghost !px-1.5" onClick={() => setForm({ open: true, note })} aria-label={t('common.edit')}>
                      <Icon name="edit" size={14} />
                    </button>
                    <button type="button" className="btn-ghost !px-1.5 text-red-500" onClick={() => setConfirm(note)} aria-label={t('common.delete')}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                <h2 className="mt-2 text-sm font-bold text-[var(--text)]">{note.title}</h2>
                {note.body ? <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-muted)]">{note.body}</p> : null}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {note.tags.map((item) => (
                    <span key={item} className="chip">
                      #{item}
                    </span>
                  ))}
                  {goal ? <span className="chip">{goal.title}</span> : null}
                  {project ? <span className="chip">{project.name}</span> : null}
                </div>

                <p className="mt-auto pt-3 text-[11px] text-[var(--text-muted)]">{formatDate(note.updatedAt.slice(0, 10), lang)}</p>
              </Card>
            );
          })}
        </div>
      )}

      <NoteForm open={form.open} note={form.note} defaultTitle={form.note ? '' : formatDate(todayISO(), lang)} onClose={() => setForm({ open: false, note: null })} />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = await deleteNote(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}
