import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, History } from 'lucide-react';
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
  FormModal,
  DeleteDialog,
  Stat,
  Table,
  Button,
  Filter,
} from '../../components/ui';
import { todayIn, money, loanBalance, minor, displayDate } from '../../utils/domain';
export default function Loans() {
  const query = useWorkspace();
  const action = useAction();
  const { profile } = useAuth();
  const today = todayIn(profile?.timezone);
  const [type, setType] = useState('Lent'),
    [status, setStatus] = useState('all'),
    [search, setSearch] = useState(''),
    [editing, setEditing] = useState(null),
    [repayment, setRepayment] = useState(null),
    [deleting, setDeleting] = useState(null),
    [selected, setSelected] = useState(null);
  const fields = [
    { name: 'person_name', label: 'Person’s name', required: true, maxLength: 120 },
    { name: 'phone', label: 'Phone', type: 'tel' },
    {
      name: 'type',
      label: 'Loan type',
      type: 'select',
      required: true,
      options: [
        { value: 'Lent', label: 'Lent — I will receive' },
        { value: 'Borrowed', label: 'Borrowed — I will return' },
      ],
    },
    {
      name: 'amount',
      label: 'Original amount (BDT)',
      type: 'number',
      required: true,
      min: 0.01,
      step: '.01',
    },
    { name: 'date', label: 'Loan date', type: 'date', required: true },
    { name: 'due_date', label: 'Return by', type: 'date' },
    { name: 'note', label: 'Note', type: 'textarea', wide: true },
  ];
  return (
    <>
      <PageHeader title="Loans" description="Remember what you owe, and what’s owed to you.">
        <AddButton onClick={() => setEditing({})}>Add loan</AddButton>
      </PageHeader>
      <QueryState query={query}>
        {(data) => {
          const rows = data.loans
            .filter(
              (l) =>
                l.type === type &&
                (status === 'all' || l.status === status) &&
                `${l.person_name} ${l.phone}`.toLowerCase().includes(search.toLowerCase()),
            )
            .sort((a, b) => b.date.localeCompare(a.date));
          const loan = data.loans.find((l) => l.id === selected),
            target = repayment && data.loans.find((l) => l.id === repayment.loan_id);
          const maximum = target
            ? (minor(loanBalance(target)) + minor(repayment.id ? repayment.amount : 0)) / 100
            : 0;
          return (
            <>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <Stat
                  label="Money I will receive"
                  value={money(
                    data.loans
                      .filter((l) => l.type === 'Lent')
                      .reduce((s, l) => s + minor(loanBalance(l)), 0) / 100,
                  )}
                  detail="Outstanding lent balance"
                  icon={ArrowDownLeft}
                />
                <Stat
                  label="Money I have to return"
                  value={money(
                    data.loans
                      .filter((l) => l.type === 'Borrowed')
                      .reduce((s, l) => s + minor(loanBalance(l)), 0) / 100,
                  )}
                  detail="Outstanding borrowed balance"
                  icon={ArrowUpRight}
                  tone="amber"
                />
              </div>
              <Tabs
                value={type}
                onChange={(v) => {
                  setType(v);
                  setSelected(null);
                }}
                items={[
                  { value: 'Lent', label: 'I will receive' },
                  { value: 'Borrowed', label: 'I have to return' },
                ]}
              />
              <Card className="mt-5">
                <div className="filter-bar">
                  <Filter label="Find a person">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Name or phone"
                    />
                  </Filter>
                  <Filter label="Status" className="!flex-none">
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="all">All loans</option>
                      <option value="pending">Pending</option>
                      <option value="settled">Settled</option>
                    </select>
                  </Filter>
                </div>
                <Table
                  rows={rows}
                  label="Loans"
                  columns={[
                    {
                      key: 'person_name',
                      label: 'Person',
                      render: (l) => (
                        <>
                          {l.person_name}
                          <span className="subtext">
                            {l.phone || 'No phone'} · {l.note || 'No note'}
                          </span>
                        </>
                      ),
                    },
                    { key: 'amount', label: 'Principal', render: (l) => money(l.amount) },
                    {
                      key: 'remaining',
                      label: 'Remaining',
                      render: (l) => <strong>{money(loanBalance(l))}</strong>,
                    },
                    {
                      key: 'due_date',
                      label: 'Return by',
                      render: (l) => (
                        <span
                          className={
                            l.due_date && l.due_date < today && l.status !== 'settled'
                              ? 'danger-text'
                              : ''
                          }
                        >
                          {displayDate(l.due_date)}
                        </span>
                      ),
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (l) => (
                        <Badge tone={l.status === 'settled' ? 'green' : 'amber'}>{l.status}</Badge>
                      ),
                    },
                    {
                      key: 'repayment',
                      label: 'Repayments',
                      render: (l) => (
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            disabled={!loanBalance(l)}
                            onClick={() =>
                              setRepayment({
                                loan_id: l.id,
                                date: today,
                                amount: loanBalance(l),
                                note: '',
                              })
                            }
                          >
                            Record
                          </Button>
                          <button
                            className="icon-btn"
                            aria-label={`View repayments for ${l.person_name}`}
                            onClick={() => setSelected(l.id)}
                          >
                            <History size={18} />
                          </button>
                        </div>
                      ),
                    },
                    {
                      key: 'actions',
                      label: 'Actions',
                      align: 'right',
                      render: (l) => (
                        <Actions
                          label={l.person_name}
                          onEdit={() => setEditing(l)}
                          onDelete={() =>
                            setDeleting({
                              table: 'loans',
                              id: l.id,
                              label: `loan with ${l.person_name}`,
                            })
                          }
                        />
                      ),
                    },
                  ]}
                />
              </Card>
              {loan && (
                <Card className="mt-5">
                  <div className="card-head">
                    <div>
                      <h2>Repayments · {loan.person_name}</h2>
                      <p>
                        {money(loan.repaid_amount)} repaid of {money(loan.amount)} · Loan date{' '}
                        {displayDate(loan.date)}
                      </p>
                    </div>
                    <Button variant="ghost" onClick={() => setSelected(null)}>
                      Close
                    </Button>
                  </div>
                  <Table
                    rows={data.loan_payments
                      .filter((p) => p.loan_id === loan.id)
                      .sort((a, b) => b.date.localeCompare(a.date))}
                    columns={[
                      { key: 'date', label: 'Date', render: (p) => displayDate(p.date) },
                      { key: 'amount', label: 'Amount', render: (p) => money(p.amount) },
                      { key: 'note', label: 'Note' },
                      {
                        key: 'actions',
                        label: 'Actions',
                        align: 'right',
                        render: (p) => (
                          <Actions
                            label="repayment"
                            onEdit={() => setRepayment(p)}
                            onDelete={() =>
                              setDeleting({ table: 'loan_payments', id: p.id, label: 'repayment' })
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
              <p className="muted text-sm mt-4">
                Loans and repayments stay separate from income and expenses. The loan settles
                automatically when its remaining balance reaches zero.
              </p>
              {repayment && (
                <FormModal
                  title={repayment.id ? 'Correct repayment' : 'Record repayment'}
                  description={`${target?.person_name} · Maximum ${money(maximum)}`}
                  fields={[
                    {
                      name: 'amount',
                      label: 'Amount (BDT)',
                      type: 'number',
                      required: true,
                      min: 0.01,
                      max: maximum,
                      step: '.01',
                    },
                    {
                      name: 'date',
                      label: 'Repayment date',
                      type: 'date',
                      required: true,
                      min: target?.date,
                    },
                    { name: 'note', label: 'Note', type: 'textarea', wide: true },
                  ]}
                  values={repayment}
                  onClose={() => setRepayment(null)}
                  onSubmit={(v, requestId) =>
                    action.run(
                      (uid) =>
                        api.save(
                          'loan_payments',
                          { ...v, loan_id: repayment.loan_id },
                          uid,
                          repayment.id,
                          requestId,
                        ),
                      'Repayment saved',
                    )
                  }
                />
              )}
            </>
          );
        }}
      </QueryState>
      {editing && (
        <RecordForm
          title={editing.id ? 'Edit loan' : 'Add loan'}
          table="loans"
          record={editing}
          defaults={{
            person_name: '',
            phone: '',
            type,
            amount: '',
            date: today,
            due_date: '',
            note: '',
          }}
          fields={fields}
          transform={(v) => {
            if (v.due_date && v.due_date < v.date)
              throw new Error('Return date cannot precede the loan date.');
            return { ...v, person_name: v.person_name.trim(), due_date: v.due_date || null };
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
