import { useState, useSyncExternalStore } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  GraduationCap,
  CalendarCheck,
  HandCoins,
  Receipt,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useWorkspace, useAction } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import {
  PageHeader,
  Card,
  Stat,
  QueryState,
  Empty,
  Badge,
  TextLink,
  Filter,
  Button,
} from '../../components/ui';
import {
  todayIn,
  monthOf,
  money,
  summary,
  invoiceBalance,
  loanBalance,
  trend,
  categories,
  displayDate,
  minor,
} from '../../utils/domain';
import { api } from '../../services/api';
// Match the existing navigation breakpoint. Do not mount desktop charts on phones.
const mobileQuery = '(max-width: 780px)';
function subscribeToViewport(onChange) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}
const isMobileViewport = () => window.matchMedia(mobileQuery).matches;
const desktopFallback = () => false;

function MobileHome({ query, profile, today, openTransaction }) {
  return (
    <div className="mobile-home">
      <header className="mobile-home-heading">
        <p>{displayDate(today, { weekday: 'long', year: undefined })}</p>
        <h1>Hello, {profile?.name?.trim().split(/\s+/)[0] || 'Jakaria'}</h1>
      </header>
      <QueryState query={query}>
        {(data) => {
          const sums = summary(data, monthOf(today));
          const tasks = data.tasks.filter((task) => task.date === today);
          const remaining = tasks.filter((task) => task.status === 'todo').length;
          return (
            <>
              <section className="mobile-balance" aria-label="Savings and this month's finances">
                <div className="mobile-balance-heading">
                  <h2>Current savings</h2>
                  <Link
                    to="/finance"
                    className="mobile-balance-link"
                    aria-label="View finance reports"
                  >
                    <ArrowUpRight size={23} aria-hidden="true" />
                  </Link>
                </div>
                <p className="mobile-balance-value">{money(sums.savings)}</p>
                <p className="mobile-balance-note">All-time income minus expenses</p>
                <div className="mobile-cashflow">
                  <div>
                    <p>
                      <ArrowUpRight size={16} aria-hidden="true" />
                      Income this month
                    </p>
                    <strong>{money(sums.income)}</strong>
                  </div>
                  <div>
                    <p>
                      <ArrowDownRight size={16} aria-hidden="true" />
                      Expense this month
                    </p>
                    <strong>{money(sums.expense)}</strong>
                  </div>
                </div>
              </section>
              <div className="mobile-home-actions">
                <Button icon={Plus} onClick={() => openTransaction({ kind: 'expense' })}>
                  Add expense
                </Button>
                <Button
                  variant="secondary"
                  icon={Plus}
                  onClick={() => openTransaction({ kind: 'income' })}
                >
                  Add income
                </Button>
              </div>
              <Link className="mobile-today" to="/tasks">
                <span className="mobile-today-icon">
                  <CalendarCheck size={23} aria-hidden="true" />
                </span>
                <div>
                  <h2>Today's tasks</h2>
                  <p>
                    {tasks.length
                      ? remaining
                        ? `${remaining} left to complete`
                        : 'All done for today'
                      : 'Plan your day'}
                  </p>
                </div>
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}
const COLORS = ['#198765', '#6ba987', '#a3bd62', '#6088ab', '#c49e6e'];
const tooltip = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
};
function CategoryChart({ title, rows }) {
  const data = categories(rows);
  return (
    <Card>
      <div className="card-head">
        <div>
          <h2>{title}</h2>
          <p>Selected month · BDT</p>
        </div>
      </div>
      {data.length ? (
        <>
          <div className="chart-area !h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart accessibilityLayer>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((item, i) => (
                    <Cell key={item.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => money(v)} contentStyle={tooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {data.map((item, i) => (
              <span key={item.name} className="legend-item">
                <span className="legend-swatch" style={{ background: COLORS[i % COLORS.length] }} />
                {item.name} · {money(item.value)}
              </span>
            ))}
          </div>
        </>
      ) : (
        <Empty
          title="No transactions this month"
          description="Add transactions to see your category breakdown."
        />
      )}
    </Card>
  );
}
export default function Dashboard() {
  const query = useWorkspace();
  const action = useAction();
  const { profile } = useAuth();
  const { openTransaction } = useOutletContext();
  const mobile = useSyncExternalStore(subscribeToViewport, isMobileViewport, desktopFallback);
  const today = todayIn(profile?.timezone);
  const [selectedMonth, setMonth] = useState(null);
  const month = selectedMonth ?? monthOf(today);
  if (mobile)
    return (
      <MobileHome query={query} profile={profile} today={today} openTransaction={openTransaction} />
    );
  return (
    <>
      <PageHeader
        eyebrow="Your personal workspace"
        title={`Hello, ${profile?.name?.split(' ')[0] || 'Jakaria'} 👋`}
        description="Here’s where things stand. Make today count."
      >
        <Filter label="Report month" className="!flex-none">
          <input
            type="month"
            min="2000-01"
            max="2100-12"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
        </Filter>
        <Button icon={Plus} onClick={() => openTransaction({ kind: 'expense' })}>
          Add expense
        </Button>
        <Button variant="secondary" icon={Plus} onClick={() => openTransaction({ kind: 'income' })}>
          Add income
        </Button>
      </PageHeader>
      <QueryState query={query}>
        {(data) => {
          const sums = summary(data, month),
            todayTasks = data.tasks.filter((t) => t.date === today),
            done = todayTasks.filter((t) => t.status === 'completed').length;
          const todo = data.tasks
            .filter((t) => t.date <= today && t.status === 'todo')
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) ||
                { high: 0, medium: 1, low: 2 }[a.priority] -
                  { high: 0, medium: 1, low: 2 }[b.priority],
            );
          const unpaid = data.invoices
            .map((i) => ({ ...i, balance: invoiceBalance(i, data.payments) }))
            .filter((i) => i.balance > 0)
            .sort((a, b) => a.due_date.localeCompare(b.due_date));
          const borrowed =
              data.loans
                .filter((l) => l.type === 'Borrowed')
                .reduce((s, l) => s + minor(loanBalance(l)), 0) / 100,
            lent =
              data.loans
                .filter((l) => l.type === 'Lent')
                .reduce((s, l) => s + minor(loanBalance(l)), 0) / 100;
          return (
            <>
              <div className="stat-grid">
                <Stat
                  label="Today’s tasks"
                  value={todayTasks.length - done}
                  detail={`${done} of ${todayTasks.length} completed`}
                  icon={CalendarCheck}
                />
                <Stat
                  label="Monthly income"
                  value={money(sums.income)}
                  detail="Including tuition & batch receipts"
                  icon={ArrowUpRight}
                />
                <Stat
                  label="Monthly expense"
                  value={money(sums.expense)}
                  detail="Money spent this month"
                  icon={ArrowDownRight}
                  tone="red"
                />
                <Stat
                  label="Current savings"
                  value={money(sums.savings)}
                  detail="All-time income minus expense"
                  icon={Wallet}
                />
                <Stat
                  label="Total students"
                  value={
                    data.students.filter((s) => s.active).length +
                    data.batch_students.filter(
                      (s) => s.active && data.batches.some((b) => b.id === s.batch_id && b.active),
                    ).length
                  }
                  detail="Active private + batch enrolments"
                  icon={GraduationCap}
                  tone="blue"
                />
                <Stat
                  label="Pending payments"
                  value={money(unpaid.reduce((s, i) => s + minor(i.balance), 0) / 100)}
                  detail={`${unpaid.length} unpaid monthly invoices`}
                  icon={Receipt}
                  tone="amber"
                />
                <Stat
                  label="Loan balance"
                  value={money(borrowed)}
                  detail={`${money(lent)} to receive`}
                  icon={HandCoins}
                  tone="blue"
                />
                <Card className="focus-card">
                  <p className="text-sm">Today’s progress</p>
                  <p className="text-2xl font-semibold mt-2">
                    {todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0}% complete
                  </p>
                  <div
                    className="focus-progress"
                    role="progressbar"
                    aria-label="Today's tasks complete"
                    aria-valuenow={done}
                    aria-valuemin={0}
                    aria-valuemax={todayTasks.length || 1}
                  >
                    <span
                      style={{
                        width: `${todayTasks.length ? (done / todayTasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <Link className="text-sm flex items-center gap-2" to="/tasks">
                    Plan the next step
                    <ArrowRight size={15} />
                  </Link>
                </Card>
              </div>
              <div className="dashboard-lower">
                <Card>
                  <div className="card-head">
                    <div>
                      <h2>Income & expenses</h2>
                      <p>The last six months at a glance</p>
                    </div>
                    <Badge>BDT</Badge>
                  </div>
                  <div className="chart-area">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={trend(data, month)}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        accessibilityLayer
                      >
                        <defs>
                          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#198765" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#198765" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeDasharray="3 5"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          width={55}
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                        />
                        <Tooltip formatter={(v) => money(v)} contentStyle={tooltip} />
                        <Area
                          type="monotone"
                          dataKey="Income"
                          stroke="#198765"
                          fill="url(#incomeFill)"
                          strokeWidth={3}
                        />
                        <Area
                          type="monotone"
                          dataKey="Expense"
                          stroke="#bc8e63"
                          fill="transparent"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <i className="legend-swatch bg-[#198765]" />
                      Income
                    </span>
                    <span className="legend-item">
                      <i className="legend-swatch bg-[#bc8e63]" />
                      Expense
                    </span>
                  </div>
                </Card>
                <Card>
                  <div className="card-head">
                    <div>
                      <h2>Your daily focus</h2>
                      <p>Today and anything carried forward</p>
                    </div>
                    <TextLink to="/tasks">View all</TextLink>
                  </div>
                  {todo.length ? (
                    todo.slice(0, 5).map((task) => (
                      <div className="list-row" key={task.id}>
                        <input
                          className="check-task"
                          type="checkbox"
                          checked={false}
                          disabled={action.isPending}
                          aria-label={`Complete ${task.title}`}
                          onChange={() =>
                            action
                              .run(
                                (uid) => api.save('tasks', { status: 'completed' }, uid, task.id),
                                'Task completed',
                              )
                              .catch(() => {})
                          }
                        />
                        <div className="row-main">
                          <strong>{task.title}</strong>
                          <p>
                            {task.date < today ? `Overdue · ${displayDate(task.date)}` : 'Today'}
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
                      </div>
                    ))
                  ) : (
                    <Empty
                      title="A clear day ahead"
                      description="Give your day a little direction."
                      action={
                        <Link className="btn btn-secondary" to="/tasks">
                          Plan your day
                        </Link>
                      }
                    />
                  )}
                </Card>
              </div>
              <div className="chart-grid">
                <CategoryChart
                  title="Where income comes from"
                  rows={data.income.filter((r) => monthOf(r.date) === month)}
                />
                <CategoryChart
                  title="Where your money goes"
                  rows={data.expense.filter((r) => monthOf(r.date) === month)}
                />
              </div>
              <Card className="mt-5">
                <div className="card-head">
                  <div>
                    <h2>Payments to collect</h2>
                    <p>Outstanding balances across generated invoices</p>
                  </div>
                  <TextLink to="/tuition">Manage tuition</TextLink>
                </div>
                {unpaid.length ? (
                  unpaid.slice(0, 5).map((i) => (
                    <Link
                      key={i.id}
                      className="list-row"
                      to={
                        i.student_id
                          ? `/tuition/${i.student_id}`
                          : `/batches/${data.batch_students.find((s) => s.id === i.batch_student_id)?.batch_id || ''}`
                      }
                    >
                      <span className="stat-icon amber">
                        <Receipt size={18} />
                      </span>
                      <div className="row-main">
                        <strong>{i.title}</strong>
                        <p>
                          {displayDate(i.month, { day: undefined })} · Due {displayDate(i.due_date)}
                        </p>
                      </div>
                      <span className="amount">{money(i.balance)}</span>
                      <Badge tone={i.due_date < today ? 'red' : 'amber'}>
                        {i.due_date < today ? 'Overdue' : 'Unpaid'}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <Empty
                    title="All caught up"
                    description="No outstanding invoices. Active students are billed automatically for the current month."
                  />
                )}
              </Card>
            </>
          );
        }}
      </QueryState>
    </>
  );
}
