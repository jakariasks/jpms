import { useState } from 'react';
import { CheckCheck, CalendarCheck, Flag, Clock } from 'lucide-react';
import { useWorkspace, useAction } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../../services/api';
import {
  PageHeader,
  AddButton,
  QueryState,
  Card,
  Tabs,
  Badge,
  Actions,
  RecordForm,
  DeleteDialog,
  Empty,
  Stat,
  Filter,
} from '../../components/ui';
import { todayIn, displayDate, localDateTime } from '../../utils/domain';
export default function Tasks() {
  const query = useWorkspace();
  const action = useAction();
  const { profile } = useAuth();
  const today = todayIn(profile?.timezone);
  const [tab, setTab] = useState('today'),
    [priority, setPriority] = useState(''),
    [search, setSearch] = useState(''),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const fields = [
    { name: 'title', label: 'Task title', required: true, wide: true },
    { name: 'date', label: 'Due date', type: 'date', required: true },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: ['high', 'medium', 'low'],
      required: true,
    },
    {
      name: 'reminder_at',
      label: 'Reminder (this device’s time)',
      type: 'datetime-local',
      wide: true,
      note: 'Optional. If blank, a reminder appears on the due date.',
    },
    { name: 'description', label: 'Description', type: 'textarea', wide: true },
  ];
  return (
    <>
      <PageHeader
        title="Daily tasks"
        description="Give your priorities a place. Take them one at a time."
      >
        <AddButton onClick={() => setEditing({})}>Create task</AddButton>
      </PageHeader>
      <QueryState query={query}>
        {(data) => {
          const todays = data.tasks.filter((t) => t.date === today),
            done = todays.filter((t) => t.status === 'completed').length,
            overdue = data.tasks.filter((t) => t.date < today && t.status === 'todo');
          const rows = data.tasks
            .filter(
              (t) =>
                (tab === 'today'
                  ? t.date === today && t.status === 'todo'
                  : tab === 'upcoming'
                    ? t.date > today && t.status === 'todo'
                    : tab === 'overdue'
                      ? t.date < today && t.status === 'todo'
                      : t.status === 'completed') &&
                (!priority || t.priority === priority) &&
                `${t.title} ${t.description}`.toLowerCase().includes(search.toLowerCase()),
            )
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) ||
                { high: 0, medium: 1, low: 2 }[a.priority] -
                  { high: 0, medium: 1, low: 2 }[b.priority],
            );
          return (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Stat
                  label="Today’s to-do"
                  value={todays.length - done}
                  detail="Small steps, steady progress"
                  icon={CalendarCheck}
                />
                <Stat
                  label="Completed today’s tasks"
                  value={`${done} / ${todays.length}`}
                  icon={CheckCheck}
                />
                <Stat
                  label="Overdue"
                  value={overdue.length}
                  detail="A chance to re-plan"
                  icon={Clock}
                  tone="amber"
                />
              </div>
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'today', label: 'Today' },
                  { value: 'upcoming', label: 'Upcoming' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
              <Card className="mt-5">
                <div className="filter-bar">
                  <Filter label="Search tasks">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="What are you working on?"
                    />
                  </Filter>
                  <Filter label="Priority" className="!flex-none">
                    <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="">All priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </Filter>
                </div>
                {rows.length ? (
                  rows.map((task) => (
                    <div className="list-row flex-wrap sm:flex-nowrap" key={task.id}>
                      <input
                        className="check-task"
                        type="checkbox"
                        checked={task.status === 'completed'}
                        disabled={action.isPending}
                        aria-label={`${task.status === 'completed' ? 'Reopen' : 'Complete'} ${task.title}`}
                        onChange={() =>
                          action
                            .run(
                              (uid) =>
                                api.save(
                                  'tasks',
                                  { status: task.status === 'completed' ? 'todo' : 'completed' },
                                  uid,
                                  task.id,
                                ),
                              task.status === 'completed' ? 'Task reopened' : 'Task completed',
                            )
                            .catch(() => {})
                        }
                      />
                      <div className="row-main">
                        <strong className={task.status === 'completed' ? 'line-through muted' : ''}>
                          {task.title}
                        </strong>
                        {task.description && <p>{task.description}</p>}
                        <p>
                          {displayDate(task.date)}
                          {task.reminder_at &&
                            ` · Reminder ${new Date(task.reminder_at).toLocaleString('en-GB', { timeZone: profile?.timezone || 'Asia/Dhaka', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                        </p>
                      </div>
                      <Badge
                        tone={
                          task.priority === 'high'
                            ? 'red'
                            : task.priority === 'medium'
                              ? 'amber'
                              : 'green'
                        }
                      >
                        {task.priority}
                      </Badge>
                      <Actions
                        label={task.title}
                        onEdit={() => setEditing(task)}
                        onDelete={() =>
                          setDeleting({ table: 'tasks', id: task.id, label: task.title })
                        }
                      />
                    </div>
                  ))
                ) : (
                  <Empty
                    icon={Flag}
                    title={`No ${tab} tasks`}
                    description="Add a task or adjust your filters."
                  />
                )}
              </Card>
            </>
          );
        }}
      </QueryState>
      {editing && (
        <RecordForm
          title={editing.id ? 'Edit task' : 'Create task'}
          table="tasks"
          record={{ ...editing, reminder_at: localDateTime(editing.reminder_at) }}
          defaults={{ title: '', date: today, priority: 'medium', description: '' }}
          fields={fields}
          transform={(v) => ({
            ...v,
            title: v.title.trim(),
            reminder_at: v.reminder_at ? new Date(v.reminder_at).toISOString() : null,
          })}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
