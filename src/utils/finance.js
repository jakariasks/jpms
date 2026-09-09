import { minor, sumMoney } from './domain.js';

// Cards and CSV exports must use the same month/date range.
export function financeReport(data, { month = '', from = '', to = '' } = {}) {
  const validRange = !from || !to || from <= to;
  const matches = (row) =>
    validRange &&
    (!month || row.date.slice(0, 7) === month) &&
    (!from || row.date >= from) &&
    (!to || row.date <= to);
  const income = data.income.filter(matches);
  const expense = data.expense.filter(matches);
  const incomeTotal = sumMoney(income);
  const expenseTotal = sumMoney(expense);
  return {
    income,
    expense,
    validRange,
    totals: {
      income: incomeTotal,
      expense: expenseTotal,
      savings: (minor(incomeTotal) - minor(expenseTotal)) / 100,
    },
    report: [
      ...income.map((row) => ({ ...row, type: 'income', amount: Number(row.amount) })),
      ...expense.map((row) => ({ ...row, type: 'expense', amount: Number(row.amount) })),
    ].sort((a, b) => b.date.localeCompare(a.date)),
  };
}
