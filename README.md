# Jakaria Personal Management System — JPMS

Jakaria Hasan-এর দৈনন্দিন কাজ, আয়-ব্যয়, প্রাইভেট টিউশন, SSC batch, বকেয়া এবং ধার-দেনা পরিচালনার জন্য React + Supabase web application। UI English; এই setup guide বাংলা ও সহজ technical English-এ লেখা। Default currency **BDT (৳)** এবং profile timezone **Asia/Dhaka**।

এখানে application source, database migration, automated tests, deployment configuration এবং Android conversion guide দেওয়া আছে। নিজের Supabase project-এর URL ও publishable key বসিয়ে চালাতে হবে। কোনো demo account, shared database বা hard-coded business data নেই।

## 1. আগে design বুঝে নিন

| বিষয়                                                                 | কোথায় পাবেন                                                          |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| System architecture, decisions, database relationships               | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                         |
| Complete SQL: fields, keys, indexes, RLS, triggers, Storage policies | [supabase/migrations/001_jpms.sql](supabase/migrations/001_jpms.sql) |
| Folder structure, UI wireframe idea, development roadmap             | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                         |
| Backup ও restore                                                     | [docs/BACKUP.md](docs/BACKUP.md)                                     |
| Web থেকে Android APK                                                 | [docs/MOBILE.md](docs/MOBILE.md)                                     |
| কী test করা হয়েছে ও নিজের project-এ কী যাচাই করবেন                   | [docs/TESTING.md](docs/TESTING.md), [VALIDATION.txt](VALIDATION.txt) |

React components UI দেখায়, TanStack Query server data ও refresh পরিচালনা করে, React Hook Form input validate করে। Supabase Auth identity দেয়; PostgreSQL RLS প্রতিটি ব্যবহারকারীর data আলাদা রাখে। Payment ও loan-এর গুরুত্বপূর্ণ নিয়ম database transaction/trigger-এ রাখা হয়েছে, যাতে UI এড়িয়ে API call করলেও একই হিসাব বজায় থাকে।

## 2. কোন কোন module আছে

| Module         | Implemented features                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | Register, email confirmation, login/logout, forgot/reset password, protected routes                                                                   |
| Dashboard      | 7 requested KPI cards, task progress, six-month income/expense chart, income-source and expense-category charts, pending collections                  |
| Finance        | Income/expense CRUD, month/date/category/search filters, savings, CSV reports; student receipts automatically create income                           |
| Tuition        | Student CRUD, guardian/address/class/subject/fee/joining date, archive, weekly class schedule, daily/monthly attendance, billing and partial payments |
| SSC batches    | Batch CRUD, schedule, enrolment CRUD, member attendance, monthly invoices, receipts and dues                                                          |
| Tasks          | Create/edit/delete, priorities, reminder time, complete/reopen, today/upcoming/overdue/completed lists                                                |
| Loans          | Lent/Borrowed sections, principal records, partial repayments, repayment corrections, automatic outstanding balance and settlement                    |
| Reminders      | Payment, tuition, task and loan inbox; read/unread; optional browser alerts while the page is open                                                    |
| Settings       | Profile, private avatar, timezone, light/dark/system theme, password change, JSON backup, finance CSV                                                 |
| UI             | Responsive sidebar/drawer, top bar, mobile bottom navigation, cards, tables, accessible modal dialogs, toasts, skeletons, empty/error states          |

Reminder inbox is persisted in PostgreSQL. Email/SMS and background mobile push are not configured in this version. The optional scheduler below creates inbox reminders even while the app is closed.

## 3. Requirements

- Node.js **22.12+**; this package was built and tested with **Node 24.19.0**.
- npm, a code editor such as VS Code, and internet access for npm/Supabase.
- A Supabase project. Vercel account is needed only for deployment.
- Android Studio is needed only when you reach the APK stage.

Package versions are pinned in `package.json` and `package-lock.json`; use `npm ci` to reproduce them. React **19.2.8**, Tailwind **4.3.3**, Vite **8.2.2**, Supabase JS **2.116.0**, React Router **7.18.3**, React Hook Form **7.87.0**, TanStack Query **5.102.8** are included. Future updates should be followed by the test/build checks, rather than deleting the lockfile.

## 4. ZIP extract এবং dependencies install

1. ZIP extract করুন। ভিতরে `jpms` folder পাবেন।
2. VS Code দিয়ে সেই folder খুলুন। Terminal-এর current directory-তে `package.json` থাকতে হবে।
3. চালান:

