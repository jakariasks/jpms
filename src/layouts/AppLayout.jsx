import { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink, Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  LayoutDashboard,
  Wallet,
  GraduationCap,
  UsersRound,
  ListTodo,
  HandCoins,
  Bell,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/AuthProvider';
import { useTheme } from '../hooks/useTheme';
import { useWorkspace } from '../hooks/useWorkspace';
import { todayIn, displayDate } from '../utils/domain';
import { errorMessage } from '../services/api';
import { Loading, QueryState, Button } from '../components/ui';
import ProfileAvatar from '../components/ProfileAvatar';
import TransactionForm from '../features/finance/TransactionForm';
const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/finance', label: 'Finance', icon: Wallet },
  { to: '/tuition', label: 'Private tuition', icon: GraduationCap },
  { to: '/batches', label: 'SSC batches', icon: UsersRound },
  { to: '/tasks', label: 'Daily tasks', icon: ListTodo },
  { to: '/loans', label: 'Loans', icon: HandCoins },
  { to: '/notifications', label: 'Reminders', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];
function Navigation({ onNavigate }) {
  return (
    <nav aria-label="Main navigation">
      {nav.map(({ to, label, icon: Icon }, i) => (
        <div key={to}>
          {[0, 6].includes(i) && (
            <p className="nav-group-label">{i === 0 ? 'Your workspace' : 'Personal'}</p>
          )}
          <NavLink
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        </div>
      ))}
    </nav>
  );
}
function useBrowserAlerts(data, user) {
  useEffect(() => {
    if (!data || !user || !('Notification' in window) || Notification.permission !== 'granted')
      return;
    try {
      if (localStorage.getItem(`jpms-alerts-${user.id}`) !== 'on') return;
      const key = `jpms-alerted-${user.id}`;
      const seen = new Set(JSON.parse(sessionStorage.getItem(key) || '[]'));
      const fresh = data.notifications
        .filter((n) => !n.read_at && !seen.has(n.id))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      fresh.slice(0, 3).forEach((n) => {
        try {
          const alert = new Notification(n.title, {
            body: n.body,
            tag: n.id,
            icon: '/favicon.svg',
          });
          alert.onclick = () => {
            window.focus();
            window.location.assign(n.link);
          };
        } catch {}
      });
      fresh.forEach((n) => seen.add(n.id));
      sessionStorage.setItem(key, JSON.stringify([...seen].slice(-500)));
    } catch {}
  }, [data, user]);
}
export default function AppLayout() {
  const { user, loading, profile, profileQuery, signOut, recovering, authError } = useAuth();
  const { isDark, setTheme } = useTheme();
  const query = useWorkspace();
  const location = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const openTransaction = useCallback(({ kind = 'expense', record, onSaved } = {}) => {
    setTransaction({ kind: kind === 'income' ? 'income' : 'expense', record, onSaved });
  }, []);
  const menuRef = useRef(null);
  useEffect(() => {
    if (profile?.theme) setTheme(profile.theme);
  }, [profile?.id, profile?.theme, setTheme]);
  useEffect(() => {
    setDrawer(false);
    setTransaction(null);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useBrowserAlerts(query.data, user);
  if (loading)
    return (
      <main className="fatal">
        <Loading />
      </main>
    );
  if (authError)
    return (
      <main className="fatal">
        <h1>Session unavailable</h1>
        <p>{errorMessage(authError)}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (recovering) return <Navigate to="/reset-password" replace />;
  const current = nav.find((n) =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to),
  );
  const unread = query.data?.notifications.filter((n) => !n.read_at).length || 0;
  async function logout() {
    setLeaving(true);
    try {
      await signOut();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLeaving(false);
    }
  }
  const brand = (
    <Link to="/" className="brand">
      <span className="brand-mark">J</span>
      <div>
        JPMS<small>Life, organized</small>
      </div>
    </Link>
  );
  return (
    <div className="app-shell">
      <a className="sr-only focus:not-sr-only" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        {brand}
        <Navigation />
        <div className="sidebar-footer">
          <Link to="/settings" className="profile-mini">
            <ProfileAvatar />
            <div>
              <p className="name">{profile?.name || 'My workspace'}</p>
              <p className="text-xs text-[#b3cabc]">Personal account</p>
            </div>
          </Link>
          <button className="nav-link mt-4 w-full" disabled={leaving} onClick={logout}>
            <LogOut size={17} />
            {leaving ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="flex items-center gap-2">
            <button
              ref={menuRef}
              className="icon-btn mobile-menu"
              onClick={() => setDrawer(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <p className="topbar-title">{current?.label || 'Workspace'}</p>
          </div>
          <div className="topbar-actions">
            <span className="date-label">
              {displayDate(todayIn(profile?.timezone), { weekday: 'short' })}
            </span>
            <button
              className="icon-btn"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link
              className="icon-btn relative"
              to="/notifications"
              aria-label={`Reminders, ${unread} unread`}
            >
              <Bell size={19} />
              {unread > 0 && <span className="notification-dot" />}
            </Link>
            <Link to="/settings" className="profile-link ml-2" aria-label="Your profile">
              <ProfileAvatar />
            </Link>
          </div>
        </header>
        <main className="content" id="main-content">
          <QueryState query={profileQuery}>
            {() => <Outlet context={{ openTransaction }} />}
          </QueryState>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Quick navigation">
        {[nav[0], nav[1], null, nav[2], nav[4]].map((item) => {
          if (!item)
            return (
              <button
                key="add"
                type="button"
                className="mobile-add"
                aria-label="Add income or expense"
                aria-haspopup="dialog"
                disabled={!profile}
                onClick={() => openTransaction()}
              >
                <span className="mobile-add-circle">
                  <Plus size={27} aria-hidden="true" />
                </span>
                <span>Add</span>
              </button>
            );
          const { to, label, icon: Icon } = item;
          return (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={21} aria-hidden="true" />
              <span>
                {{ Overview: 'Home', 'Private tuition': 'Tuition', 'Daily tasks': 'Tasks' }[
                  label
                ] || label}
              </span>
            </NavLink>
          );
        })}
      </nav>
      {transaction && (
        <TransactionForm
          initialKind={transaction.kind}
          record={transaction.record}
          onSaved={transaction.onSaved}
          onClose={() => setTransaction(null)}
        />
      )}
      <Dialog.Root open={drawer} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="drawer-content"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              menuRef.current?.focus();
            }}
          >
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Choose a module</Dialog.Description>
            <div className="flex items-start justify-between">
              {brand}
              <Dialog.Close className="icon-btn" aria-label="Close navigation">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Link
              className="profile-mini drawer-profile"
              to="/settings"
              onClick={() => setDrawer(false)}
            >
              <ProfileAvatar />
              <div>
                <p className="name">{profile?.name || 'My workspace'}</p>
                <p className="text-sm text-[#b3cabc]">View profile</p>
              </div>
            </Link>
            <Navigation onNavigate={() => setDrawer(false)} />
            <button className="nav-link mt-5 w-full" disabled={leaving} onClick={logout}>
              <LogOut size={19} />
              Sign out
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
