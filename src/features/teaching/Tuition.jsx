import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Phone, CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
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
  Filter,
} from '../../components/ui';
import { todayIn, money, initials, scheduleLabel } from '../../utils/domain';
import { studentFields, teachingDefaults, teachingValues } from './forms';
import BillingPanel from './BillingPanel';
export default function Tuition() {
  const query = useWorkspace();
  const { profile } = useAuth();
  const [tab, setTab] = useState('students'),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('active'),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  return (
    <>
      <PageHeader
        title="Private tuition"
        description="Your students, their classes, and every payment."
      >
        <AddButton onClick={() => setEditing({})}>Add student</AddButton>
      </PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'students', label: 'Students' },
          { value: 'payments', label: 'Payments & dues' },
        ]}
      />
      <div className="mt-5">
        <QueryState query={query}>
          {(data) => {
            if (tab === 'payments') return <BillingPanel data={data} />;
            const rows = data.students
              .filter(
                (s) =>
                  (status === 'all' || s.active === (status === 'active')) &&
                  `${s.name} ${s.class} ${s.subject} ${s.phone}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .sort((a, b) => a.name.localeCompare(b.name));
            return (
              <>
                <Card className="mb-5">
                  <div className="filter-bar !border-0">
                    <Filter label="Find a student">
                      <input
                        value={search}
                        placeholder="Name, class, subject or phone"
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </Filter>
                    <Filter label="Status" className="!flex-none">
                      <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                        <option value="all">All students</option>
                      </select>
                    </Filter>
                  </div>
                </Card>
                <div className="record-grid">
                  {rows.map((s) => (
                    <Card key={s.id} className="record-card">
                      <div className="record-heading">
                        <span className="avatar !w-11 !h-11">{initials(s.name)}</span>
                        <div className="min-w-0">
                          <Link to={`/tuition/${s.id}`}>
                            <h2 className="wrap-text">{s.name}</h2>
                          </Link>
                          <p className="muted text-sm">Class {s.class}</p>
                        </div>
                        <span className="ml-auto">
                          <Badge tone={s.active ? 'green' : 'neutral'}>
                            {s.active ? 'Active' : 'Archived'}
                          </Badge>
                        </span>
                      </div>
                      <div className="record-details">
                        <p className="flex gap-2 items-center">
                          <BookOpen size={16} />
                          {s.subject}
                        </p>
                        <p className="flex gap-2 items-center">
                          <Phone size={16} />
                          {s.phone || 'No phone added'}
                        </p>
                        <p className="flex gap-2 items-center">
                          <CalendarDays size={16} />
                          {scheduleLabel(s)}
                        </p>
                      </div>
                      <div className="record-footer">
                        <div>
                          <strong>{money(s.monthly_fee)}</strong>
                          <span className="muted text-xs"> / month</span>
                        </div>
                        <Actions
                          label={s.name}
                          onEdit={() => setEditing(s)}
                          onDelete={() =>
                            setDeleting({ table: 'students', id: s.id, label: s.name })
                          }
                        />
                      </div>
                      <Link className="btn btn-secondary w-full mt-4" to={`/tuition/${s.id}`}>
                        Attendance & payments
                      </Link>
                    </Card>
                  ))}
                </div>
                {!rows.length && (
                  <Card>
                    <Empty
                      title="No students found"
                      description="Add your first student or adjust your search."
                    />
                  </Card>
                )}
              </>
            );
          }}
        </QueryState>
      </div>
      {editing && (
        <RecordForm
          title={editing.id ? 'Edit student' : 'Add student'}
          table="students"
          record={teachingDefaults(editing, todayIn(profile?.timezone))}
          fields={studentFields}
          transform={teachingValues}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
