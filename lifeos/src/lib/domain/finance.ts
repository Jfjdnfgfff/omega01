import type { SavingsGoal, Transaction } from '@/types';
import { monthKey, pct } from '@/lib/date';

/**
 * منطق الإدارة المالية — كل الأرقام مشتقة من المعاملات المسجّلة.
 * لا يوجد أي ربط بحسابات بنكية ولا استيراد تلقائي.
 */

export function monthOf(dateISO: string): string {
  return monthKey(dateISO);
}

export interface MonthTotals {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export function monthTotals(transactions: Transaction[], month: string): MonthTotals {
  const rows = transactions.filter((t) => monthKey(t.date) === month);
  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { month, income, expenses, net: income - expenses };
}

export function monthlySeries(transactions: Transaction[], months: string[]): MonthTotals[] {
  return months.map((m) => monthTotals(transactions, m));
}

export function topExpenseCategories(transactions: Transaction[], month: string, limit = 5): { category: string; amount: number; percent: number }[] {
  const rows = transactions.filter((t) => t.type === 'expense' && monthKey(t.date) === month);
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.category, (totals.get(r.category) ?? 0) + r.amount);
  const all = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([category, amount]) => ({ category, amount, percent: pct(amount, all) }));
}

export interface BudgetState {
  budget: number;
  spent: number;
  remaining: number;
  usedPercent: number;
  overBudget: boolean;
  /** متوسط الإنفاق اليومي في الشهر الحالي */
  dailyAverage: number;
  /** الإسقاط حتى نهاية الشهر بناءً على المتوسط */
  projected: number;
}

export function budgetState(transactions: Transaction[], month: string, budget: number, daysElapsed: number, daysInMonth: number): BudgetState {
  const spent = transactions
    .filter((t) => t.type === 'expense' && monthKey(t.date) === month)
    .reduce((s, t) => s + t.amount, 0);
  const dailyAverage = daysElapsed > 0 ? spent / daysElapsed : 0;
  return {
    budget,
    spent,
    remaining: budget - spent,
    usedPercent: pct(spent, budget),
    overBudget: budget > 0 && spent > budget,
    dailyAverage,
    projected: dailyAverage * daysInMonth,
  };
}

export function savingsProgress(goal: SavingsGoal): { percent: number; remaining: number } {
  return {
    percent: pct(goal.currentAmount, goal.targetAmount),
    remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
  };
}

export function totalsForRange(transactions: Transaction[], from: string, to: string): MonthTotals {
  const rows = transactions.filter((t) => t.date >= from && t.date <= to);
  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { month: `${from}→${to}`, income, expenses, net: income - expenses };
}

export function savingsRate(transactions: Transaction[], month: string): number {
  const t = monthTotals(transactions, month);
  return pct(Math.max(0, t.net), t.income);
}

export const DEFAULT_EXPENSE_CATEGORIES_AR = [
  'طعام',
  'مواصلات',
  'سكن',
  'فواتير',
  'صحة',
  'تعليم',
  'ترفيه',
  'ملابس',
  'ادخار',
  'أخرى',
];

export const DEFAULT_EXPENSE_CATEGORIES_EN = [
  'Food',
  'Transport',
  'Housing',
  'Bills',
  'Health',
  'Education',
  'Entertainment',
  'Clothing',
  'Savings',
  'Other',
];

export const DEFAULT_INCOME_CATEGORIES_AR = ['راتب', 'عمل حر', 'مبيعات', 'هدية', 'أخرى'];
export const DEFAULT_INCOME_CATEGORIES_EN = ['Salary', 'Freelance', 'Sales', 'Gift', 'Other'];
