import { useState } from 'react';
import { Download, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useAction } from '../../hooks/useWorkspace';
import { api } from '../../services/api';
import {
  Card,
  Table,
  Button,
  Badge,
  FormModal,
  Actions,
  DeleteDialog,
  Filter,
} from '../../components/ui';
import {
  todayIn,
  monthOf,
  monthLabel,
  invoiceBalance,
  money,
  displayDate,
  minor,
} from '../../utils/domain';
import { exportCsv } from '../../services/export';
export default function BillingPanel({ data, studentId, batchId, kind = 'tuition' }) {
  const { profile } = useAuth();
  const today = todayIn(profile?.timezone);
  const action = useAction();
  const [month, setMonth] = useState(monthOf(today)),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const belongs = (i) =>
    studentId
      ? i.student_id === studentId
      : batchId
        ? data.batch_students.some((m) => m.id === i.batch_student_id && m.batch_id === batchId)
        : kind === 'tuition'
          ? !!i.student_id
          : !!i.batch_student_id;
  const invoices = data.invoices
    .filter((i) => monthOf(i.month) === month && belongs(i))
    .map((i) => ({ ...i, due: invoiceBalance(i, data.payments) }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const receipts = data.payments
    .filter((p) => invoices.some((i) => i.id === p.invoice_id))
    .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  const bill = editing && data.invoices.find((i) => i.id === editing.invoice_id);
  const maximum = bill
    ? (minor(invoiceBalance(bill, data.payments)) + minor(editing.id ? editing.amount : 0)) / 100
    : 0;
  return (
    <div className="space-y-5">
      <Card>
        <div className="filter-bar">
          <Filter label="Billing month" className="!flex-none">
            <input
              type="month"
              min="2000-01"
              max="2100-12"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
            />
          </Filter>
          <Button
            variant="secondary"
            icon={RefreshCw}
            busy={action.isPending}
            onClick={() =>
              action.run(() => api.generate(month), 'Monthly invoices are ready').catch(() => {})
            }
          >
            Generate month
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() =>
              exportCsv(`jpms-billing-${month}.csv`, invoices, [
                { key: 'title', label: 'Student' },
                { key: 'month', label: 'Month' },
                { key: 'amount', label: 'Fee BDT', value: (i) => Number(i.amount) },
                {
                  key: 'paid',
                  label: 'Paid BDT',
                  value: (i) => (minor(i.amount) - minor(i.due)) / 100,
                },
                { key: 'due', label: 'Due BDT' },
                { key: 'due_date', label: 'Due date' },
              ])
            }
          >
            Export billing
          </Button>
          <strong className="ml-auto text-sm">
            Due: {money(invoices.reduce((s, i) => s + minor(i.due), 0) / 100)}
          </strong>
        </div>
        <Table
          label="Monthly invoices"
          rows={invoices}
          empty="No invoices for this month"
          columns={[
            { key: 'title', label: 'Student' },
            { key: 'amount', label: 'Fee', render: (i) => money(i.amount) },
            {
              key: 'paid',
              label: 'Paid',
              render: (i) => money((minor(i.amount) - minor(i.due)) / 100),
            },
            {
              key: 'due',
              label: 'Due',
              render: (i) => (
                <strong className={i.due ? 'danger-text' : 'success-text'}>{money(i.due)}</strong>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (i) => (
                <Badge tone={!i.due ? 'green' : i.due < Number(i.amount) ? 'amber' : 'red'}>
                  {!i.due ? 'Paid' : i.due < Number(i.amount) ? 'Partial' : 'Unpaid'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Payment',
              align: 'right',
              render: (i) => (
                <Button
                  variant="secondary"
                  icon={Plus}
                  disabled={!i.due}
                  onClick={() =>
                    setEditing({ invoice_id: i.id, amount: i.due, payment_date: today, note: '' })
                  }
                >
                  Record payment
                </Button>
              ),
            },
          ]}
        />
        <p className="p-5 border-t border-[var(--border)] text-sm muted">
          Current-month invoices are automatic. Generate a historical month when needed. Monthly
          fees are saved as a snapshot; payment is due at month-end.
        </p>
      </Card>
      <Card>
        <div className="card-head">
          <div>
            <h2>Payment history</h2>
            <p>Receipts for {monthLabel(month)} fees</p>
          </div>
        </div>
        <Table
          rows={receipts}
          label="Payment history"
          columns={[
            {
              key: 'student',
              label: 'Student',
              render: (p) => invoices.find((i) => i.id === p.invoice_id)?.title,
            },
            {
              key: 'payment_date',
              label: 'Received on',
              render: (p) => displayDate(p.payment_date),
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (p) => <strong className="success-text">{money(p.amount)}</strong>,
            },
            {
              key: 'note',
              label: 'Note',
              render: (p) => <span className="wrap-text">{p.note || '—'}</span>,
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'right',
              render: (p) => (
                <Actions
                  label="payment"
                  onEdit={() => setEditing(p)}
                  onDelete={() =>
                    setDeleting({ table: 'payments', id: p.id, label: 'payment and its income' })
                  }
                />
              ),
            },
          ]}
        />
      </Card>
      {editing && (
        <FormModal
          title={editing.id ? 'Correct payment' : 'Record payment'}
          description={`${bill?.title} · Maximum ${money(maximum)}`}
          values={editing}
          fields={[
            {
              name: 'amount',
              label: 'Amount received (BDT)',
              type: 'number',
              required: true,
              min: 0.01,
              max: maximum,
              step: '.01',
            },
            { name: 'payment_date', label: 'Payment date', type: 'date', required: true },
            { name: 'note', label: 'Note', type: 'textarea', wide: true },
          ]}
          onClose={() => setEditing(null)}
          onSubmit={(v, requestId) =>
            action.run(
              (uid) =>
                api.save(
                  'payments',
                  { ...v, invoice_id: editing.invoice_id },
                  uid,
                  editing.id,
                  requestId,
                ),
              'Payment and income saved',
            )
          }
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
