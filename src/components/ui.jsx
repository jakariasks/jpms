import { Component, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import {
  X,
  LoaderCircle,
  Plus,
  Pencil,
  Trash2,
  Inbox,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../services/api';
import { useAction } from '../hooks/useWorkspace';
import { DAYS } from '../utils/domain';
export function Button({
  children,
  icon: Icon,
  variant = 'primary',
  busy = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${className}`}
      {...props}
      disabled={busy || props.disabled}
    >
      {busy ? <LoaderCircle size={17} className="spin" /> : Icon ? <Icon size={17} /> : null}
      {children}
    </button>
  );
}
export const AddButton = ({ children, onClick }) => (
  <Button icon={Plus} onClick={onClick}>
    {children}
  </Button>
);
export function PageHeader({ eyebrow, title, description, children }) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted mt-2">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </header>
  );
}
export const Card = ({ children, className = '' }) => (
  <section className={`card ${className}`}>{children}</section>
);
export function Stat({ label, value, detail, icon: Icon, tone = 'green' }) {
  return (
    <Card className="stat">
      <div className="flex justify-between items-center gap-2">
        <p className="stat-label">{label}</p>
        {Icon && (
          <span className={`stat-icon ${tone}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <strong className="stat-value">{value}</strong>
      {detail && <p className="stat-detail">{detail}</p>}
    </Card>
  );
}
export const Badge = ({ children, tone = 'neutral' }) => (
  <span className={`badge badge-${tone}`}>{children}</span>
);
export const TextLink = ({ to, children }) => (
  <Link className="text-link" to={to}>
    {children}
    <ArrowRight size={15} />
  </Link>
);
export const Filter = ({ label, children, className = '' }) => (
  <label className={`filter-field ${className}`}>
    <span>{label}</span>
    {children}
  </label>
);
export function Tabs({ value, onChange, items, label = 'View' }) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {items.map((item) => (
        <button
          type="button"
          key={item.value}
          aria-pressed={value === item.value}
          className={value === item.value ? 'active' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
export function Field({
  name,
  label,
  type = 'text',
  required = false,
  options = [],
  wide,
  note,
  rules = {},
  ...props
}) {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  const error = errors[name];
  const id = `field-${name}`;
  const validation = { required: required ? `${label} is required` : false, ...rules };
  if (['text', 'textarea'].includes(type))
    validation.validate ??= (v) => !required || !!String(v || '').trim() || `${label} is required`;
  if (type === 'email')
    validation.pattern = {
      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Enter a valid email address',
    };
  if (type === 'tel')
    validation.pattern = { value: /^[+\d\s()\-]{0,25}$/, message: 'Enter a valid phone number' };
  if (type === 'number') {
    validation.valueAsNumber = true;
    validation.min = { value: props.min ?? 0, message: `Minimum is ${props.min ?? 0}` };
    validation.max = {
      value: props.max ?? 999999999.99,
      message: 'Amount exceeds the allowed maximum',
    };
    validation.validate = (v) =>
      (Number.isFinite(v) && /^\d+(\.\d{1,2})?$/.test(String(v))) ||
      'Use a valid amount with at most 2 decimal places';
  }
  if (type === 'date')
    validation.validate = (v) =>
      (!v && !required) ||
      (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
        v >= (props.min || '2000-01-01') &&
        v <= (props.max || '2100-12-31')) ||
      'Choose a date in the allowed range';
  const common = {
    id,
    ...props,
    'aria-invalid': !!error,
    'aria-required': required,
    'aria-describedby': error ? id + '-error' : note ? id + '-note' : undefined,
    ...register(name, validation),
  };
  return (
    <div className={`field ${wide ? 'field-wide' : ''}`}>
      {!['checkbox', 'days'].includes(type) && (
        <label htmlFor={id}>
          {label}
          {required && (
            <span aria-hidden="true" className="required">
              {' '}
              *
            </span>
          )}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea rows={3} maxLength={2000} {...common} />
      ) : type === 'select' ? (
        <select {...common}>
          {options.map((o) => (
            <option
              key={typeof o === 'string' ? o : o.value}
              value={typeof o === 'string' ? o : o.value}
            >
              {typeof o === 'string' ? o : o.label}
            </option>
          ))}
        </select>
      ) : type === 'checkbox' ? (
        <label className="check-label">
          <input type="checkbox" {...common} />
          {label}
        </label>
      ) : type === 'days' ? (
        <fieldset>
          <legend>{label}</legend>
          <div className="day-options">
            {DAYS.map((day, i) => (
              <label key={day}>
                <input type="checkbox" value={String(i)} {...register(name)} />
                {day}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type={type} maxLength={type === 'text' ? 180 : undefined} {...common} />
      )}{' '}
      {note && (
        <p className="field-note" id={id + '-note'}>
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="field-error" id={id + '-error'}>
          {error.message}
        </p>
      )}
    </div>
  );
}
export function Modal({
  open = true,
  title,
  description,
  children,
  onClose,
  busy = false,
  className = '',
}) {
  const previousFocus = useRef(document.activeElement);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal-content ${className}`}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            previousFocus.current?.focus?.();
          }}
          onInteractOutside={(e) => busy && e.preventDefault()}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || 'Complete the details below.'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-btn" disabled={busy} aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function FormModal({
  title,
  description,
  fields,
  values = {},
  onSubmit,
  onClose,
  submitLabel = 'Save changes',
}) {
  const requestId = useRef(crypto.randomUUID());
  // Never pass protected IDs, owner IDs or generated columns through a generic form.
  const methods = useForm({
    defaultValues: Object.fromEntries(
      fields.map((f) => [
        f.name,
        values[f.name] ?? (f.type === 'days' ? [] : f.type === 'checkbox' ? false : ''),
      ]),
    ),
  });
  const busy = methods.formState.isSubmitting;
  return (
    <Modal title={title} description={description} onClose={onClose} busy={busy}>
      <FormProvider {...methods}>
        <form
          noValidate
          onSubmit={methods.handleSubmit(async (data) => {
            methods.clearErrors('root');
            try {
              await onSubmit(data, requestId.current);
              onClose();
            } catch (error) {
              methods.setError('root', { message: errorMessage(error) });
            }
          })}
        >
          <div className="form-grid">
            {fields.map((f) => (
              <Field key={f.name} {...f} />
            ))}
          </div>
          {methods.formState.errors.root && (
            <p role="alert" className="alert-error mt-4">
              {methods.formState.errors.root.message}
            </p>
          )}
          <div className="modal-footer">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" busy={busy}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
export function RecordForm({
  table,
  record,
  fields,
  title,
  defaults = {},
  transform = (v) => v,
  onClose,
  description,
}) {
  const action = useAction();
  return (
    <FormModal
      title={title}
      description={description}
      fields={fields}
      values={{ ...defaults, ...record }}
      onClose={onClose}
      onSubmit={(values, requestId) =>
        action.run((uid) => api.save(table, transform(values), uid, record?.id, requestId))
      }
    />
  );
}
export function Actions({ onEdit, onDelete, label = 'record', disabled = false }) {
  return (
    <div className="flex gap-1 justify-end">
      {onEdit && (
        <button
          className="icon-btn"
          aria-label={`Edit ${label}`}
          title="Edit"
          disabled={disabled}
          onClick={onEdit}
        >
          <Pencil size={16} />
        </button>
      )}
      {onDelete && (
        <button
          className="icon-btn danger-text"
          aria-label={`Delete ${label}`}
          title="Delete"
          disabled={disabled}
          onClick={onDelete}
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
export function DeleteDialog({ target, onClose }) {
  const action = useAction();
  if (!target) return null;
  return (
    <Modal
      title={`Delete ${target.label || 'record'}?`}
      description={
        ['students', 'batch_students'].includes(target.table)
          ? 'This removes the student, attendance and unpaid invoices. Students with payment history must be archived.'
          : 'This permanently deletes the record. Related financial history may prevent deletion.'
      }
      onClose={onClose}
      busy={action.isPending}
    >
      <div className="modal-footer">
        <Button variant="secondary" onClick={onClose} disabled={action.isPending}>
          Keep record
        </Button>
        <Button
          variant="danger"
          busy={action.isPending}
          onClick={async () => {
            try {
              await action.run((uid) => api.remove(target.table, target.id, uid), 'Record deleted');
              onClose();
            } catch {}
          }}
        >
          Delete record
        </Button>
      </div>
    </Modal>
  );
}
export function Empty({
  title = 'Nothing here yet',
  description = 'Add a record to get started.',
  action,
  icon: Icon = Inbox,
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Table({ rows, columns, label = 'Records', empty = 'No matching records' }) {
  if (!rows.length)
    return <Empty title={empty} description="Add a record or try a different filter." />;
  return (
    <div className="table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={c.align === 'right' ? 'text-right' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key} className={c.align === 'right' ? 'text-right' : ''}>
                  {c.render ? c.render(r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading-grid" role="status" aria-label="Loading workspace">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function QueryState({ query, children }) {
  if (query.isPending) return <Loading />;
  if (query.isError && query.data === undefined)
    return (
      <Card>
        <Empty
          icon={AlertCircle}
          title="Could not load your workspace"
          description={errorMessage(query.error)}
          action={
            <Button busy={query.isFetching} onClick={() => query.refetch()}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  return (
    <>
      {query.isError && (
        <div
          className="notice mb-5 flex flex-wrap items-center justify-between gap-3"
          role="status"
        >
          <p>Could not refresh. Showing the last loaded data.</p>
          <Button variant="secondary" busy={query.isFetching} onClick={() => query.refetch()}>
            Retry refresh
          </Button>
        </div>
      )}
      {children(query.data)}
    </>
  );
}
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('JPMS render error', error, info.componentStack);
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Something went wrong</h1>
        <p>Reload JPMS to recover your workspace.</p>
        <Button onClick={() => window.location.reload()}>Reload app</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
