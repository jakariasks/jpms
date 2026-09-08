import { useState } from 'react';
import { Download, Wallet, TrendingUp, TrendingDown, LockKeyhole } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import {
  PageHeader,
  Stat,
  Card,
  Tabs,
  Button,
  Table,
  Actions,
  DeleteDialog,
  Badge,
  QueryState,
  Filter,
} from '../../components/ui';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  todayIn,
  monthOf,
  summary,
  money,
  displayDate,
  sumMoney,
} from '../../utils/domain';
import { exportCsv } from '../../services/export';
export default function Finance() {
  const query = useWorkspace();
  const { profile } = useAuth();
  const { openTransaction } = useOutletContext();
  const today = todayIn(profile?.timezone);
  const [kind, setKind] = useState('expense'),
    [month, setMonth] = useState(monthOf(today)),
    [category, setCategory] = useState(''),
    [search, setSearch] = useState(''),
    [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [deleting, setDeleting] = useState(null);
  const choices = kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  function openForm(type, record) {
    openTransaction({
      kind: type,
      record,
      onSaved: ({ kind: savedKind, date }) => {
        setKind(savedKind);
        setMonth(monthOf(date));
        setCategory('');
        setSearch('');
        setFrom('');
        setTo('');
      },
    });
  }
  return (
    <>
      <PageHeader title="Finance" description="A clear view of what comes in and what goes out.">
        <Button icon={TrendingDown} onClick={() => openForm('expense')}>
          Add expense
        </Button>
        <Button variant="secondary" icon={TrendingUp} onClick={() => openForm('income')}>
          Add income
        </Button>
      </PageHeader>
      <QueryState query={query}>
        {(data) => {
          const sums = summary(data, month || monthOf(today));
          const matchesDate = (r) =>
            (!month || monthOf(r.date) === month) &&
            (!from || r.date >= from) &&
            (!to || r.date <= to);
          const rows = data[kind]
            .filter(
              (r) =>
                matchesDate(r) &&
                (!category || r.category === category) &&
                `${r.title} ${r.description}`.toLowerCase().includes(search.toLowerCase()),
            )
            .sort(
              (a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at),
            );
          const report = ['income', 'expense'].flatMap((type) =>
            data[type].filter(matchesDate).map((r) => ({ ...r, type, amount: Number(r.amount) })),
          );
          return (
            <>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Stat
                  label="Monthly income"
                  value={money(sums.income)}
                  detail={month || 'Current month'}
                  icon={TrendingUp}
                />
                <Stat
                  label="Monthly expense"
                  value={money(sums.expense)}
                  detail={month || 'Current month'}
                  icon={TrendingDown}
                  tone="red"
                />
                <Stat
                  label="Monthly savings"
                  value={money(sums.monthlySavings)}
                  detail="Income minus expense"
                  icon={Wallet}
                />
              </div>
              <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
                <Tabs
                  value={kind}
                  onChange={(v) => {
                    setKind(v);
                    setCategory('');
                  }}
                  items={[
                    { value: 'income', label: 'Income' },
                    { value: 'expense', label: 'Expenses' },
                  ]}
                />
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() =>
                    exportCsv(`jpms-finance-${month || 'all'}.csv`, report, [
                      { key: 'type', label: 'Type' },
                      { key: 'date', label: 'Date' },
                      { key: 'title', label: 'Title' },
                      { key: 'category', label: 'Category' },
                      { key: 'amount', label: 'Amount BDT' },
                      { key: 'description', label: 'Description' },
                    ])
                  }
                >
                  Export date-range report
                </Button>
              </div>
              <Card>
                <div className="filter-bar">
                  <Filter label="Search">
                    <input
                      value={search}
                      placeholder="Title or description"
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Filter>
                  <Filter label="Month (clear for all)">
                    <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
                  </Filter>
                  <Filter label="Category">
                    <select value={category} onChange={(e) => setCategory(e.target.value)}>
                      <option value="">All categories</option>
                      {choices.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Filter>
                  <Filter label="From">
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </Filter>
                  <Filter label="To">
                    <input
                      type="date"
                      value={to}
                      min={from || undefined}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  </Filter>
                </div>
                {from && to && from > to && (
                  <p className="alert-error m-4">End date must be on or after start date.</p>
                )}
                <Table
                  rows={rows}
                  label={`${kind} transactions`}
                  columns={[
                    {
                      key: 'title',
                      label: 'Transaction',
                      render: (r) => (
                        <>
                          {r.title}
                          <span className="subtext">{r.description}</span>
                        </>
                      ),
                    },
                    {
                      key: 'category',
                      label: 'Category',
                      render: (r) => <Badge>{r.category}</Badge>,
                    },
                    { key: 'date', label: 'Date', render: (r) => displayDate(r.date) },
                    {
                      key: 'amount',
                      label: 'Amount',
                      align: 'right',
                      render: (r) => (
                        <span
                          className={`amount ${kind === 'income' ? 'success-text' : 'danger-text'}`}
                        >
                          {kind === 'expense' ? '−' : ''}
                          {money(r.amount)}
                        </span>
                      ),
                    },
                    {
                      key: 'actions',
                      label: 'Actions',
                      align: 'right',
                      render: (r) =>
                        r.payment_id ? (
                          <Link
                            className="text-link"
                            to={
                              data.payments.find((p) => p.id === r.payment_id)?.student_id
                                ? `/tuition/${data.payments.find((p) => p.id === r.payment_id).student_id}`
                                : '/batches'
                            }
                          >
                            <LockKeyhole size={14} />
                            Receipt
                          </Link>
                        ) : (
                          <Actions
                            label={r.title}
                            onEdit={() => openForm(kind, r)}
                            onDelete={() => setDeleting({ table: kind, id: r.id, label: r.title })}
                          />
                        ),
                    },
                  ]}
                />
                <div className="flex justify-between gap-3 flex-wrap p-5 border-t border-[var(--border)] text-sm">
                  <span className="muted">
                    {rows.length} records · Export includes both income and expense for the
                    month/date range.
                  </span>
                  <strong>Filtered total: {money(sumMoney(rows))}</strong>
                </div>
              </Card>
              <p className="muted text-sm mt-4">
                Tuition and batch receipts appear automatically. Edit a linked receipt to correct
                its income.
              </p>
            </>
          );
        }}
      </QueryState>
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
