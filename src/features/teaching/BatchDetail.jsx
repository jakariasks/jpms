import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, ArrowLeft } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import {
  PageHeader,
  QueryState,
  Card,
  Tabs,
  Button,
  AddButton,
  Badge,
  RecordForm,
  Empty,
  Table,
  Actions,
  DeleteDialog,
  Filter,
} from '../../components/ui';
import { todayIn, money, displayDate, scheduleLabel } from '../../utils/domain';
import { memberFields, batchFields, teachingDefaults, teachingValues } from './forms';
import AttendancePanel from './AttendancePanel';
import BillingPanel from './BillingPanel';
export default function BatchDetail() {
  const { id } = useParams();
  const query = useWorkspace();
  const { profile } = useAuth();
  const [tab, setTab] = useState('students'),
    [editingBatch, setEditingBatch] = useState(false),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [search, setSearch] = useState('');
  return (
    <QueryState query={query}>
      {(data) => {
        const b = data.batches.find((r) => r.id === id),
          members = data.batch_students
            .filter((s) => s.batch_id === id)
            .sort((a, b) => a.student_name.localeCompare(b.student_name));
        if (!b)
          return (
            <Card>
              <Empty
                title="Batch not found"
                description="The batch may have been deleted or belongs to another workspace."
                action={
                  <Link className="btn btn-primary" to="/batches">
                    Back to batches
                  </Link>
                }
              />
            </Card>
          );
        return (
          <>
            <Link className="text-link mb-5" to="/batches">
              <ArrowLeft size={16} />
              All batches
            </Link>
            <PageHeader title={b.batch_name} description={`Class ${b.class} · ${b.subject}`}>
              <Button variant="secondary" icon={Pencil} onClick={() => setEditingBatch(true)}>
                Edit batch
              </Button>
              <AddButton onClick={() => setEditing({})}>Add student</AddButton>
            </PageHeader>
            <Card className="mb-6">
              <dl className="detail-grid">
                {[
                  ['Schedule', scheduleLabel(b)],
                  [
                    'Enrolments',
                    `${members.filter((s) => s.active).length} active / ${members.length} total`,
                  ],
                  ['Status', b.active ? 'Active' : 'Archived'],
                  ['Notes', b.schedule || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { value: 'students', label: 'Students' },
                { value: 'attendance', label: 'Attendance' },
                { value: 'payments', label: 'Payments & dues' },
              ]}
            />
            <div className="mt-5">
              {tab === 'attendance' ? (
                <AttendancePanel data={data} members={members} batch />
              ) : tab === 'payments' ? (
                <BillingPanel data={data} batchId={id} />
              ) : (
                <Card>
                  <div className="filter-bar">
                    <Filter label="Find a student">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Name, phone or guardian"
                      />
                    </Filter>
                  </div>
                  <Table
                    rows={members.filter((s) =>
                      `${s.student_name} ${s.phone} ${s.guardian_name}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )}
                    label="Batch students"
                    columns={[
                      {
                        key: 'student_name',
                        label: 'Student',
                        render: (s) => (
                          <>
                            {s.student_name}
                            <span className="subtext">
                              {s.phone || 'No phone'} · {s.address || 'No address'}
                            </span>
                          </>
                        ),
                      },
                      { key: 'guardian_name', label: 'Guardian' },
                      {
                        key: 'monthly_fee',
                        label: 'Monthly fee',
                        render: (s) => money(s.monthly_fee),
                      },
                      {
                        key: 'joining_date',
                        label: 'Joined',
                        render: (s) => displayDate(s.joining_date),
                      },
                      {
                        key: 'status',
                        label: 'Status',
                        render: (s) => (
                          <Badge tone={s.active ? 'green' : 'neutral'}>
                            {s.active ? 'Active' : 'Archived'}
                          </Badge>
                        ),
                      },
                      {
                        key: 'actions',
                        label: 'Actions',
                        align: 'right',
                        render: (s) => (
                          <Actions
                            label={s.student_name}
                            onEdit={() => setEditing(s)}
                            onDelete={() =>
                              setDeleting({
                                table: 'batch_students',
                                id: s.id,
                                label: s.student_name,
                              })
                            }
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
            {editing && (
              <RecordForm
                title={editing.id ? 'Edit enrolment' : 'Add batch student'}
                table="batch_students"
                record={teachingDefaults(editing, todayIn(profile?.timezone))}
                fields={memberFields}
                transform={(v) => ({ ...teachingValues(v), batch_id: id })}
                onClose={() => setEditing(null)}
              />
            )}{' '}
            {editingBatch && (
              <RecordForm
                title="Edit batch"
                table="batches"
                record={teachingDefaults(b)}
                fields={batchFields}
                transform={teachingValues}
                onClose={() => setEditingBatch(false)}
              />
            )}
            <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
          </>
        );
      }}
    </QueryState>
  );
}
