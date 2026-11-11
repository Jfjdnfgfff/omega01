import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

/* ------------------------------------------------------------------ Card */

export function Card({ children, className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3 sm:px-5">
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 text-brand-600 dark:text-brand-400">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-bold text-[var(--text)]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  size?: 'sm' | 'md';
  loading?: boolean;
}

export function Button({ variant = 'secondary', icon, size = 'md', loading, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${VARIANTS[variant]} ${size === 'sm' ? '!px-2.5 !py-1.5 text-xs' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={14} /> : icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Badge */

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
  brand: 'border-brand-500/30 bg-brand-500/10 text-brand-700 dark:text-brand-300',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
};

export function Badge({ tone = 'neutral', children, icon }: { tone?: BadgeTone; children: ReactNode; icon?: IconName }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONES[tone]}`}>
      {icon ? <Icon name={icon} size={11} /> : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- Progress */

export function Progress({ value, tone = 'brand', showLabel = false }: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; showLabel?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tones = {
    brand: 'bg-brand-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  } as const;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div className={`h-full rounded-full transition-all duration-300 ${tones[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel ? <span className="w-9 text-end text-xs font-semibold tabular-nums text-[var(--text-muted)]">{clamped}%</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------ EmptyState */

export function EmptyState({
  title,
  description,
  action,
  icon = 'list',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-3)] text-[var(--text-muted)]">
        <Icon name={icon} size={20} />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------------------------------------- Spinner */

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-4 py-8 text-[var(--text-muted)]">
      <Spinner size={16} />
      {label ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card space-y-3 p-5">
      <div className="skeleton h-3 w-1/3" />
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-2 w-full" />
      <div className="skeleton h-2 w-4/5" />
    </div>
  );
}

/* -------------------------------------------------------- SegmentedControl */

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string; icon?: IconName }[];
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? 'bg-[var(--surface)] text-brand-700 shadow-sm dark:text-brand-300' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {opt.icon ? <Icon name={opt.icon} size={13} /> : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------- StatCard */

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  tone?: BadgeTone;
}) {
  const accents: Record<BadgeTone, string> = {
    neutral: 'text-[var(--text-muted)]',
    brand: 'text-brand-600 dark:text-brand-400',
    success: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-muted)]">{label}</span>
        {icon ? <span className={accents[tone]}><Icon name={icon} size={16} /></span> : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-[var(--text)]">{value}</p>
      {hint ? <div className="mt-1 text-xs text-[var(--text-muted)]">{hint}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-[var(--text)] sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
