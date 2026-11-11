import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Badge, Button, Spinner } from '@/components/ui/primitives';
import { useAppState, useSettings, store } from '@/lib/store/store';
import { useT } from '@/i18n';
import { updateSettings, signOut } from '@/lib/store/actions';
import { toast } from '@/lib/store/toast';

interface NavItem {
  to: string;
  labelKey: string;
  icon: IconName;
  hideKey?: 'coach';
}

const SECTIONS: { key: string; items: NavItem[] }[] = [
  {
    key: 'nav.section.life',
    items: [
      { to: '/', labelKey: 'nav.dashboard', icon: 'home' },
      { to: '/goals', labelKey: 'nav.goals', icon: 'target' },
      { to: '/habits', labelKey: 'nav.habits', icon: 'repeat' },
    ],
  },
  {
    key: 'nav.section.work',
    items: [
      { to: '/tasks', labelKey: 'nav.tasks', icon: 'checkSquare' },
      { to: '/time', labelKey: 'nav.time', icon: 'clock' },
      { to: '/projects', labelKey: 'nav.projects', icon: 'folder' },
    ],
  },
  {
    key: 'nav.section.reflect',
    items: [
      { to: '/reviews', labelKey: 'nav.reviews', icon: 'review' },
      { to: '/notes', labelKey: 'nav.notes', icon: 'note' },
    ],
  },
  {
    key: 'nav.section.system',
    items: [
      { to: '/finance', labelKey: 'nav.finance', icon: 'wallet' },
      { to: '/coach', labelKey: 'nav.coach', icon: 'sparkles', hideKey: 'coach' },
      { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
    ],
  },
];

function SaveIndicator() {
  const { save, online } = useAppState();
  const t = useT();
  if (!online) {
    return (
      <span className="chip" title={t('state.offline')}>
        <Icon name="alert" size={12} />
        {t('state.offline')}
      </span>
    );
  }
  if (save.error) {
    return (
      <button type="button" className="chip text-red-600 dark:text-red-400" onClick={() => store.clearSaveError()} title={t(save.error)}>
        <Icon name="alert" size={12} />
        {t('state.saveError')}
      </button>
    );
  }
  if (save.phase === 'saving') {
    return (
      <span className="chip">
        <Spinner size={11} />
        {t('state.saving')}
      </span>
    );
  }
  if (save.phase === 'saved') {
    return (
      <span className="chip text-emerald-600 dark:text-emerald-400">
        <Icon name="check" size={12} />
        {t('state.saved')}
      </span>
    );
  }
  return null;
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const settings = useSettings();
  const { mode, user } = useAppState();

  return (
    <div className="flex h-full flex-col gap-1 bg-[var(--surface)]">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">L</span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-[var(--text)]">{t('app.name')}</p>
          <p className="truncate text-[11px] text-[var(--text-muted)]">{t('app.tagline')}</p>
        </div>
      </div>

      <nav aria-label={t('a11y.sidebar')} className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-4">
        {SECTIONS.map((section) => {
          const items = section.items.filter((item) => !(item.hideKey === 'coach' && !settings.privacy.showAiCoach));
          if (items.length === 0) return null;
          return (
            <div key={section.key}>
              <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{t(section.key)}</p>
              <ul className="space-y-0.5">
                {items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/'}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                            : 'text-[var(--text-muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                        }`
                      }
                    >
                      <Icon name={item.icon} size={17} />
                      {t(item.labelKey)}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--border)] px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <SaveIndicator />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: settings.profile.avatarColor }}>
            {(settings.profile.name || user?.email || 'L').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate">{settings.profile.name || user?.email || t('auth.localMode')}</span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="btn-ghost !px-1.5 !py-1"
            title={t('auth.signOut')}
            aria-label={t('auth.signOut')}
          >
            <Icon name="logout" size={14} />
          </button>
        </div>
        <p className="text-[10px] text-[var(--text-muted)]">
          {mode === 'firebase' ? t('settings.storage.firebase') : t('settings.storage.local')}
        </p>
      </div>
    </div>
  );
}

function Topbar({ onOpenMenu, title }: { onOpenMenu: () => void; title: string }) {
  const t = useT();
  const settings = useSettings();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)]/90 px-4 py-2.5 backdrop-blur">
      <button type="button" className="btn-ghost lg:hidden" onClick={onOpenMenu} aria-label={t('a11y.menu')}>
        <Icon name="menu" size={20} />
      </button>
      <p className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--text)] sm:text-base">{title}</p>
      <div className="hidden sm:block">
        <SaveIndicator />
      </div>
      <button
        type="button"
        className="btn-ghost"
        aria-label={t('a11y.theme')}
        title={t('a11y.theme')}
        onClick={() => void updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
      >
        <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={17} />
      </button>
      <button
        type="button"
        className="btn-ghost text-xs font-bold"
        onClick={async () => {
          const next = settings.language === 'ar' ? 'en' : 'ar';
          await updateSettings({ language: next });
          toast.info('settings.saved');
        }}
        title={t('settings.language')}
      >
        {settings.language === 'ar' ? 'EN' : 'ع'}
      </button>
    </header>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const t = useT();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const title =
    SECTIONS.flatMap((s) => s.items).find((item) => (item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)))?.labelKey ??
    'app.name';

  return (
    <div className="flex h-full min-h-screen bg-[var(--surface-2)]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-e border-[var(--border)] lg:block">
        <Sidebar />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="animate-in absolute inset-y-0 start-0 w-64 border-e border-[var(--border)] shadow-2xl">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMenuOpen(true)} title={t(title)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6">{children}</main>
        <footer className="px-4 pb-6 text-center text-[11px] text-[var(--text-muted)] sm:px-6">
          {t('app.name')} — {t('app.tagline')}
        </footer>
      </div>
    </div>
  );
}

export function BootScreen({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--surface-2)] text-[var(--text-muted)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-extrabold text-white">L</span>
      <div className="flex items-center gap-2 text-sm">
        <Spinner size={15} />
        {label}
      </div>
    </div>
  );
}

export function ErrorScreen({ label, onRetry }: { label: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--surface-2)] px-6 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
        <Icon name="alert" size={20} />
      </span>
      <p className="text-sm text-[var(--text)]">{label}</p>
      {onRetry ? (
        <Button variant="primary" icon="reset" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      ) : null}
      <Badge tone="neutral">LifeOS</Badge>
    </div>
  );
}
