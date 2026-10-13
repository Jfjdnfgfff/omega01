import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';

/* --------------------------------------------------------------- wrappers */

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className = '',
  htmlFor,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={className}>
      {label ? (
        <span className="mb-1.5 flex items-center gap-1">
          <label className="label !mb-0" htmlFor={htmlFor}>
            {label}
          </label>
          {required ? (
            <span className="text-xs font-bold text-red-500" aria-hidden="true">
              *
            </span>
          ) : null}
        </span>
      ) : null}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

/* ----------------------------------------------------------------- inputs */

interface BaseProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function TextField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <input id={id} aria-invalid={!!error} className={`input ${error ? 'input-error' : ''}`} {...rest} />
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  required,
  className,
  rows = 3,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <textarea
        id={id}
        aria-invalid={!!error}
        rows={rows}
        className={`input resize-y leading-relaxed ${error ? 'input-error' : ''}`}
        {...rest}
      />
    </Field>
  );
}

export function NumberField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-invalid={!!error}
        className={`input tabular-nums ${error ? 'input-error' : ''}`}
        {...rest}
      />
    </Field>
  );
}

export function DateField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <input id={id} type="date" aria-invalid={!!error} className={`input ${error ? 'input-error' : ''}`} {...rest} />
    </Field>
  );
}

export function TimeField({
  label,
  error,
  hint,
  required,
  className,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <input id={id} type="time" aria-invalid={!!error} className={`input tabular-nums ${error ? 'input-error' : ''}`} {...rest} />
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  required,
  className,
  options,
  ...rest
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className} htmlFor={id}>
      <select id={id} aria-invalid={!!error} className={`input ${error ? 'input-error' : ''}`} {...rest}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-medium text-[var(--text)]">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          checked ? 'bg-brand-600' : 'bg-[var(--surface-3)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? 'start-4.5 rtl:start-0.5 ltr:start-[18px]' : 'start-0.5'
          }`}
          style={{ insetInlineStart: checked ? '18px' : '2px' }}
        />
      </button>
    </label>
  );
}

/* --------------------------------------------------------------- checkbox */

export function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  tone = 'default',
}: {
  label?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  tone?: 'default' | 'brand';
}) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden="true"
        className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
          checked
            ? tone === 'brand'
              ? 'border-brand-600 bg-brand-600 text-white'
              : 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-[var(--border)] bg-[var(--surface)]'
        }`}
        style={{ height: 18, width: 18 }}
      >
        {checked ? (
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        ) : null}
      </span>
      {label ? <span className="text-sm text-[var(--text)]">{label}</span> : null}
    </label>
  );
}
