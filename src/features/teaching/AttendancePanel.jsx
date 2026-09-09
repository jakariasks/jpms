import { useState } from 'react';
import { Download } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useAction } from '../../hooks/useWorkspace';
import { api } from '../../services/api';
import {
  Card,
  Table,
  Tabs,
  Button,
  Badge,
  FormModal,
  Actions,
  DeleteDialog,
  Filter,
} from '../../components/ui';
import { todayIn, monthOf, displayDate } from '../../utils/domain';
import { exportCsv } from '../../services/export';
export default function AttendancePanel({ data, members, batch = false }) {
  const { profile } = useAuth();
  const today = todayIn(profile?.timezone);
  const action = useAction();
  const key = batch ? 'batch_student_id' : 'student_id';
  const [selectedDate, setDate] = useState(null),
    [selectedMonth, setMonth] = useState(null),
    [view, setView] = useState('day'),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  const date = selectedDate ?? today;
  const month = selectedMonth ?? monthOf(today);
  const name = (m) => m.student_name || m.name;
  const records = data.attendance
    .filter((a) => members.some((m) => m.id === a[key]) && monthOf(a.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recordName = (r) => name(members.find((m) => m.id === r[key]) || {});
  const saved = (m) => data.attendance.find((a) => a[key] === m.id && a.date === date);
  return (
    <Card>
      <div className="filter-bar">
        <Tabs
          value={view}
          onChange={setView}
          items={[
            { value: 'day', label: 'Mark attendance' },
            { value: 'month', label: 'Monthly history' },
          ]}
        />
        {view === 'day' ? (
          <Filter label="Class date" className="!flex-none">
            <input
              type="date"
              value={date}
              min="2000-01-01"
              max="2100-12-31"
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </Filter>
        ) : (
          <>
            <Filter label="Month" className="!flex-none">
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
              />
            </Filter>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                exportCsv(`jpms-attendance-${month}.csv`, records, [
                  { key: 'student', label: 'Student', value: recordName },
                  { key: 'date', label: 'Date' },
                  { key: 'status', label: 'Status' },
                  { key: 'note', label: 'Note' },
                ])
              }
            >
              Export
            </Button>
          </>
        )}
      </div>
      {view === 'day' ? (
        <Table
          label="Daily attendance"
          rows={members.filter((m) => m.active)}
          columns={[
            { key: 'name', label: 'Student', render: name },
            {
              key: 'status',
              label: 'Attendance',
              render: (m) => (
                <select
                  className="border border-[var(--border)] rounded-lg p-2 bg-[var(--surface)]"
                  aria-label={`Attendance for ${name(m)}`}
                  value={saved(m)?.status || ''}
                  disabled={action.isPending}
                  onChange={(e) => {
                    // Snapshot the selection before the async mutation runs. React may
                    // restore this controlled select to its last saved value meanwhile.
                    const status = e.currentTarget.value;
                    if (!status) return;
                    const attendance = {
                      [key]: m.id,
                      date,
                      status,
                      note: saved(m)?.note || '',
                    };
                    action
                      .run((uid) => api.attendance(attendance, uid), 'Attendance saved')
                      .catch(() => {});
                  }}
                >
                  <option value="" disabled>
                    Not marked
                  </option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ),
            },
            { key: 'note', label: 'Note', render: (m) => saved(m)?.note || '—' },
            {
              key: 'actions',
              label: 'Details',
              align: 'right',
              render: (m) => (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setEditing(saved(m) || { [key]: m.id, date, status: 'present', note: '' })
                  }
                >
                  Add / edit note
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <>
          <div className="p-5 border-b border-[var(--border)] flex gap-6 flex-wrap text-sm">
            <span>
              <strong>{records.filter((a) => a.status === 'present').length}</strong> present
              records
            </span>
            <span>
              <strong>{records.filter((a) => a.status === 'absent').length}</strong> absent
            </span>
            <span>
              <strong>
                {new Set(records.filter((a) => a.status === 'present').map((a) => a.date)).size}
              </strong>{' '}
              class days taken
            </span>
          </div>
          <Table
            rows={records}
            label="Monthly attendance"
            columns={[
              { key: 'date', label: 'Date', render: (a) => displayDate(a.date) },
              { key: 'student', label: 'Student', render: recordName },
              {
                key: 'status',
                label: 'Status',
                render: (a) => (
                  <Badge
                    tone={
                      a.status === 'present' ? 'green' : a.status === 'absent' ? 'red' : 'neutral'
                    }
                  >
                    {a.status}
                  </Badge>
                ),
              },
              { key: 'note', label: 'Note' },
              {
                key: 'actions',
                label: 'Actions',
                align: 'right',
                render: (a) => (
                  <Actions
                    label="attendance"
                    onEdit={() => setEditing(a)}
                    onDelete={() =>
                      setDeleting({ table: 'attendance', id: a.id, label: 'attendance' })
                    }
                  />
                ),
              },
            ]}
          />
        </>
      )}
      {editing && (
        <FormModal
          title="Attendance details"
          description={`${displayDate(editing.date)} · ${recordName(editing)}`}
          fields={[
            {
              name: 'status',
              label: 'Status',
              type: 'select',
              options: ['present', 'absent', 'cancelled'],
              required: true,
              wide: true,
            },
            { name: 'note', label: 'Class note', type: 'textarea', wide: true },
          ]}
          values={editing}
          onClose={() => setEditing(null)}
          onSubmit={(v) =>
            action.run(
              (uid) => api.attendance({ ...v, [key]: editing[key], date: editing.date }, uid),
              'Attendance saved',
            )
          }
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </Card>
  );
}
