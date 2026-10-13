import { toast, useToasts } from '@/lib/store/toast';
import { useT } from '@/i18n';
import { Icon, type IconName } from '@/components/ui/Icon';

const TONES: Record<string, { cls: string; icon: IconName }> = {
  success: { cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', icon: 'check' },
  error: { cls: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300', icon: 'alert' },
  info: { cls: 'border-brand-500/40 bg-brand-500/10 text-brand-700 dark:text-brand-300', icon: 'sparkles' },
};

export function ToastHost() {
  const toasts = useToasts();
  const t = useT();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toastItem) => {
        const tone = TONES[toastItem.tone] ?? TONES.info;
        const [key, param] = toastItem.messageKey.split(':');
        return (
          <div
            key={toastItem.id}
            role="status"
            className={`animate-in pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur ${tone.cls}`}
          >
            <Icon name={tone.icon} size={16} />
            <span className="flex-1 leading-relaxed">{t(key, param ? { status: param } : toastItem.params)}</span>
            <button
              type="button"
              aria-label={t('a11y.close')}
              className="opacity-60 hover:opacity-100"
              onClick={() => toast.dismiss(toastItem.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
