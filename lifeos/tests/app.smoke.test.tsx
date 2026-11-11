import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '@/App';
import { store } from '@/lib/store/store';
import { emptyData } from '@/lib/storage/types';
import { FakeDriver, makeFakeAuth, TEST_USER } from './fakeDriver';

/**
 * اختبار دخان للواجهة: يشغّل التطبيق الحقيقي (التوجيه + الحالة + التخزين)
 * مقابل سائق تخزين وهمي، ويتحقق من أن الأزرار تنفّذ إجراءات فعلية.
 */

const driver = new FakeDriver();
let firstMount = true;

vi.mock('@/lib/storage/index', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    initBackend: async () => ({ auth: makeFakeAuth(TEST_USER), data: driver, mode: 'local' as const }),
  };
});

beforeEach(async () => {
  if (firstMount) {
    store.setState({ phase: 'boot', data: emptyData() });
    firstMount = false;
  }
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  await waitFor(() => expect(store.getState().phase).toBe('ready'), { timeout: 4000 });
  await waitFor(() => expect(screen.getAllByText(/مدير حياتي الذكي/).length).toBeGreaterThan(0));
});

describe('LifeOS app smoke test', () => {
  it('boots into the dashboard and shows the empty state when there is no data', () => {
    expect(store.getState().user?.uid).toBe(TEST_USER.uid);
    expect(screen.getByText('لنبدأ من الأساسيات')).toBeTruthy();
  });

  it('creates a task through the quick-add form and shows it as a top priority', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'مهمة' }));
    await waitFor(() => expect(screen.getByLabelText('العنوان')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'إنهاء تقرير الربع الأول' } });
    fireEvent.change(screen.getByLabelText('المدة التقديرية (دقيقة)'), { target: { value: '90' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(store.getState().data.tasks).toHaveLength(1));
    await waitFor(() => expect(screen.getByText('إنهاء تقرير الربع الأول')).toBeTruthy());
    expect(Object.values(driver.store.tasks)).toHaveLength(1);
    expect(store.getState().save.phase).toBe('saved');
  });

  it('rejects an empty title with a validation message instead of saving', async () => {
    fireEvent.click(screen.getByRole('button', { name: 'مهمة' }));
    await waitFor(() => expect(screen.getByLabelText('العنوان')).toBeTruthy());
    const before = store.getState().data.tasks.length;

    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(screen.getByText('العنوان قصير جدًا')).toBeTruthy());
    expect(store.getState().data.tasks).toHaveLength(before);
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
  });

  it('completing a task updates the dashboard statistics from real data', async () => {
    fireEvent.click(screen.getByLabelText('إكمال'));
    await waitFor(() => expect(store.getState().data.tasks[0].status).toBe('done'));
    await waitFor(() => expect(screen.getByText('100%')).toBeTruthy());
    expect(driver.store.tasks[store.getState().data.tasks[0].id]).toBeDefined();
    expect((driver.store.tasks[store.getState().data.tasks[0].id] as { status: string }).status).toBe('done');
  });

  it('navigates to the tasks page and lists the saved task', async () => {
    fireEvent.click(screen.getByRole('link', { name: 'المهام' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'المهام' })).toBeTruthy());
    expect(screen.getByText('إنهاء تقرير الربع الأول')).toBeTruthy();
    // المهمة مكتملة → لا تُعد متأخرة
    expect(screen.getAllByText('مكتملة').length).toBeGreaterThan(0);
  });

  it('adds a habit and logs today from the habits page', async () => {
    fireEvent.click(screen.getByRole('link', { name: 'العادات' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'العادات' })).toBeTruthy());

    fireEvent.click(screen.getAllByRole('button', { name: 'عادة جديدة' })[0]);
    await waitFor(() => expect(screen.getByLabelText('العنوان')).toBeTruthy());
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'قراءة 20 دقيقة' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() => expect(store.getState().data.habits).toHaveLength(1));
    fireEvent.click(screen.getByLabelText('تم اليوم'));
    await waitFor(() => expect(store.getState().data.habitLogs).toHaveLength(1));

    const card = screen.getByText('قراءة 20 دقيقة').closest('.card') as HTMLElement;
    expect(within(card).getByText(/السلسلة الحالية: 1/)).toBeTruthy();
  });

  it('toggling the same habit day twice never creates a duplicate log', async () => {
    fireEvent.click(screen.getByRole('link', { name: 'العادات' }));
    await waitFor(() => expect(screen.getByLabelText('تراجع')).toBeTruthy());
    fireEvent.click(screen.getByLabelText('تراجع'));
    await waitFor(() => expect(store.getState().data.habitLogs).toHaveLength(0));
    fireEvent.click(screen.getByLabelText('تم اليوم'));
    await waitFor(() => expect(store.getState().data.habitLogs).toHaveLength(1));
    expect(Object.values(driver.store.habitLogs)).toHaveLength(1);
  });

  it('keeps data in the storage driver so a reload would restore it', async () => {
    const persisted = await driver.loadAll();
    expect(persisted.tasks).toHaveLength(1);
    expect(persisted.habits).toHaveLength(1);
    expect(persisted.habitLogs).toHaveLength(1);
  });

  it('persists settings changes such as the theme and language', async () => {
    fireEvent.click(screen.getByLabelText('تبديل السمة'));
    await waitFor(() => expect(store.getState().settings.theme).toBe('dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(screen.getByLabelText('تبديل السمة'));
    await waitFor(() => expect(store.getState().settings.theme).toBe('light'));
  });
});
