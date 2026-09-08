import { useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, BookOpen, CalendarDays } from 'lucide-react';
import { useWorkspace } from '../../hooks/useWorkspace';
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
import { scheduleLabel } from '../../utils/domain';
import { batchFields, teachingDefaults, teachingValues } from './forms';
import BillingPanel from './BillingPanel';
export default function Batches() {
  const query = useWorkspace();
  const [tab, setTab] = useState('batches'),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('active'),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null);
  return (
    <>
      <PageHeader title="SSC batches" description="Keep your coaching classes running smoothly.">
        <AddButton onClick={() => setEditing({})}>Create batch</AddButton>
      </PageHeader>
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'batches', label: 'My batches' },
          { value: 'payments', label: 'Payments & dues' },
        ]}
      />
      <div className="mt-5">
        <QueryState query={query}>
          {(data) => {
            if (tab === 'payments') return <BillingPanel data={data} kind="batch" />;
            const rows = data.batches
              .filter(
                (b) =>
                  `${b.batch_name} ${b.class} ${b.subject}`
                    .toLowerCase()
                    .includes(search.toLowerCase()) &&
                  (status === 'all' || b.active === (status === 'active')),
              )
              .sort((a, b) => a.batch_name.localeCompare(b.batch_name));
            return (
              <>
                <Card className="mb-5">
                  <div className="filter-bar !border-0">
                    <Filter label="Find a batch">
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Batch name, class or subject"
                      />
                    </Filter>
                    <Filter label="Status" className="!flex-none">
                      <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                        <option value="all">All batches</option>
                      </select>
                    </Filter>
                  </div>
                </Card>
                <div className="record-grid">
                  {rows.map((b) => (
                    <Card key={b.id} className="record-card">
                      <div className="record-heading">
                        <span className="stat-icon !w-11 !h-11">
                          <UsersRound size={23} />
                        </span>
                        <div>
                          <Link to={`/batches/${b.id}`}>
                            <h2>{b.batch_name}</h2>
                          </Link>
                          <p className="muted text-sm">Class {b.class}</p>
                        </div>
                        <span className="ml-auto">
                          <Badge tone={b.active ? 'green' : 'neutral'}>
                            {b.active ? 'Active' : 'Archived'}
                          </Badge>
                        </span>
                      </div>
                      <div className="record-details">
                        <p className="flex gap-2 items-center">
                          <BookOpen size={16} />
                          {b.subject}
                        </p>
                        <p className="flex gap-2 items-center">
                          <CalendarDays size={16} />
                          {scheduleLabel(b)}
                        </p>
                        <p className="wrap-text">{b.schedule || 'No additional schedule notes'}</p>
                      </div>
                      <div className="record-footer">
                        <p className="text-sm">
                          <strong>
                            {
                              data.batch_students.filter((s) => s.batch_id === b.id && s.active)
                                .length
                            }
                          </strong>{' '}
                          active students
                        </p>
                        <Actions
                          label={b.batch_name}
                          onEdit={() => setEditing(b)}
                          onDelete={() =>
                            setDeleting({ table: 'batches', id: b.id, label: b.batch_name })
                          }
                        />
                      </div>
                      <Link className="btn btn-secondary w-full mt-4" to={`/batches/${b.id}`}>
                        Open batch
                      </Link>
                    </Card>
                  ))}
                </div>
                {!rows.length && (
                  <Card>
                    <Empty
                      title="No batches found"
                      description="Create a batch to manage enrolments, classes and monthly fees."
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
          title={editing.id ? 'Edit batch' : 'Create batch'}
          table="batches"
          record={teachingDefaults(editing)}
          fields={batchFields}
          transform={teachingValues}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteDialog target={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
