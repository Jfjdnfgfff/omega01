import { useState } from 'react';
import { Button } from '@/components/ui/primitives';
import { TextField } from '@/components/ui/fields';
import { Icon } from '@/components/ui/Icon';
import { useT } from '@/i18n';
import { authInput, parseInput, type FieldErrors } from '@/lib/validation';
import { useAppState } from '@/lib/store/store';
import { getBackend } from '@/lib/store/bootstrap';
import { updateSettings } from '@/lib/store/actions';

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('email-already-in-use')) return 'auth.error.emailInUse';
  if (code.includes('user-not-found') || code.includes('invalid-credential')) return 'auth.error.userNotFound';
  if (code.includes('wrong-password')) return 'auth.error.wrongPassword';
  if (code.includes('invalid-email')) return 'auth.error.invalidEmail';
  if (code.includes('weak-password')) return 'auth.error.passwordTooShort';
  return 'auth.error.generic';
}

export function AuthPage() {
  const t = useT();
  const { mode } = useAppState();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isLocal = mode !== 'firebase';

  async function submit() {
    setFormError(null);
    const parsed = parseInput(authInput, { email, password });
    if (!parsed.ok || !parsed.data) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    const backend = getBackend();
    if (!backend?.auth.signIn || !backend?.auth.signUp) {
      setFormError('auth.error.generic');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'signup') {
        const user = await backend.auth.signUp(email, password, name.trim() || email.split('@')[0]);
        await updateSettings({ profile: { name: name.trim() || email.split('@')[0], avatarColor: '#2563eb' } });
        void user;
      } else {
        await backend.auth.signIn(email, password);
      }
    } catch (err) {
      console.error('[LifeOS] auth', err);
      setFormError(mapAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function continueLocal() {
    const backend = getBackend();
    setBusy(true);
    try {
      await backend?.auth.signInLocal?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-2)] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white">L</span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-[var(--text)]">{t('auth.welcome')}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('auth.welcomeBody')}</p>
        </div>

        <div className="card p-5">
          {isLocal ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <span className="mt-0.5 text-brand-600 dark:text-brand-400">
                  <Icon name="alert" size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{t('auth.localMode')}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t('auth.localModeBody')}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{t('auth.firebaseMissing')}</p>
                </div>
              </div>
              <Button variant="primary" className="w-full" loading={busy} onClick={() => void continueLocal()}>
                {t('auth.enter')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
                {(['signin', 'signup'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTab(value)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      tab === value ? 'bg-[var(--surface)] text-brand-700 shadow-sm dark:text-brand-300' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {value === 'signin' ? t('auth.signIn') : t('auth.signUp')}
                  </button>
                ))}
              </div>

              {tab === 'signup' ? (
                <TextField label={t('auth.name')} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              ) : null}

              <TextField
                label={t('auth.email')}
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email ? t(errors.email) : undefined}
                autoComplete="email"
              />
              <TextField
                label={t('auth.password')}
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password ? t(errors.password) : undefined}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
              />

              {formError ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">{t(formError)}</p>
              ) : null}

              <Button variant="primary" className="w-full" loading={busy} onClick={() => void submit()}>
                {tab === 'signin' ? t('auth.signIn') : t('auth.signUp')}
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--text-muted)]">{t('coach.dataDisclaimer')}</p>
      </div>
    </div>
  );
}
