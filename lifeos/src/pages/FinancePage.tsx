import { useMemo, useState } from 'react';
import type { SavingsGoal } from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Progress, StatCard } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { DonutChart } from '@/components/charts/Charts';
import { SavingsGoalForm, TransactionForm } from '@/components/forms/FinanceForms';
import { useData, useSettings } from '@/lib/store/store';
import { deleteSavingsGoal, deleteTransaction, savingsDeposit } from '@/lib/store/actions';
import { budgetState, monthTotals, savingsProgress, savingsRate, topExpenseCategories } from '@/lib/domain/finance';
import { daysInMonth, formatDate, monthKey, todayISO } from '@/lib/date';
import { formatMoney } from '@/lib/currency';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const PALETTE = ['#2563eb', '#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#64748b'];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKey(`${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-01`);
}

export function FinancePage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [month, setMonth] = useState(monthKey(today));
  const [txForm, setTxForm] = useState(false);
  const [savingsForm, setSavingsForm] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: 'tx' | 'savings'; id: string } | null>(null);
  const [deposit, setDeposit] = useState<Record<string, string>>({});

  const totals = useMemo(() => monthTotals(data.transactions, month), [data.transactions, month]);
  const budget = useMemo(() => {
    const isCurrent = month === monthKey(today);
    const elapsed = isCurrent ? Number(today.slice(8, 10)) : daysInMonth(month);
    return budgetState(data.transactions, month, settings.monthlyBudget, elapsed, daysInMonth(month));
  }, [data.transactions, month, settings.monthlyBudget, today]);
  const topCategories = useMemo(() => topExpenseCategories(data.transactions, month, 5), [data.transactions, month]);
  const rate = useMemo(() => savingsRate(data.transactions, month), [data.transactions, month]);

  const series = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i -= 1) months.push(shiftMonth(month, -i));
    return months.map((m) => monthTotals(data.transactions, m));
  }, [data.transactions, month]);
  const seriesMax = Math.max(1, ...series.flatMap((row) => [row.income, row.expenses]));

  const transactions = useMemo(
    () => data.transactions.filter((tx) => monthKey(tx.date) === month).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [data.transactions, month],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('finance.title')}
        subtitle={t('finance.subtitle')}
        actions={
          <>
            <Button icon="plus" onClick={() => setSavingsForm(true)}>
              {t('finance.savings.new')}
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setTxForm(true)}>
              {t('finance.new')}
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost !px-2" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="prev">
            <Icon name="chevronStart" size={16} />
          </button>
          <span className="min-w-32 text-center text-sm font-bold text-[var(--text)]">{month}</span>
          <button type="button" className="btn-ghost !px-2" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="next">
            <Icon name="chevronEnd" size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="chip">{t('finance.currency')}: {settings.currency}</span>
          <span className="chip">{t('finance.savingsRate')}: {rate}%</span>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t('finance.income')} value={formatMoney(totals.income, settings.currency, lang)} icon="wallet" tone="success" />
        <StatCard label={t('finance.expenses')} value={formatMoney(totals.expenses, settings.currency, lang)} icon="chart" tone="danger" />
        <StatCard
          label={t('finance.net')}
          value={formatMoney(totals.net, settings.currency, lang)}
          icon="chart"
          tone={totals.net >= 0 ? 'success' : 'danger'}
        />
        <StatCard
          label={t('finance.budget')}
          value={budget.budget > 0 ? `${budget.usedPercent}%` : '—'}
          icon="alert"
          tone={budget.overBudget ? 'danger' : 'brand'}
          hint={budget.budget > 0 ? `${t('finance.budget.remaining')}: ${formatMoney(Math.max(0, budget.remaining), settings.currency, lang)}` : t('finance.noBudget')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title={t('finance.compare')} subtitle={t('finance.summary')} icon="chart" />
            <div className="p-4">
              <div className="flex items-end justify-between gap-2" style={{ height: 140 }}>
                {series.map((row) => (
                  <div key={row.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex w-full items-end justify-center gap-1" style={{ height: 110 }}>
                      <div
                        className="w-1/3 rounded-t bg-emerald-500"
                        style={{ height: `${Math.max(2, (row.income / seriesMax) * 100)}%` }}
                        title={`${t('finance.income')}: ${formatMoney(row.income, settings.currency, lang)}`}
                      />
                      <div
                        className="w-1/3 rounded-t bg-red-500"
                        style={{ height: `${Math.max(2, (row.expenses / seriesMax) * 100)}%` }}
                        title={`${t('finance.expenses')}: ${formatMoney(row.expenses, settings.currency, lang)}`}
                      />
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)]">{row.month.slice(5)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                  {t('finance.income')}
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-sm bg-red-500" />
                  {t('finance.expenses')}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('finance.transactions')} subtitle={`${transactions.length}`} icon="list" />
            <div className="p-2">
              {transactions.length === 0 ? (
                <EmptyState
                  icon="wallet"
                  title={t('finance.empty')}
                  action={
                    <Button variant="primary" icon="plus" onClick={() => setTxForm(true)}>
                      {t('finance.new')}
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {transactions.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-3 px-2 py-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                        <Icon name={tx.type === 'income' ? 'wallet' : 'chart'} size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text)]">{tx.category}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {formatDate(tx.date, lang)}
                          {tx.note ? ` · ${tx.note}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 text-sm font-bold tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '−'}
                        {formatMoney(tx.amount, settings.currency, lang)}
                      </span>
                      <button type="button" className="btn-ghost !px-1 text-red-500" onClick={() => setConfirm({ kind: 'tx', id: tx.id })} aria-label={t('common.delete')}>
                        <Icon name="trash" size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('finance.budget')} icon="alert" />
            <div className="space-y-3 p-4">
              {budget.budget > 0 ? (
                <>
                  <Progress value={budget.usedPercent} tone={budget.overBudget ? 'danger' : budget.usedPercent > 80 ? 'warning' : 'brand'} showLabel />
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-[var(--text-muted)]">{t('finance.budget.used')}</dt>
                      <dd className="tabular-nums font-semibold text-[var(--text)]">{formatMoney(budget.spent, settings.currency, lang)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[var(--text-muted)]">{t('finance.budget.remaining')}</dt>
                      <dd className={`tabular-nums font-semibold ${budget.remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatMoney(budget.remaining, settings.currency, lang)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-[var(--text-muted)]">{t('finance.budget.projected')}</dt>
                      <dd className="tabular-nums font-semibold text-[var(--text)]">{formatMoney(budget.projected, settings.currency, lang)}</dd>
                    </div>
                  </dl>
                  {budget.overBudget ? <Badge tone="danger">{t('finance.budget.over')}</Badge> : null}
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{t('finance.noBudget')}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('finance.topCategories')} icon="chart" />
            <div className="p-4">
              {topCategories.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">{t('finance.empty')}</p>
              ) : (
                <DonutChart
                  size={120}
                  segments={topCategories.map((row, i) => ({ label: row.category, value: Math.round(row.amount), color: PALETTE[i % PALETTE.length] }))}
                  centerValue={`${topCategories[0].percent}%`}
                  centerLabel={t('finance.topCategories')}
                />
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={t('finance.savings')} icon="target" />
            <div className="p-3">
              {data.savingsGoals.length === 0 ? (
                <EmptyState
                  icon="target"
                  title={t('finance.savings.empty')}
                  action={
                    <Button variant="primary" icon="plus" onClick={() => setSavingsForm(true)}>
                      {t('finance.savings.new')}
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {data.savingsGoals.map((goal: SavingsGoal) => {
                    const progress = savingsProgress(goal);
                    return (
                      <li key={goal.id} className="rounded-lg border border-[var(--border)] p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--text)]">{goal.name}</p>
                            <p className="text-[11px] tabular-nums text-[var(--text-muted)]">
                              {formatMoney(goal.currentAmount, settings.currency, lang)} / {formatMoney(goal.targetAmount, settings.currency, lang)}
                            </p>
                          </div>
                          <button type="button" className="btn-ghost !px-1 text-red-500" onClick={() => setConfirm({ kind: 'savings', id: goal.id })} aria-label={t('common.delete')}>
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                        <div className="mt-2">
                          <Progress value={progress.percent} tone={progress.percent >= 100 ? 'success' : 'brand'} showLabel />
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                          {t('finance.savings.remaining')}: {formatMoney(progress.remaining, settings.currency, lang)}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <input
                            type="number"
                            className="input !py-1 text-xs"
                            placeholder={t('finance.amount')}
                            value={deposit[goal.id] ?? ''}
                            onChange={(e) => setDeposit((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                          />
                          <Button
                            size="sm"
                            disabled={!deposit[goal.id]}
                            onClick={async () => {
                              const value = Number(deposit[goal.id]);
                              if (Number.isFinite(value)) await savingsDeposit(goal.id, value);
                              setDeposit((prev) => ({ ...prev, [goal.id]: '' }));
                            }}
                          >
                            {t('finance.savings.deposit')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!deposit[goal.id]}
                            onClick={async () => {
                              const value = Number(deposit[goal.id]);
                              if (Number.isFinite(value)) await savingsDeposit(goal.id, -Math.abs(value));
                              setDeposit((prev) => ({ ...prev, [goal.id]: '' }));
                            }}
                          >
                            {t('finance.savings.withdraw')}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>

      <TransactionForm open={txForm} defaultMonth={month} onClose={() => setTxForm(false)} />
      <SavingsGoalForm open={savingsForm} onClose={() => setSavingsForm(false)} />
      <ConfirmDialog
        open={!!confirm}
        title={t('confirm.delete.title')}
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          const ok = confirm.kind === 'tx' ? await deleteTransaction(confirm.id) : await deleteSavingsGoal(confirm.id);
          setConfirm(null);
          if (ok) toast.success('common.delete');
          else toast.error('errors.saveFailed');
        }}
      />
    </div>
  );
}
