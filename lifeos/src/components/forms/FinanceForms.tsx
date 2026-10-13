import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/primitives';
import { DateField, NumberField, SelectField, TextField } from '@/components/ui/fields';
import { useLang, useT } from '@/i18n';
import { parseInput, savingsGoalInput, transactionInput, type FieldErrors } from '@/lib/validation';
import { createSavingsGoal, createTransaction } from '@/lib/store/actions';
import { toast } from '@/lib/store/toast';
import { uid } from '@/lib/id';
import { monthKey, todayISO } from '@/lib/date';
import {
  DEFAULT_EXPENSE_CATEGORIES_AR,
  DEFAULT_EXPENSE_CATEGORIES_EN,
  DEFAULT_INCOME_CATEGORIES_AR,
  DEFAULT_INCOME_CATEGORIES_EN,
} from '@/lib/domain/finance';

export function TransactionForm({
  open,
  onClose,
  defaultMonth,
}: {
  open: boolean;
  onClose: () => void;
  defaultMonth?: string;
}) {
  const t = useT();
  const lang = useLang();
  const requestKey = useRef(uid('req'));

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setType('expense');
    setAmount('');
    setCategory('');
    setDate(defaultMonth ? `${defaultMonth}-01` : todayISO());
    setNote('');
    setErrors({});
  }, [open, defaultMonth]);

  const categories = useMemo(() => {
    const base =
      type === 'expense'
        ? lang === 'ar'
          ? DEFAULT_EXPENSE_CATEGORIES_AR
          : DEFAULT_EXPENSE_CATEGORIES_EN
        : lang === 'ar'
          ? DEFAULT_INCOME_CATEGORIES_AR
          : DEFAULT_INCOME_CATEGORIES_EN;
    return [{ value: '', label: t('common.select') }, ...base.map((c) => ({ value: c, label: c }))];
  }, [type, lang, t]);

  async function submit() {
    const parsed = parseInput(transactionInput, { type, amount: Number(amount), category, date, note });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const ok = (await createTransaction({ ...parsed.data, date: parsed.data.date ?? date }, requestKey.current)) !== null;
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
      title={t('finance.new')}
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
        <div className="inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
          {(['expense', 'income'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === value ? 'bg-[var(--surface)] text-brand-700 shadow-sm dark:text-brand-300' : 'text-[var(--text-muted)]'
              }`}
            >
              {t(`finance.type.${value}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label={t('finance.amount')} required min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} error={errors.amount ? t(errors.amount) : undefined} />
          <DateField label={t('common.date')} required value={date} onChange={(e) => setDate(e.target.value)} error={errors.date ? t(errors.date) : undefined} />
        </div>

        <SelectField
          label={t('finance.category')}
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories}
          error={errors.category ? t(errors.category) : undefined}
        />
        <TextField label={`${t('finance.note')} (${t('common.optional')})`} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}

export function SavingsGoalForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const requestKey = useRef(uid('req'));

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    requestKey.current = uid('req');
    setName('');
    setTargetAmount('');
    setDeadline('');
    setErrors({});
  }, [open]);

  async function submit() {
    const parsed = parseInput(savingsGoalInput, { name, targetAmount: Number(targetAmount), deadline: deadline || '' });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    const ok = (await createSavingsGoal({ name: parsed.data.name, targetAmount: parsed.data.targetAmount, deadline: parsed.data.deadline })) !== null;
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
      title={t('finance.savings.new')}
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
        <NumberField
          label={t('finance.savings.target')}
          required
          min={1}
          step="0.01"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          error={errors.targetAmount ? t(errors.targetAmount) : undefined}
        />
        <DateField label={`${t('goals.deadline')} (${t('common.optional')})`} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </div>
    </Modal>
  );
}

export function currentMonth(): string {
  return monthKey(todayISO());
}
