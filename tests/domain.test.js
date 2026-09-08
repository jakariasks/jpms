import test from 'node:test';
import assert from 'node:assert/strict';
import {
  minor,
  sumMoney,
  invoiceBalance,
  loanBalance,
  shiftMonth,
  todayIn,
  summary,
  trend,
} from '../src/utils/domain.js';
import { toCsv } from '../src/utils/csv.js';
test('decimal money and partial payments use integer minor-unit sums', () => {
  assert.equal(minor('1234.56'), 123456);
  assert.equal(minor('-0.50'), -50);
  assert.equal(sumMoney([{ amount: 0.1 }, { amount: 0.2 }]), 0.3);
  assert.equal(
    invoiceBalance({ id: 'i', amount: 1000 }, [
      { invoice_id: 'i', amount: 333.33 },
      { invoice_id: 'i', amount: 111.11 },
      { invoice_id: 'other', amount: 999 },
    ]),
    555.56,
  );
  assert.equal(loanBalance({ amount: 5000, repaid_amount: 1250.5 }), 3749.5);
});
test('cash dates drive monthly reports; savings includes all history', () => {
  const data = {
    income: [
      { date: '2026-08-10', amount: 100 },
      { date: '2026-09-03', amount: 250 },
    ],
    expense: [{ date: '2026-09-02', amount: 80 }],
  };
  assert.deepEqual(summary(data, '2026-09'), {
    income: 250,
    expense: 80,
    monthlySavings: 170,
    savings: 270,
  });
  assert.equal(trend(data, '2026-09').length, 6);
  assert.equal(trend(data, '2026-09').at(-1).Income, 250);
});
test('year and timezone boundaries use the intended calendar day', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(todayIn('Asia/Dhaka', new Date('2026-09-07T20:00:00Z')), '2026-09-08');
  assert.equal(todayIn('America/New_York', new Date('2026-09-07T01:00:00Z')), '2026-09-06');
});
test('CSV escapes formulas, quotes, commas and multiline cells', () => {
  const csv = toCsv(
    [{ title: '=HYPERLINK("evil")', note: 'a,b\nc', amount: -12.5 }],
    [
      { key: 'title', label: 'Title' },
      { key: 'note', label: 'Note' },
      { key: 'amount', label: 'Amount' },
    ],
  );
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"a,b\nc"'));
  assert.ok(csv.includes('"-12.5"'));
});
