import { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button, Field, Modal } from '../../components/ui';
import { useAction } from '../../hooks/useWorkspace';
import { useAuth } from '../auth/AuthProvider';
import { api, errorMessage } from '../../services/api';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayIn } from '../../utils/domain';

export default function TransactionForm({ initialKind = 'expense', record, onClose, onSaved }) {
  const { profile } = useAuth();
  const action = useAction();
  const [kind, setKind] = useState(initialKind === 'income' ? 'income' : 'expense');
  const requestId = useRef(crypto.randomUUID());
  const methods = useForm({
    defaultValues: {
      amount: record?.amount ?? '',
      category: record?.category ?? (kind === 'expense' ? 'Food' : 'Other'),
      date: record?.date ?? todayIn(profile?.timezone),
      title: record?.title ?? '',
      description: record?.description ?? '',
    },
  });
  const busy = methods.formState.isSubmitting;
  const editing = !!record?.id;
  const choices = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  function changeKind(next) {
    if (busy || editing || next === kind) return;
    setKind(next);
    // Keep the amount/date/title the user has entered, but select a valid category.
    methods.setValue('category', next === 'expense' ? 'Food' : 'Other', {
      shouldValidate: true,
    });
    methods.clearErrors('root');
  }

  return (
    <Modal
      className="transaction-modal"
      title={`${editing ? 'Edit' : 'Add'} ${kind}`}
      description="Enter an amount, choose a category, and save."
      onClose={onClose}
      busy={busy}
    >
      <FormProvider {...methods}>
        <form
          className="transaction-form"
          noValidate
          onSubmit={methods.handleSubmit(async (data) => {
            methods.clearErrors('root');
            try {
              if (record?.payment_id)
                throw new Error('Edit this income from its tuition or batch receipt.');
              const values = {
                amount: data.amount,
                category: data.category,
                date: data.date,
                title: data.title.trim() || data.category,
                description: data.description.trim(),
              };
              await action.run(
                (uid) => api.save(kind, values, uid, record?.id, requestId.current),
                `${kind === 'expense' ? 'Expense' : 'Income'} ${editing ? 'updated' : 'added'}`,
              );
              onSaved?.({ kind, date: values.date });
              onClose();
            } catch (error) {
              methods.setError('root', { message: errorMessage(error) });
            }
          })}
        >
          <fieldset disabled={busy}>
            {!editing && (
              <div className="transaction-switch" role="group" aria-label="Transaction type">
                {[
                  { value: 'expense', label: 'Expense', icon: ArrowUpRight },
                  { value: 'income', label: 'Income', icon: ArrowDownLeft },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    className={kind === value ? 'active' : ''}
                    disabled={busy}
                    onClick={() => changeKind(value)}
                  >
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="transaction-amount">
              <Field
                name="amount"
                label="Amount (৳)"
                type="number"
                inputMode="decimal"
                required
                min={0.01}
                step="0.01"
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
            <div className="form-grid">
              <Field name="category" label="Category" type="select" options={choices} required />
              <Field name="date" label="Date" type="date" required />
              <Field
                name="title"
                label="Title (optional)"
                placeholder={kind === 'expense' ? 'e.g. Lunch or bus fare' : 'e.g. Coaching salary'}
                note="Leave blank to use the category name."
                wide
              />
            </div>
            <details className="transaction-notes" open={record?.description ? true : undefined}>
              <summary>Add a note (optional)</summary>
              <Field name="description" label="Note" type="textarea" />
            </details>
            {kind === 'income' && (
              <p className="transaction-hint">
                Tuition and batch receipts already add income automatically.
              </p>
            )}
          </fieldset>
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
              Save {kind}
            </Button>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
}
