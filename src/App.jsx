import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { configured } from './lib/supabase';
import { Loading } from './components/ui';
import AppLayout from './layouts/AppLayout';
import AuthPage from './features/auth/AuthPage';
import AuthCallback from './features/auth/AuthCallback';
import NativeLinks from './features/auth/NativeLinks';
import SetupPage from './pages/SetupPage';
import NotFound from './pages/NotFound';
const Dashboard = lazy(() => import('./features/dashboard/Dashboard'));
const Finance = lazy(() => import('./features/finance/Finance'));
const Tuition = lazy(() => import('./features/teaching/Tuition'));
const StudentDetail = lazy(() => import('./features/teaching/StudentDetail'));
const Batches = lazy(() => import('./features/teaching/Batches'));
const BatchDetail = lazy(() => import('./features/teaching/BatchDetail'));
const Tasks = lazy(() => import('./features/tasks/Tasks'));
const Loans = lazy(() => import('./features/loans/Loans'));
const Notifications = lazy(() => import('./features/notifications/Notifications'));
const Settings = lazy(() => import('./features/settings/Settings'));
export default function App() {
  if (!configured) return <SetupPage />;
  return (
    <BrowserRouter>
      <NativeLinks />
      <Suspense
        fallback={
          <div className="content">
            <Loading />
          </div>
        }
      >
        <Routes>
          <Route path="login" element={<AuthPage key="login" mode="login" />} />
          <Route path="register" element={<AuthPage key="register" mode="register" />} />
          <Route path="forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
          <Route path="reset-password" element={<AuthPage key="reset" mode="reset" />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="finance" element={<Finance />} />
            <Route path="tuition" element={<Tuition />} />
            <Route path="tuition/:id" element={<StudentDetail />} />
            <Route path="batches" element={<Batches />} />
            <Route path="batches/:id" element={<BatchDetail />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="loans" element={<Loans />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
