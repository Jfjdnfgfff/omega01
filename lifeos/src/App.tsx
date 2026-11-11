import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout, BootScreen, ErrorScreen } from '@/components/layout/AppLayout';
import { ToastHost } from '@/components/ui/ToastHost';
import { useAppState } from '@/lib/store/store';
import { bootstrap } from '@/lib/store/bootstrap';
import { useT } from '@/i18n';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { TasksPage } from '@/pages/TasksPage';
import { TimePage } from '@/pages/TimePage';
import { HabitsPage } from '@/pages/HabitsPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { NotesPage } from '@/pages/NotesPage';
import { ReviewsPage } from '@/pages/ReviewsPage';
import { FinancePage } from '@/pages/FinancePage';
import { CoachPage } from '@/pages/CoachPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function App() {
  const { phase } = useAppState();
  const t = useT();

  useEffect(() => {
    void bootstrap();
  }, []);

  if (phase === 'boot') return <BootScreen label={t('state.loading')} />;
  if (phase === 'error') return <ErrorScreen label={t('state.bootError')} onRetry={() => window.location.reload()} />;
  if (phase === 'auth') return <AuthPage />;

  return (
    <>
      <ToastHost />
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/time" element={<TimePage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AppLayout>
    </>
  );
}
