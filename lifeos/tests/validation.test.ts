import { describe, expect, it } from 'vitest';
import { authInput, goalInput, parseInput, taskInput, timeBlockInput, transactionInput, habitInput, noteInput } from '@/lib/validation';

describe('validation', () => {
  it('rejects an empty task title', () => {
    const res = parseInput(taskInput, { title: '  ' });
    expect(res.ok).toBe(false);
    expect(res.errors.title).toBe('errors.titleTooShort');
    expect(res.firstError).toBe('errors.titleTooShort');
  });

  it('accepts a valid task and normalises empties to null', () => {
    const res = parseInput(taskInput, { title: 'Draft the plan', dueDate: '', dueTime: '', priority: 'high', estimatedMinutes: '' });
    expect(res.ok).toBe(true);
    expect(res.data).toMatchObject({ title: 'Draft the plan', dueDate: null, dueTime: null, estimatedMinutes: null, priority: 'high' });
  });

  it('rejects bad dates, times and estimates', () => {
    expect(parseInput(taskInput, { title: 'ok task', dueDate: '10/01/2026' }).errors.dueDate).toBe('errors.invalidDate');
    expect(parseInput(taskInput, { title: 'ok task', dueTime: '25:00' }).errors.dueTime).toBe('errors.invalidTime');
    expect(parseInput(taskInput, { title: 'ok task', estimatedMinutes: 5000 }).errors.estimatedMinutes).toBe('errors.estimatedRange');
  });

  it('requires the end of a time block to be after its start', () => {
    const bad = parseInput(timeBlockInput, { title: 'Focus', date: '2026-01-10', start: '10:00', end: '09:00' });
    expect(bad.ok).toBe(false);
    expect(bad.errors.end).toBe('errors.endAfterStart');

    const good = parseInput(timeBlockInput, { title: 'Focus', date: '2026-01-10', start: '09:00', end: '10:00' });
    expect(good.ok).toBe(true);
  });

  it('rejects non-positive amounts and missing categories', () => {
    expect(parseInput(transactionInput, { type: 'expense', amount: 0, category: 'Food', date: '2026-01-10' }).errors.amount).toBe('errors.amountRange');
    expect(parseInput(transactionInput, { type: 'expense', amount: 10, category: '  ', date: '2026-01-10' }).errors.category).toBe('errors.categoryRequired');
    expect(parseInput(transactionInput, { type: 'expense', amount: 10, category: 'Food', date: '' }).errors.date).toBe('errors.dateRequired');
    const ok = parseInput(transactionInput, { type: 'income', amount: 12.5, category: 'Salary', date: '2026-01-10' });
    expect(ok.ok).toBe(true);
  });

  it('bounds habit repetition settings', () => {
    expect(parseInput(habitInput, { name: 'Read', targetCount: 99 }).errors.targetCount).toBe('errors.targetCountRange');
    expect(parseInput(habitInput, { name: 'Read', repsPerDay: 0 }).errors.repsPerDay).toBe('errors.repsRange');
  });

  it('parses note tags into a bounded list', () => {
    const res = parseInput(noteInput, { title: 'Idea', body: '', tags: 'a, b ,, c' });
    expect(res.ok).toBe(true);
    expect(res.data?.tags).toEqual(['a', 'b', 'c']);
  });

  it('validates goal deadlines and metrics input', () => {
    const res = parseInput(goalInput, { title: 'Run 100km', deadline: '2026-06-30', metricStart: 0, metricTarget: 100, metricCurrent: 20 });
    expect(res.ok).toBe(true);
    expect(res.data?.deadline).toBe('2026-06-30');
  });

  it('validates credentials', () => {
    expect(parseInput(authInput, { email: 'not-an-email', password: '123' }).errors.email).toBe('errors.invalidEmail');
    expect(parseInput(authInput, { email: 'a@b.co', password: '12345' }).errors.password).toBe('errors.passwordTooShort');
    expect(parseInput(authInput, { email: 'a@b.co', password: '123456' }).ok).toBe(true);
  });
});
