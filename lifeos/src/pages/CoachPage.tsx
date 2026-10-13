import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CoachMessage } from '@/types';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, Spinner } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/fields';
import { useData, useSettings } from '@/lib/store/store';
import { updateSettings } from '@/lib/store/actions';
import { buildDailyPlan, buildDataContext, callLanguageModel, coachSystemPrompt, generateInsights, suggestTaskOrder } from '@/lib/domain/coach';
import { buildWeeklySummary } from '@/lib/domain/reviews';
import { goalProgress } from '@/lib/domain/goals';
import { sortByUrgency } from '@/lib/domain/tasks';
import { minutesToHuman, todayISO } from '@/lib/date';
import { uid } from '@/lib/id';
import { useLang, useT } from '@/i18n';
import { toast } from '@/lib/store/toast';

const KEY_STORAGE = 'lifeos:coach:key'; // ذاكرة الجلسة فقط عبر sessionStorage

type PromptKind = 'plan' | 'priorities' | 'goal' | 'week';

export function CoachPage() {
  const t = useT();
  const lang = useLang();
  const data = useData();
  const settings = useSettings();
  const today = todayISO();

  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showContext, setShowContext] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const aiEnabled = settings.coach.provider !== 'none';

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(KEY_STORAGE);
      if (stored) setApiKey(stored);
    } catch {
      /* sessionStorage غير متاح */
    }
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const insights = useMemo(() => generateInsights(data, settings, today), [data, settings, today]);
  const context = useMemo(() => buildDataContext(data, settings, lang, today), [data, settings, lang, today]);

  function localAnswer(kind: PromptKind): string {
    if (kind === 'plan') {
      const plan = buildDailyPlan(data, settings, today);
      if (plan.steps.length === 0) return t('coach.plan.empty');
      const lines = plan.steps.map((step) => `• ${step.start}–${step.end} — ${step.title} (${minutesToHuman(step.minutes, lang)}) [${t(`coach.reason.${step.reason}`)}]`);
      if (plan.deferred > 0) lines.push('', t('coach.plan.deferred', { count: plan.deferred }));
      return [t('coach.plan.title'), ...lines].join('\n');
    }
    if (kind === 'priorities') {
      const open = data.tasks.filter((task) => !task.archived && task.status !== 'done');
      const ordered = suggestTaskOrder(open, settings.dailyFocusTargetMinutes || 240, today);
      if (ordered.length === 0) return t('coach.plan.empty');
      return ordered
        .map((row, i) => `${i + 1}. ${row.task.title} — ${minutesToHuman(row.minutes, lang)} (${t(`priority.${row.task.priority}`)})`)
        .join('\n');
    }
    if (kind === 'goal') {
      const goal = [...data.goals].filter((g) => g.status === 'active').sort((a, b) => goalProgress(a, data.tasks) - goalProgress(b, data.tasks))[0];
      if (!goal) return t('goals.empty');
      const tasks = sortByUrgency(
        data.tasks.filter((task) => task.goalId === goal.id && task.status !== 'done'),
        today,
      ).slice(0, 5);
      return [
        `${t('goals.title')}: ${goal.title} (${goalProgress(goal, data.tasks)}%)`,
        goal.milestones.length
          ? goal.milestones.map((m) => `• ${m.done ? '✓' : '○'} ${m.title}`).join('\n')
          : `• ${t('goals.milestones.empty')}`,
        tasks.length ? ['', t('tasks.title'), ...tasks.map((task) => `  - ${task.title}`)].join('\n') : '',
      ].join('\n');
    }
    const summary = buildWeeklySummary(data, today, settings.weekStartsOn);
    return [
      `${t('reviews.stats.tasks')}: ${summary.stats.tasksCompleted}/${summary.stats.tasksPlanned}`,
      `${t('reviews.stats.focus')}: ${minutesToHuman(summary.stats.focusMinutes, lang)}`,
      `${t('reviews.stats.habits')}: ${summary.stats.habitAdherence}%`,
      `${t('reviews.stats.goals')}: ${summary.stats.goalsProgress}%`,
      summary.obstacles.length ? `${t('reviews.weekly.obstacles')}: ${summary.obstacles.map((o) => t(`reviews.obstacle.${o.key}`, { value: o.value })).join('، ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  function pushMessage(role: CoachMessage['role'], content: string, engine: CoachMessage['engine']) {
    setMessages((prev) => [...prev, { id: uid('msg'), role, content, engine, createdAt: new Date().toISOString() }]);
  }

  async function send(kind?: PromptKind) {
    const text = kind ? t(`coach.suggest.${kind}`) : input.trim();
    if (!text) return;
    setInput('');
    pushMessage('user', text, aiEnabled ? 'ai' : 'rules');

    if (!aiEnabled) {
      // وضع القواعد المحلية: إجابة محسوبة من البيانات، ومميَّزة بوضوح.
      const answer = kind ? localAnswer(kind) : localAnswer(guessKind(text));
      pushMessage('assistant', answer, 'rules');
      return;
    }

    if (!apiKey) {
      toast.error('coach.errors.noKey');
      return;
    }

    setBusy(true);
    const res = await callLanguageModel({
      baseUrl: settings.coach.baseUrl,
      apiKey,
      model: settings.coach.model,
      systemPrompt: coachSystemPrompt(lang, context, today),
      messages: messages.map((m) => ({ role: m.role, content: m.content })).concat({ role: 'user', content: text }),
    });
    setBusy(false);
    if (res.ok) {
      pushMessage('assistant', res.content, 'ai');
    } else {
      const [key, status] = (res.errorKey ?? 'coach.errors.network').split(':');
      toast.error(key, status ? { status } : undefined);
    }
  }

  function guessKind(text: string): PromptKind {
    const lower = text.toLowerCase();
    if (/(خطة|plan|يوم)/i.test(lower)) return 'plan';
    if (/(أولوي|priorit|ترتيب)/i.test(lower)) return 'priorities';
    if (/(هدف|goal)/i.test(lower)) return 'goal';
    if (/(أسبوع|week)/i.test(lower)) return 'week';
    return 'plan';
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('coach.title')}
        subtitle={t('coach.subtitle')}
        actions={
          <Badge tone={aiEnabled ? 'success' : 'neutral'} icon={aiEnabled ? 'sparkles' : 'alert'}>
            {aiEnabled ? t('coach.mode.ai') : t('coach.mode.ai.inactive')}
          </Badge>
        }
      />

      {!aiEnabled ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
          <Icon name="alert" size={14} />
          <span className="flex-1">{t('coach.mode.ai.inactiveHint')}</span>
          <Link to="/settings" className="btn-secondary !py-1 text-xs">
            {t('nav.settings')}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="flex h-[520px] flex-col">
            <CardHeader
              title={t('coach.ask')}
              subtitle={aiEnabled ? `${settings.coach.model}` : t('coach.mode.rules.hint')}
              icon="sparkles"
            />
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <EmptyState icon="sparkles" title={t('coach.ask')} description={t('coach.dataDisclaimer')} />
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-brand-600 text-white'
                          : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]'
                      }`}
                    >
                      {message.content}
                      {message.role === 'assistant' ? (
                        <p className="mt-2 flex items-center gap-1 text-[10px] opacity-70">
                          <Icon name={message.engine === 'ai' ? 'sparkles' : 'chart'} size={11} />
                          {message.engine === 'ai' ? t('coach.mode.ai') : t('coach.mode.rules')}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              {busy ? (
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Spinner size={13} />
                  {t('coach.thinking')}
                </div>
              ) : null}
            </div>

            {aiEnabled ? (
              <div className="border-t border-[var(--border)] p-3">
                <TextField
                  label={t('settings.coachKey')}
                  type="password"
                  dir="ltr"
                  value={apiKey}
                  hint={t('settings.coachKeyHint')}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    try {
                      sessionStorage.setItem(KEY_STORAGE, e.target.value);
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              </div>
            ) : null}

            <div className="flex items-center gap-2 border-t border-[var(--border)] p-3">
              <input
                className="input"
                placeholder={t('coach.ask')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !busy) void send();
                }}
              />
              <Button variant="primary" icon="check" loading={busy} onClick={() => void send()}>
                {t('coach.send')}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title={t('coach.suggestions')} icon="list" />
            <div className="flex flex-wrap gap-2 p-3">
              {(['plan', 'priorities', 'goal', 'week'] as PromptKind[]).map((kind) => (
                <button key={kind} type="button" className="chip" onClick={() => void send(kind)}>
                  <Icon name="sparkles" size={12} />
                  {t(`coach.suggest.${kind}`)}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('coach.insights')} subtitle={t('coach.mode.rules.hint')} icon="chart" />
            <div className="space-y-2 p-3">
              {insights.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">{t('coach.insights.empty')}</p>
              ) : (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className={`rounded-lg border p-3 ${
                      insight.kind === 'risk'
                        ? 'border-red-500/30 bg-red-500/5'
                        : insight.kind === 'focus'
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-emerald-500/30 bg-emerald-500/5'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text)]">{t(insight.titleKey)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t(insight.detailKey, insight.params)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={t('coach.contextPreview')}
              subtitle={t('coach.privacy')}
              icon="note"
              action={
                <Button size="sm" variant="ghost" onClick={() => setShowContext((s) => !s)}>
                  {showContext ? t('common.showLess') : t('common.showMore')}
                </Button>
              }
            />
            {showContext ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-4 text-[11px] leading-relaxed text-[var(--text-muted)]">{context}</pre>
            ) : null}
          </Card>
        </div>
      </div>

      {!aiEnabled ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{t('settings.coachProvider')}</p>
              <p className="text-xs text-[var(--text-muted)]">{t('coach.mode.ai.inactiveHint')}</p>
            </div>
            <Button
              onClick={async () => {
                await updateSettings({ coach: { ...settings.coach, provider: 'openai-compatible' } });
                toast.success('settings.saved');
              }}
            >
              {t('settings.coachProvider.openai')}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
