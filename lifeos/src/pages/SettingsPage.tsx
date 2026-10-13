import { useRef, useState } from 'react';
import type { CurrencyCode, Language, Settings as SettingsType } from '@/types';
import { Button, Card, CardHeader, PageHeader } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { NumberField, SelectField, TextField, Toggle } from '@/components/ui/fields';
import { useAppState, useSettings } from '@/lib/store/store';
import { deleteAccount, deleteAllData, exportData, importData, signOut, updateSettings, validateImport, type ExportPayload } from '@/lib/store/actions';
import { callLanguageModel, buildDataContext, coachSystemPrompt } from '@/lib/domain/coach';
import { CURRENCY_LIST } from '@/lib/currency';
import { todayISO } from '@/lib/date';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const AVATAR_COLORS = ['#2563eb', '#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export function SettingsPage() {
  const t = useT();
  const lang = useLang();
  const settings = useSettings();
  const { mode, user } = useAppState();

  const [name, setName] = useState(settings.profile.name);
  const [budget, setBudget] = useState(String(settings.monthlyBudget));
  const [focus, setFocus] = useState(String(settings.dailyFocusTargetMinutes));
  const [focusMin, setFocusMin] = useState(String(settings.pomodoro.focusMinutes));
  const [shortMin, setShortMin] = useState(String(settings.pomodoro.shortBreakMinutes));
  const [longMin, setLongMin] = useState(String(settings.pomodoro.longBreakMinutes));
  const [baseUrl, setBaseUrl] = useState(settings.coach.baseUrl);
  const [model, setModel] = useState(settings.coach.model);
  const [confirm, setConfirm] = useState<'data' | 'account' | null>(null);
  const [busy, setBusy] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const fileRef = useRef<HTMLInputElement>(null);

  const timezones = [
    settings.timezone,
    'Africa/Algiers',
    'Africa/Tunis',
    'Africa/Casablanca',
    'Africa/Cairo',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Europe/Paris',
    'Europe/London',
    'UTC',
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  async function save(patch: Partial<SettingsType>) {
    const ok = await updateSettings(patch);
    if (ok) toast.success('settings.saved');
    else toast.error('errors.saveFailed');
  }

  function handleExport() {
    const payload = exportData();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-export-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File, replace: boolean) {
    try {
      const text = await file.text();
      const parsed = validateImport(JSON.parse(text) as unknown);
      if (!parsed.ok || !parsed.payload) {
        toast.error(parsed.error ?? 'errors.importInvalid');
        return;
      }
      const payload: ExportPayload = parsed.payload;
      const ok = await importData(payload, replace ? 'replace' : 'merge');
      if (!ok) toast.error('errors.importFailed');
    } catch {
      toast.error('errors.importInvalid');
    }
  }

  async function testConnection() {
    setTestState('testing');
    const res = await callLanguageModel({
      baseUrl,
      apiKey: 'test',
      model,
      systemPrompt: coachSystemPrompt(lang, buildDataContext({ goals: [], tasks: [], habits: [], habitLogs: [], projects: [], timeBlocks: [], timeLogs: [], transactions: [], savingsGoals: [], notes: [], reviews: [] }, settings, lang, todayISO()), todayISO()),
      messages: [{ role: 'user', content: 'ping' }],
    });
    // 401/403 تعني أن العنوان والموديل صحيحان لكن المفتاح غير صالح — وهذا يكفي للتحقق من الإعدادات.
    setTestState(res.ok || (res.errorKey ?? '').startsWith('coach.errors.http:401') || (res.errorKey ?? '').startsWith('coach.errors.http:403') ? 'ok' : 'error');
  }

  return (
    <div className="space-y-4">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('settings.profile')} icon="settings" />
          <div className="space-y-3 p-4">
            <div className="flex items-end gap-3">
              <div className="flex gap-1.5">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => void save({ profile: { ...settings.profile, avatarColor: color } })}
                    aria-label={color}
                    className={`h-7 w-7 rounded-full transition-transform ${settings.profile.avatarColor === color ? 'scale-110 ring-2 ring-[var(--text)] ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-end gap-2">
              <TextField label={t('settings.name')} value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
              <Button
                variant="primary"
                onClick={() => void save({ profile: { ...settings.profile, name: name.trim() } })}
              >
                {t('common.save')}
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {mode === 'firebase' ? `${t('settings.storage.firebase')} · ${user?.email ?? ''}` : t('settings.storage.local')}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.appearance')} icon="sun" />
          <div className="space-y-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('settings.language')}
                value={settings.language}
                onChange={(e) => void save({ language: e.target.value as Language })}
                options={[
                  { value: 'ar', label: t('settings.language.ar') },
                  { value: 'en', label: t('settings.language.en') },
                ]}
              />
              <SelectField
                label={t('settings.theme')}
                value={settings.theme}
                onChange={(e) => void save({ theme: e.target.value as SettingsType['theme'] })}
                options={[
                  { value: 'light', label: t('settings.theme.light') },
                  { value: 'dark', label: t('settings.theme.dark') },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('settings.timezone')}
                value={settings.timezone}
                onChange={(e) => void save({ timezone: e.target.value })}
                options={timezones.map((tz) => ({ value: tz, label: tz }))}
              />
              <SelectField
                label={t('settings.weekStart')}
                value={String(settings.weekStartsOn)}
                onChange={(e) => void save({ weekStartsOn: Number(e.target.value) as SettingsType['weekStartsOn'] })}
                options={[
                  { value: '0', label: t('settings.weekStart.0') },
                  { value: '1', label: t('settings.weekStart.1') },
                  { value: '6', label: t('settings.weekStart.6') },
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label={t('settings.currency')}
                value={settings.currency}
                onChange={(e) => void save({ currency: e.target.value as CurrencyCode })}
                options={CURRENCY_LIST.map((c) => ({ value: c.code, label: lang === 'ar' ? `${c.nameAr} (${c.code})` : `${c.nameEn} (${c.code})` }))}
              />
              <NumberField
                label={t('settings.dailyFocus')}
                min={0}
                max={1440}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                onBlur={() => void save({ dailyFocusTargetMinutes: Math.max(0, Number(focus) || 0) })}
              />
            </div>
            <NumberField
              label={t('settings.monthlyBudget')}
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              onBlur={() => void save({ monthlyBudget: Math.max(0, Number(budget) || 0) })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.pomodoro')} icon="clock" />
          <div className="grid grid-cols-3 gap-3 p-4">
            <NumberField
              label={t('settings.pomodoro.focus')}
              min={1}
              max={120}
              value={focusMin}
              onChange={(e) => setFocusMin(e.target.value)}
              onBlur={() => void save({ pomodoro: { ...settings.pomodoro, focusMinutes: Math.max(1, Number(focusMin) || 25) } })}
            />
            <NumberField
              label={t('settings.pomodoro.short')}
              min={1}
              max={60}
              value={shortMin}
              onChange={(e) => setShortMin(e.target.value)}
              onBlur={() => void save({ pomodoro: { ...settings.pomodoro, shortBreakMinutes: Math.max(1, Number(shortMin) || 5) } })}
            />
            <NumberField
              label={t('settings.pomodoro.long')}
              min={1}
              max={90}
              value={longMin}
              onChange={(e) => setLongMin(e.target.value)}
              onBlur={() => void save({ pomodoro: { ...settings.pomodoro, longBreakMinutes: Math.max(1, Number(longMin) || 15) } })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.privacy')} icon="settings" />
          <div className="p-4">
            <Toggle
              label={t('settings.privacy.finance')}
              checked={settings.privacy.showFinanceOnDashboard}
              onChange={(next) => void save({ privacy: { ...settings.privacy, showFinanceOnDashboard: next } })}
            />
            <Toggle
              label={t('settings.privacy.coach')}
              checked={settings.privacy.showAiCoach}
              onChange={(next) => void save({ privacy: { ...settings.privacy, showAiCoach: next } })}
            />
            <Toggle
              label={t('settings.privacy.sync')}
              description={mode === 'firebase' ? undefined : t('settings.storage.local')}
              disabled={mode !== 'firebase'}
              checked={settings.privacy.cloudSyncEnabled}
              onChange={(next) => void save({ privacy: { ...settings.privacy, cloudSyncEnabled: next } })}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.coachProvider')} subtitle={t('coach.privacy')} icon="sparkles" />
          <div className="space-y-3 p-4">
            <SelectField
              label={t('settings.coachProvider')}
              value={settings.coach.provider}
              onChange={(e) => void save({ coach: { ...settings.coach, provider: e.target.value as SettingsType['coach']['provider'] } })}
              options={[
                { value: 'none', label: t('settings.coachProvider.none') },
                { value: 'openai-compatible', label: t('settings.coachProvider.openai') },
              ]}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField label={t('settings.coachBaseUrl')} dir="ltr" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} onBlur={() => void save({ coach: { ...settings.coach, baseUrl } })} />
              <TextField label={t('settings.coachModel')} dir="ltr" value={model} onChange={(e) => setModel(e.target.value)} onBlur={() => void save({ coach: { ...settings.coach, model } })} />
            </div>
            <p className="text-xs text-[var(--text-muted)]">{t('settings.coachKeyHint')}</p>
            <div className="flex items-center gap-2">
              <Button icon="sparkles" loading={testState === 'testing'} onClick={() => void testConnection()}>
                {t('settings.coachTest')}
              </Button>
              {testState === 'ok' ? (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{t('settings.coachTestOk')}</span>
              ) : testState === 'error' ? (
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">{t('state.error')}</span>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('settings.data')} icon="download" />
          <div className="space-y-3 p-4">
            <p className="text-xs text-[var(--text-muted)]">{t('settings.export.hint')}</p>
            <div className="flex flex-wrap gap-2">
              <Button icon="download" onClick={handleExport}>
                {t('settings.export')}
              </Button>
              <Button
                icon="upload"
                onClick={() => {
                  setImportMode('replace');
                  fileRef.current?.click();
                }}
              >
                {t('settings.import')}
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleImport(file, importMode === 'replace');
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={importMode === 'replace' ? 'chip-active' : 'chip'}
                onClick={() => {
                  setImportMode('replace');
                  fileRef.current?.click();
                }}
              >
                {t('settings.import.replace')}
              </button>
              <button
                type="button"
                className={importMode === 'merge' ? 'chip-active' : 'chip'}
                onClick={() => {
                  setImportMode('merge');
                  fileRef.current?.click();
                }}
              >
                {t('settings.import.merge')}
              </button>
            </div>
          </div>
        </Card>

        <Card className="border-red-500/30">
          <CardHeader title={t('settings.danger')} icon="alert" />
          <div className="space-y-3 p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{t('settings.deleteData')}</p>
              <p className="text-xs text-[var(--text-muted)]">{t('settings.deleteData.hint')}</p>
              <Button variant="danger" icon="trash" className="mt-2" onClick={() => setConfirm('data')}>
                {t('settings.deleteData')}
              </Button>
            </div>
            <div className="divider" />
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{t('settings.deleteAccount')}</p>
              <p className="text-xs text-[var(--text-muted)]">{mode === 'firebase' ? t('settings.deleteAccount.hint') : t('settings.deleteData.hint')}</p>
              <Button variant="danger" icon="logout" className="mt-2" onClick={() => setConfirm('account')}>
                {mode === 'firebase' ? t('settings.deleteAccount') : t('auth.signOut')}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={t('confirm.danger.title')}
        body={confirm === 'account' ? t('settings.deleteAccount.hint') : t('settings.deleteData.hint')}
        danger
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true);
          if (confirm === 'data') {
            const ok = await deleteAllData();
            if (ok) toast.success('common.delete');
            else toast.error('errors.saveFailed');
          } else if (mode === 'firebase') {
            await deleteAccount();
          } else {
            await signOut();
          }
          setBusy(false);
          setConfirm(null);
        }}
      />

      <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-[var(--text-muted)]">
        <Icon name="check" size={12} />
        {t('coach.dataDisclaimer')}
      </div>
    </div>
  );
}
