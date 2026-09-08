export const INCOME_CATEGORIES = [
  'Tuition',
  'Coaching Salary',
  'Batch Fee',
  'Freelancing',
  'Other',
];
export const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Study', 'Personal', 'Family', 'Others'];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export function todayIn(timezone = 'Asia/Dhaka', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export const monthOf = (value) => value.slice(0, 7);
export function shiftMonth(month, offset) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 7);
}
export function displayDate(value, options = {}) {
  return value
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...options,
      }).format(new Date(value.slice(0, 10) + 'T12:00:00'))
    : '—';
}
export const monthLabel = (month) => displayDate(month + '-01', { day: undefined, month: 'long' });
export function minor(value) {
  const str = String(value ?? 0);
  const [whole, part = ''] = str.replace(/^-/, '').split('.');
  return (
    (Number(whole) * 100 + Number(part.padEnd(2, '0').slice(0, 2))) * (str.startsWith('-') ? -1 : 1)
  );
}
export const sumMoney = (rows, key = 'amount') =>
  rows.reduce((sum, row) => sum + minor(row[key]), 0) / 100;
export const money = (value) =>
  '৳' + new Intl.NumberFormat('en-BD', { maximumFractionDigits: 2 }).format(Number(value || 0));
export const invoiceBalance = (invoice, payments) =>
  Math.max(
    0,
    minor(invoice.amount) -
      payments.filter((p) => p.invoice_id === invoice.id).reduce((s, p) => s + minor(p.amount), 0),
  ) / 100;
export const loanBalance = (loan) =>
  Math.max(0, minor(loan.amount) - minor(loan.repaid_amount)) / 100;
export function summary(data, month) {
  const income = sumMoney(data.income.filter((r) => monthOf(r.date) === month));
  const expense = sumMoney(data.expense.filter((r) => monthOf(r.date) === month));
  return {
    income,
    expense,
    monthlySavings: (minor(income) - minor(expense)) / 100,
    savings: (minor(sumMoney(data.income)) - minor(sumMoney(data.expense))) / 100,
  };
}
export function trend(data, month) {
  return Array.from({ length: 6 }, (_, i) => {
    const m = shiftMonth(month, i - 5);
    const s = summary(data, m);
    return {
      month: m,
      name: displayDate(m + '-01', { day: undefined, year: undefined }),
      Income: s.income,
      Expense: s.expense,
    };
  });
}
export function categories(rows) {
  const map = new Map();
  rows.forEach((r) => map.set(r.category, (map.get(r.category) || 0) + minor(r.amount)));
  return [...map]
    .map(([name, total]) => ({ name, value: total / 100 }))
    .sort((a, b) => b.value - a.value);
}
export const initials = (name = 'JPMS') =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
export const scheduleLabel = (row) =>
  [(row.schedule_days || []).map((d) => DAYS[d]).join(', '), row.schedule_time?.slice(0, 5)]
    .filter(Boolean)
    .join(' · ') || 'No schedule';
export function localDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