```bash
cd jpms
npm ci
```

আগেই `jpms` folder-এর ভিতরে terminal খুললে `cd jpms` আবার চালাবেন না। ZIP-এ `node_modules` ও generated `dist` নেই; install/build এগুলো তৈরি করবে।

## 5. Supabase project এবং database তৈরি

1. [Supabase Dashboard](https://supabase.com/dashboard)-এ নিজের **নতুন, empty project** তৈরি করুন। Database password নিরাপদে রাখুন; frontend-এ এটি লাগবে না।
2. Project-এর **SQL Editor → New query** খুলুন।
3. `supabase/migrations/001_jpms.sql`-এর সম্পূর্ণ content paste করে **একবার Run** করুন।
4. সফল হলে public schema-তে 13টি table এবং Storage-তে private `jpms-avatars` bucket তৈরি হবে।
5. Authentication-এর Email provider enabled রাখুন। Production-এর জন্য email confirmation enabled রাখুন।

Migration একটি transaction-এর মধ্যে চলে। এটি fresh installation-এর migration; আগে থেকে থাকা business database-এর ওপর পুনরায় চালানোর upgrade script নয়। কোনো statement ব্যর্থ হলে error ঠিক করে পুরো transaction আবার চালান। পরবর্তী changes-এর জন্য নতুন numbered migration লিখুন।

`users` হলো public profile table। Password Supabase Auth রাখে; public table-এ password রাখা হয়নি। নতুন signup-এ trigger profile তৈরি করে। Migration-এর আগে তৈরি Auth account থাকলেও profile backfill হয়।

## 6. Environment variables বসান

macOS/Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Supabase project-এর Connect/Settings/API Keys অংশ থেকে **Project URL** ও **Publishable key** নিন। `.env` edit করুন:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
VITE_APP_URL=http://localhost:5173
```

এখানে placeholder দুটির জায়গায় নিজের values বসাতে হবে। পুরোনো project-এর legacy `anon` key-ও supported; চাইলে variable name `VITE_SUPABASE_ANON_KEY` ব্যবহার করা যায়।

**`service_role`, `sb_secret_...`, database password বা SMTP password কখনো `VITE_` variable-এ দেবেন না।** Vite-এর frontend variables browser bundle-এ যায়। Public key দিয়ে access নিরাপদ রাখার দায়িত্ব SQL-এর RLS policies-এর। `.env` Git-এ commit করবেন না। [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

Missing/placeholder config থাকলে app একটি setup screen দেখাবে। `.env` edit করার পরে dev server restart করুন।

## 7. Auth redirect ও email setup

Supabase **Authentication → URL Configuration**-এ local development-এর জন্য:

- Site URL: `http://localhost:5173`
- Redirect URL: `http://localhost:5173/auth/callback`
- Redirect URL: `http://localhost:5173/reset-password`

Hosted production URL তৈরি হলে section 12 অনুযায়ী add/update করুন। Signup ও recovery email-এর default confirmation link template রাখুন, যাতে Supabase session ও redirect সঠিকভাবে তৈরি করে। Custom template ব্যবহার করলে এই flow যাচাই করুন।

Email confirmation চালু থাকলে signup-এর পরে inbox-এর link click করে login করুন। Email না এলে spam folder, Supabase Auth logs, email delivery configuration এবং rate limits দেখুন। নিজের users-কে email পাঠাতে production SMTP configuration করুন; default development email service-এর ওপর production delivery নির্ভর করাবেন না। [Supabase password authentication guide](https://supabase.com/docs/guides/auth/passwords)

## 8. Web app চালান

```bash
npm run dev
```

Browser-এ `http://localhost:5173` খুলুন। Register করুন, প্রয়োজন হলে email confirm করুন, তারপর login করুন। App প্রথমে empty থাকবে—এটি নিজের data যোগ করার জন্য তৈরি। কোনো universal admin password নেই।

প্রথম ব্যবহারের প্রস্তাবিত ক্রম:

1. **Settings:** নাম, phone, timezone ও theme ঠিক করুন; প্রয়োজনে avatar upload করুন।
2. **Tuition:** ছাত্রের information, monthly fee, joining date ও class days/time দিন।
3. **Batches:** batch তৈরি করে students enrol করুন। Batch schedule-এর day/time দিলে reminders তৈরি হবে।
4. Student/batch details-এর **Payments** tab-এ billing month নির্বাচন করুন। Current month-এর invoices auto-create হয়; প্রয়োজনীয় অন্য মাসের জন্য **Generate invoices** চাপুন।
5. Invoice-এর পাশে payment record করুন। Partial payment দেওয়া যায়। একই receipt আবার Finance-এ manual income হিসেবে যোগ করবেন না—database এটি নিজে যোগ করে।
6. **Attendance:** date নির্বাচন করে present/absent/cancelled mark করুন; history ও monthly export দেখুন।
7. **Finance:** coaching salary, freelancing বা other manual income এবং expenses যোগ করুন।
8. **Tasks/Loans:** daily tasks, lent/borrowed money এবং পরবর্তী repayments যোগ করুন।
9. **Reminders** ও Dashboard দেখুন। **Settings → Backup** থেকে নিয়মিত JSON রাখুন।

## 9. হিসাবের নিয়ম — ব্যবহার করার আগে পড়ুন

| বিষয়               | এই application-এর নিয়ম                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Money              | BDT, two decimal places; PostgreSQL numeric amounts; UI sums use integer minor units                            |
| Income report      | Cash basis: actual receipt/payment date; invoice month আলাদা                                                    |
| Savings            | Recorded all-time income minus recorded all-time expenses; this is an earnings surplus, not a bank/cash balance |
| Loans              | Principal/repayments আলাদা ledger; income, expense ও savings-এ ঢোকে না                                          |
| Monthly fee        | Full monthly fee; joining month prorate হয় না; zero fee হলে invoice হয় না                                       |
| Fee changes        | Existing invoices retain their amount; fee edits affect subsequently generated invoices                         |
| Old months         | Automatically backfilled নয়; প্রয়োজনীয় মাস নির্বাচন করে generate করুন                                           |
| Future months      | Manually generate করা যায়; generate করার সময় fee snapshot স্থায়ী হয়                                             |
| Due date           | Invoice month-এর শেষ দিন; pending amount is invoice amount minus receipts                                       |
| Payment correction | Payments tab থেকে receipt edit/delete করুন; linked Finance income direct edit/delete করা যায় না                 |
| Student removal    | Paid history থাকলে archive করুন; receipt-বিহীন student delete করলে unpaid invoices ও attendance-ও মুছে যায়      |
| Batch removal      | আগে enrolments remove করতে হবে; financial history থাকলে archive ব্যবহার করুন                                    |
| Attendance         | One record per student per date; multiple sessions on the same day are not modelled                             |
| Students KPI       | Active private students + active enrolments in active batches; same person in both counts twice                 |
| Timezone           | Profile timezone controls today, billing month and reminder scheduling; datetime input uses device timezone     |

Dashboard-এর **Pending payments** সব generated invoice-এর remaining dues দেখায়, শুধু selected month নয়। Task এবং lesson reminder automatic টাকা কেটে নেয় না বা financial entry তৈরি করে না।

## 10. Optional scheduled reminders

App খোলা থাকলে data refresh-এর সময় reminders ও current-month invoices তৈরি হয়; polling interval 60 seconds। Closed app-এর জন্য persisted inbox তৈরি করতে:

1. Supabase project-এ `pg_cron` extension enable করুন।
2. SQL Editor-এ `supabase/optional_cron.sql` একবার চালান।
3. Script-এ job inspect, history এবং disable করার SQL-ও দেওয়া আছে।

Job প্রতি 15 মিনিটে runs; **push, SMS বা email পাঠায় না**। Browser alerts optional, permission দেওয়া এবং page খোলা থাকা প্রয়োজন। Loan due date ও task reminder time না দিলে সংশ্লিষ্ট automatic time-based alert সীমিত থাকবে; task date নিজেও due reminder তৈরি করতে পারে।

## 11. Test ও production build

```bash
npm test
npm run build
npm run preview
```

`preview`-এর terminal-এ দেখানো URL খুলুন। Auth link testing-এর জন্য সেই origin-ও Supabase redirect allowlist ও `VITE_APP_URL`-এ দিতে হবে এবং নতুন env দিয়ে build করতে হবে। সাধারণ local development-এর জন্য section 8-এর port 5173 রাখাই সহজ।

এই delivery-তে 18 automated tests এবং production build passed। Tests embedded PostgreSQL/PGlite-এ বাস্তব SQL চালায়; নিজের hosted Supabase project, email delivery, browser interaction এবং Android device-এর acceptance tests আলাদাভাবে চালাতে হবে। Details: [docs/TESTING.md](docs/TESTING.md)।

## 12. Vercel deploy — step by step

1. নিজের GitHub repository-তে `jpms` folder-এর contents push করুন; `.env`, `node_modules`, `dist` commit করবেন না।
2. [Vercel](https://vercel.com)-এ **Add New Project → Import repository** নির্বাচন করুন।
3. Root Directory হবে যেখানে `package.json` আছে। Repository-তে outer `jpms` directory থাকলে root হিসেবে `jpms` দিন।
4. Framework: **Vite**; Build: `npm run build`; Output: `dist`; Node: supported 22.12+ / 24।
5. Environment variables-এ নিজের `VITE_SUPABASE_URL` এবং `VITE_SUPABASE_PUBLISHABLE_KEY` দিন। `VITE_APP_URL`-এ final HTTPS domain দিন। Initial deploy-এর পরে domain জানা গেলে variable update করে **Redeploy** করুন।
6. Supabase Site URL production domain করুন। Redirect allowlist-এ exact production `/auth/callback` ও `/reset-password` URL যোগ করুন। Local entries development-এর জন্য রাখতে পারেন।
7. Deploy করুন; login, refresh on `/tuition`, email recovery এবং দুই user-এর data separation পরীক্ষা করুন।

`vercel.json` SPA route rewrite ও response headers দেয়। Environment variables build-time-এ bundle হয়; change করার পরে rebuild/redeploy প্রয়োজন। [Vercel Vite documentation](https://vercel.com/docs/frameworks/frontend/vite)

## 13. Backup এবং Android

- **Settings → Download backup**: full JSON business backup। [Restore guide](docs/BACKUP.md) এবং `scripts/backup-to-sql.mjs` included।
- Finance/attendance CSV spreadsheet-এ ব্যবহার করা যায়; CSV পূর্ণ restore format নয়।
- Capacitor configuration, Android dependencies, native auth link handling, native file/share export code included। [APK guide](docs/MOBILE.md) অনুসরণ করুন।
- This ZIP contains source, not a compiled/signed APK. Native project generation, Android SDK configuration and physical-device testing happen on your computer.

## 14. Troubleshooting

| সমস্যা                                | কী করবেন                                                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm ci` fails                        | Node version দেখুন; internet/proxy ও npm error দেখুন; correct folder থেকে চালান; lockfile মুছবেন না         |
| Port 5173 in use                      | ওই dev server বন্ধ করুন; port পাল্টালে env ও auth redirect একইভাবে বদলান                                    |
| Setup screen                          | `.env` filename/URL/key/placeholder দেখুন; server restart করুন                                              |
| Table/function missing                | Correct project-এ সম্পূর্ণ migration run হয়েছে কি না দেখুন                                                  |
| Invalid login/email unconfirmed       | Registered email/password ও confirmation check করুন; প্রয়োজন হলে forgot password                            |
| Recovery link returns localhost       | `VITE_APP_URL`, Supabase Site URL এবং redirect allowlist মিলিয়ে rebuild করুন                                |
| Profile/permission error              | Migration trigger ও RLS inspect করুন; correct account/project নিশ্চিত করুন; RLS disable করে bypass করবেন না |
| Cannot delete student/batch           | Financial history আছে; archive করুন। Batch-এর enrolments এখনও থাকতে পারে                                    |
| Payment rejected                      | Receipt total invoice amount ছাড়িয়েছে কি না বা invoice already paid কি না refresh করে দেখুন                 |
| Bill not generated                    | Active status, joining date, positive fee, batch active status এবং selected month check করুন                |
| Avatar upload fails                   | JPG/PNG/WebP এবং ≤2 MB দিন; private bucket/policies migration check করুন                                    |
| Due reminder absent                   | Due date, current time, schedule days, profile timezone এবং inbox refresh check করুন                        |
| CSV/JSON on Android                   | Native app sync ও share handler installed কি না দেখুন; [MOBILE.md](docs/MOBILE.md) পড়ুন                     |
| Records truncated after server tuning | Supabase API max rows at least 500 রাখুন; client 500-row pages fetch করে                                    |

## 15. Commercial SaaS-এর পরের ধাপ

বর্তমান ownership model: one authenticated user owns one personal workspace। Multi-user data isolation included, কিন্তু organisation/team roles, subscription billing, audit trail, server-paginated reports, offline sync, background push এবং store release এখনও roadmap-এর অংশ। নিজের live environment-এ acceptance ও security review শেষে release করুন। বিস্তারিত rationale ও staged roadmap [ARCHITECTURE.md](docs/ARCHITECTURE.md)-এ আছে।
