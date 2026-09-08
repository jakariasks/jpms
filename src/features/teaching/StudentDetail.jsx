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
  Badge,
  RecordForm,
  Empty,
} from '../../components/ui';
import { todayIn, money, displayDate, scheduleLabel } from '../../utils/domain';
import { studentFields, teachingDefaults, teachingValues } from './forms';
import AttendancePanel from './AttendancePanel';
import BillingPanel from './BillingPanel';
export default function StudentDetail() {
  const { id } = useParams();
  const query = useWorkspace();
  const { profile } = useAuth();
  const [tab, setTab] = useState('attendance'),
    [editing, setEditing] = useState(false);
  return (
    <QueryState query={query}>
      {(data) => {
        const s = data.students.find((r) => r.id === id);
        if (!s)
          return (
            <Card>
              <Empty
                title="Student not found"
                description="The record may have been deleted or belongs to another workspace."
                action={
                  <Link className="btn btn-primary" to="/tuition">
                    Back to tuition
                  </Link>
                }
              />
            </Card>
          );
        return (
          <>
            <Link className="text-link mb-5" to="/tuition">
              <ArrowLeft size={16} />
              All students
            </Link>
            <PageHeader title={s.name} description={`Class ${s.class} · ${s.subject}`}>
              <Badge tone={s.active ? 'green' : 'neutral'}>
                {s.active ? 'Active' : 'Archived'}
              </Badge>
              <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>
                Edit student
              </Button>
            </PageHeader>
            <Card className="mb-6">
              <dl className="detail-grid">
                {[
                  ['Monthly fee', money(s.monthly_fee)],
                  ['Phone', s.phone || '—'],
                  ['Guardian', s.guardian_name || '—'],
                  ['Joined', displayDate(s.joining_date)],
                  ['Schedule', scheduleLabel(s)],
                  ['Address', s.address || '—'],
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
                { value: 'attendance', label: 'Attendance' },
                { value: 'payments', label: 'Payments & dues' },
              ]}
            />
            <div className="mt-5">
              {tab === 'attendance' ? (
                <AttendancePanel data={data} members={[s]} />
              ) : (
                <BillingPanel data={data} studentId={id} />
              )}
            </div>
            {editing && (
              <RecordForm
                title="Edit student"
                table="students"
                record={teachingDefaults(s, todayIn(profile?.timezone))}
                fields={studentFields}
                transform={teachingValues}
                onClose={() => setEditing(false)}
              />
            )}
          </>
        );
      }}
    </QueryState>
  );
}
