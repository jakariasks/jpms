import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Check, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkspace, useAction } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../../services/api';
import { PageHeader, QueryState, Card, Tabs, Button, Badge, Empty } from '../../components/ui';
export default function Notifications() {
  const query = useWorkspace();
  const action = useAction();
  const { user, profile } = useAuth();
  const [view, setView] = useState('unread');
  async function enable() {
    if (!('Notification' in window)) {
      toast.info('This browser cannot show desktop alerts. Your reminder inbox is available here.');
      return;
    }
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        localStorage.setItem(`jpms-alerts-${user.id}`, 'on');
        toast.success('Browser alerts enabled while JPMS is open');
        query.refetch();
      } else toast.info('You can continue using the reminder inbox without browser permission.');
    } catch {
      toast.error('Browser alerts are unavailable on this device.');
    }
  }
  return (
    <>
      <PageHeader
        title="Reminders"
        description="A little nudge for the things that need your attention."
      >
        <Button variant="secondary" icon={Bell} onClick={enable}>
          Enable browser alerts
        </Button>
        <Button
          variant="secondary"
          icon={RefreshCw}
          busy={query.isFetching}
          onClick={() => query.refetch()}
        >
          Refresh
        </Button>
      </PageHeader>
      <QueryState query={query}>
        {(data) => {
          const rows = data.notifications
            .filter((n) => view === 'all' || !n.read_at)
            .sort((a, b) => b.created_at.localeCompare(a.created_at));
          return (
            <>
              <div className="flex justify-between gap-3 flex-wrap items-center mb-5">
                <Tabs
                  value={view}
                  onChange={setView}
                  items={[
                    {
                      value: 'unread',
                      label: `Unread (${data.notifications.filter((n) => !n.read_at).length})`,
                    },
                    { value: 'all', label: 'All reminders' },
                  ]}
                />
                <Button
                  variant="secondary"
                  icon={CheckCheck}
                  busy={action.isPending}
                  disabled={!data.notifications.some((n) => !n.read_at)}
                  onClick={() =>
                    action
                      .run((uid) => api.markAllRead(uid), 'All reminders marked read')
                      .catch(() => {})
                  }
                >
                  Mark all read
                </Button>
              </div>
              <Card>
                {rows.length ? (
                  rows.map((n) => (
                    <div className="list-row" key={n.id}>
                      <span className="stat-icon">
                        <Clock size={18} />
                      </span>
                      <div className="row-main">
                        <div className="flex gap-2 items-center flex-wrap">
                          <strong>{n.title}</strong>
                          <Badge tone={n.read_at ? 'neutral' : 'green'}>{n.kind}</Badge>
                        </div>
                        <p>{n.body}</p>
                        <p>
                          {new Date(n.created_at).toLocaleString('en-GB', {
                            timeZone: profile?.timezone || 'Asia/Dhaka',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <Link
                          className="text-link mt-2"
                          to={n.link}
                          onClick={() => {
                            if (!n.read_at)
                              action
                                .run(
                                  (uid) =>
                                    api.save(
                                      'notifications',
                                      { read_at: new Date().toISOString() },
                                      uid,
                                      n.id,
                                    ),
                                  '',
                                )
                                .catch(() => {});
                          }}
                        >
                          Open
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                      <button
                        className="icon-btn"
                        title={n.read_at ? 'Mark unread' : 'Mark read'}
                        aria-label={`${n.read_at ? 'Mark unread' : 'Mark read'}: ${n.title}`}
                        disabled={action.isPending}
                        onClick={() =>
                          action
                            .run(
                              (uid) =>
                                api.save(
                                  'notifications',
                                  { read_at: n.read_at ? null : new Date().toISOString() },
                                  uid,
                                  n.id,
                                ),
                              'Reminder updated',
                            )
                            .catch(() => {})
                        }
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Bell}
                    title="You’re all caught up"
                    description="Payment dues, scheduled classes, tasks and loans appear when a reminder is due."
                  />
                )}
              </Card>
              <div className="notice mt-5">
                The open app refreshes every minute. Browser alerts require JPMS to remain open.
                Optional Supabase Cron creates inbox reminders even when the app is closed; see the
                README.
              </div>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
