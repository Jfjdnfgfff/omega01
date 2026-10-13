import { useId } from 'react';

/**
 * رسوم بيانية بسيطة مبنية على SVG مباشرة:
 * خفيفة، تعمل مع RTL، ولا تُستخدم للزينة — كل رسم مرتبط ببيانات حقيقية.
 */

export interface BarDatum {
  label: string;
  value: number;
  hint?: string;
}

export function BarChart({
  data,
  height = 120,
  rtl = false,
  formatValue = (v: number) => String(v),
  color = '#2563eb',
}: {
  data: BarDatum[];
  height?: number;
  rtl?: boolean;
  formatValue?: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const ordered = rtl ? [...data].reverse() : data;
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {ordered.map((d, i) => {
          const h = Math.round((d.value / max) * 100);
          return (
            <div key={`${d.label}-${i}`} className="group flex flex-1 flex-col items-center justify-end gap-1" title={d.hint ?? `${d.label}: ${formatValue(d.value)}`}>
              <span className="text-[10px] font-semibold tabular-nums text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100">
                {d.value > 0 ? formatValue(d.value) : ''}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(2, h)}%`,
                  backgroundColor: d.value > 0 ? color : 'var(--surface-3)',
                  minHeight: 3,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {ordered.map((d, i) => (
          <span key={`l-${d.label}-${i}`} className="flex-1 truncate text-center text-[10px] text-[var(--text-muted)]">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 140,
  thickness = 16,
  centerLabel,
  centerValue,
}: {
  segments: Segment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const id = useId();
  const total = segments.reduce((s, x) => s + x.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
        {total > 0 &&
          segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={`${id}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return el;
          })}
        {centerValue ? (
          <text x="50%" y="48%" textAnchor="middle" className="fill-[var(--text)] text-lg font-extrabold" fontSize="18">
            {centerValue}
          </text>
        ) : null}
        {centerLabel ? (
          <text x="50%" y="62%" textAnchor="middle" className="fill-[var(--text-muted)]" fontSize="10">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <ul className="flex-1 space-y-1.5">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-[var(--text)]">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({
  values,
  height = 44,
  color = '#2563eb',
  labels = [],
  formatValue = (v: number) => String(v),
}: {
  values: number[];
  height?: number;
  color?: string;
  labels?: string[];
  formatValue?: (value: number) => string;
}) {
  const id = useId();
  const width = 240;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((v, i) => `${i * step},${height - (v / max) * (height - 6) - 3}`);
  const area = `M0,${height} L${points.join(' L')} L${width},${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#grad-${id})`} />
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {values.map((v, i) => (
          <circle key={`p-${i}`} cx={i * step} cy={height - (v / max) * (height - 6) - 3} r="2.2" fill={color}>
            <title>{`${labels[i] ?? ''} ${formatValue(v)}`}</title>
          </circle>
        ))}
      </svg>
      {labels.length > 0 ? (
        <div className="mt-1 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>{labels[0]}</span>
          <span>{labels[labels.length - 1]}</span>
        </div>
      ) : null}
    </div>
  );
}

/** شبكة أيام الشهر — تُستخدم لتقويم الالتزام بالعادات */
export function MonthGrid({
  days,
  onSelect,
  weekdayLabels,
  firstWeekday = 0,
  rtl = false,
}: {
  days: { date: string; day: number; state: 'met' | 'missed' | 'future' | 'pending' }[];
  onSelect?: (date: string) => void;
  weekdayLabels: string[];
  firstWeekday?: number;
  rtl?: boolean;
}) {
  const orderedWeekdays = (() => {
    const out: string[] = [];
    for (let i = 0; i < 7; i += 1) out.push(weekdayLabels[(i + firstWeekday) % 7]);
    return rtl ? [...out].reverse() : out;
  })();

  const stateStyles: Record<string, string> = {
    met: 'bg-brand-600 text-white',
    missed: 'bg-red-500/15 text-red-600 dark:text-red-400',
    future: 'bg-transparent text-[var(--text-muted)]/50',
    pending: 'bg-[var(--surface-3)] text-[var(--text)]',
  };

  return (
    <div dir={rtl ? 'rtl' : 'ltr'}>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {orderedWeekdays.map((label) => (
          <span key={label} className="text-center text-[10px] font-semibold text-[var(--text-muted)]">
            {label.slice(0, 2)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            disabled={!onSelect || d.state === 'future'}
            onClick={() => onSelect?.(d.date)}
            className={`flex aspect-square items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-colors ${stateStyles[d.state]} ${
              onSelect && d.state !== 'future' ? 'hover:ring-2 hover:ring-brand-500/40' : ''
            }`}
            title={d.date}
          >
            {d.day}
          </button>
        ))}
      </div>
    </div>
  );
}
