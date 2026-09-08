# Validation and acceptance

## Delivered verification

Run from the project root:

```bash
npm ci
npm test
npm run build
```

The packaged `VALIDATION.txt` contains the actual final test/build output. Delivery validation used Node 24.19.0. **18 tests passed, 0 failed**, including the parent SQL integration test. Vite production bundling succeeded.

`tests/database.test.js` runs the delivered migration against embedded PostgreSQL via PGlite. Its fixture provides minimal Auth/Storage schemas and authenticated/anonymous roles. It tests real SQL constraints, trigger execution and RLS policies. It does not emulate hosted GoTrue email delivery, PostgREST HTTP behavior, Storage upload MIME enforcement or Vercel routing.

| Automated area   | Checked behaviour                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Money            | Integer minor-unit sums, partial invoice balances and loan balance                              |
| Reporting        | Receipt dates drive monthly income; savings covers all history                                  |
| Calendar         | Month/year rollover and Dhaka/New York date boundaries                                          |
| CSV              | Quotes, multiline content, commas and text formula injection                                    |
| Profiles         | Signup trigger, owner-only read, restricted columns, timezone and avatar-owner validation       |
| Isolation        | Cross-user records hidden; wrong-owner foreign keys and writes rejected                         |
| Billing          | Repeated generation is idempotent, joining month respected, original fee snapshot retained      |
| Receipts         | One linked income, correct category/date, edit/delete sync, overpayment rejection               |
| Attendance       | Unique student/day and status constraints                                                       |
| Archive/delete   | Paid student deletion rejected; unpaid dependencies removed; archived students stop new billing |
| Loans            | Partial repayment, settlement/reopening, overpayment and forged-balance rejection               |
| Reminders        | Persisted inbox, deduplication and completed-task resolution                                    |
| Restore          | Accounting round trip, escaping, schema check and nonempty-target refusal                       |
| Storage policies | Owner folder isolation and anonymous denial at SQL layer                                        |
| Account removal  | Administrator deletion cascades financial records and leaves other accounts intact              |

The integration suite uses one embedded connection. Parent row locks are present in the migration, but true simultaneous requests from separate hosted connections were not exercised. Browser visual/interaction tests, real Supabase integration, SMTP, scheduled cron execution and Android compilation/device tests were not performed.

## Hosted acceptance checklist

Run these with test accounts in your own Supabase project before storing important records. Preserve the same RLS policies used for production.

| Test                     | Action                                                                                             | Expected result                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Registration             | Register A, confirm email, log in                                                                  | Own profile exists; dashboard is empty                                                            |
| Isolation                | In a separate browser profile register B; request A's student through B's authenticated API client | No A data; wrong-owner write rejected                                                             |
| Session                  | Logout A and login B in the same browser                                                           | No cached A records visible                                                                       |
| Password recovery        | Request recovery, follow email, save new password, log in with it                                  | Correct origin and session; expired link cannot change password                                   |
| Private tuition billing  | Add active student with fee 3000 and valid joining date; generate same month twice                 | One invoice of 3000                                                                               |
| Partial receipt          | Pay 1000 then 2000                                                                                 | Due 0; total income 3000, exactly two linked entries                                              |
| Receipt correction       | Change 1000 receipt to 900 and move date to next month                                             | Due 100; monthly cash reports move 900 to new receipt month                                       |
| Duplicate retry          | Simulate lost response, retry from same still-open form                                            | No duplicate create for the same submission ID                                                    |
| Overpayment              | Attempt another amount exceeding due; also send API request bypassing form                         | Rejected; original totals unchanged                                                               |
| Concurrency              | From two sessions for A, submit two 700 receipts against the same 1000 unpaid invoice concurrently | Combined committed receipts cannot exceed 1000                                                    |
| Fee snapshot             | Change fee to 3500; regenerate old invoice and generate next month                                 | Old invoice remains 3000; new invoice is 3500                                                     |
| Archive                  | Archive a paid student; generate future billing                                                    | Existing history retained; no new invoice for archived student                                    |
| Batch                    | Create batch and member; record attendance and fee receipt                                         | Member history linked correctly; income category Batch Fee                                        |
| Attendance               | Mark and change same student/date                                                                  | One row, latest selected status; monthly count/export matches                                     |
| Loan                     | Lend 5000; receive 1250 and 3750; delete first repayment                                           | Settled at 5000 repaid, then pending with 1250 remaining                                          |
| Loan concurrency         | Two separate requests attempt repayments exceeding the same remaining principal together           | Committed total stays within principal                                                            |
| Finance filters          | Enter amounts across two months/categories; filter and export chosen date range                    | UI filter totals correct; report CSV includes both transaction kinds for chosen dates as labelled |
| Reminders                | Create due task/loan and refresh twice, then resolve and refresh                                   | No duplicate inbox entry for same key; resolved item marked read                                  |
| Scheduler                | Enable optional cron, close app, wait for due cycle and inspect job history                        | Inbox rows generated; no expectation of email/push                                                |
| Avatar                   | Upload valid image, then oversized/unsupported image; request path as B                            | Valid private image works for A; invalid/cross-user access rejected                               |
| Backup                   | Export, restore into fresh empty target account/project and compare totals                         | Relationships and financial totals preserved; photo requires re-upload                            |
| Deployment               | Refresh `/tuition` directly on Vercel and use recovery email                                       | SPA route loads and email returns to deployed origin                                              |
| Responsive/accessibility | Test narrow phone/desktop, keyboard Tab, Escape, focus return, contrast and large text             | Controls remain usable, modal focus stays inside, no clipped primary actions                      |

## Practical limits to keep visible

- Money is a personal cash-income/expense ledger, not double-entry accounting or a bank reconciliation system. Loan cash flows are separate.
- All-history client snapshots suit a personal workspace; benchmark and introduce server pagination/aggregates before commercial scale.
- In-app reminders exist without device notification permission. Closed-browser/device push is not implemented.
- There is no offline data persistence/queue. A network error can occur after the server commits; inspect saved records before entering a new transaction.
- JSON export is not a transaction-wide database snapshot and excludes Auth credentials and Storage files.
- Source/build validation does not certify a hosted system, native release or third-party service configuration.

Detailed implementation decisions are in [ARCHITECTURE.md](ARCHITECTURE.md). Android-specific tests are in [MOBILE.md](MOBILE.md).
