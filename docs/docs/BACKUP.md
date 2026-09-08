# Backup and restore

## নিয়মিত backup

Settings থেকে **Download backup** চাপলে `JPMS` schema version `1` JSON তৈরি হয়। এতে public profile এবং 12টি business table-এর data থাকে। Database query সব 500-row page পড়ে; export শুধু screen-এর visible rows নয়।

Backup download-এর আগে কাজ save করে refresh দিন। Export একাধিক table read করে; একই account দিয়ে অন্য device-এ একসঙ্গে edit হলে transaction-consistent snapshot নিশ্চিত করা যায় না। Planned restore-এর জন্য সাময়িকভাবে edits বন্ধ রেখে export করুন। Large deployments should use database-level backups.

JSON-এ students-এর phone/address ও নিজের financial data থাকে। নিরাপদ, private জায়গায় রাখুন। Browser-এ file download হয়; Android-এ share sheet খুলে save location/app বেছে নিতে হয়। Native implementation temporary export files cache-এ রাখে; device/cache access control বিবেচনা করুন।

Finance ও attendance CSV reports viewing/analysis-এর জন্য। Full restore-এর জন্য JSON প্রয়োজন।

## JSON কী রাখে না

- Supabase Auth password, session, MFA configuration বা provider settings।
- Storage avatar image bytes। Profile-এর stored path JSON-এ থাকতে পারে, কিন্তু নতুন project-এ সেই object থাকবে না।
- Project API keys, SMTP credentials, Supabase project settings বা cron job configuration।

Supabase database backup-ও Storage object bytes অন্তর্ভুক্ত করে না; database ও uploaded files-এর আলাদা backup প্রয়োজন। [Supabase database backup documentation](https://supabase.com/docs/guides/platform/backups)

## New project-এ restore — step by step

1. নতুন empty Supabase project তৈরি করুন। `supabase/migrations/001_jpms.sql` সম্পূর্ণ run করুন।
2. Target user account তৈরি/confirm করুন। তার Auth user UUID copy করুন। Profile trigger `public.users` row তৈরি করবে।
3. Target account-এ business data যোগ করবেন না। Restore target-এর সব business table empty থাকতে হবে। Existing data-এর ওপর এই script merge করে না।
4. Backup JSON local project directory-তে রাখুন, যেমন `my-backup.json`। Terminal-এ:

```bash
node scripts/backup-to-sql.mjs my-backup.json YOUR_TARGET_USER_UUID restore.sql
```

5. `YOUR_TARGET_USER_UUID`-এর জায়গায় প্রকৃত Auth UUID দিন। `restore.sql` আগে থেকে থাকলে script overwrite করবে না; নতুন output filename দিন।
6. Generated SQL নিজে review করুন। Correct target project-এর SQL Editor-এ project owner হিসেবে পুরো SQL একসঙ্গে run করুন। এটি একটি transaction; কোনো record fail করলে পুরো restore rollback হবে।
7. Target app-এর env সেই project-এ configure করুন; login/refresh করুন। Student count, manual income/expense, invoice dues, receipt totals এবং loan remaining amounts backup-এর সঙ্গে মিলিয়ে দেখুন।
8. Avatar আবার upload করুন। প্রয়োজন হলে SMTP, redirect URLs এবং optional cron job নতুন project-এ configure করুন।

**এটি local converter; database-এ কোনো automatic network call বা execution করে না।** Project-owner SQL intentionally bypasses ordinary UI permissions only for the reviewed restore. User-facing application has no restore endpoint with elevated access.

## Restore behaviour

| Data           | Behaviour                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Owner          | All business records receive the supplied target user UUID                                                                  |
| IDs            | Original record IDs retained, preserving relationships; use a fresh project to avoid collisions                             |
| Profile        | Name/phone/theme/timezone restored; target account email retained; avatar path cleared                                      |
| Invoices       | Original monthly snapshots retained                                                                                         |
| Receipts       | Original receipt IDs/amount/date retained; payment triggers rebuild linked income                                           |
| Manual income  | Restored directly; receipt-linked income from the JSON is skipped to avoid double counting                                  |
| Loans          | Principal restored; repayment triggers reconstruct outstanding/settled state                                                |
| Notifications  | Existing inbox/read state restored; subsequent refresh adds currently due reminders                                         |
| Invalid backup | Required table arrays, schema marker, owner IDs and record IDs checked; DB constraints reject invalid relationships/amounts |

The converter uses a fixed column allowlist, escapes SQL literals, enables standard-conforming strings and refuses nonempty targets. It is tested with quotes/newlines and a restore round trip. This does not turn arbitrary JSON into trusted data: use backups you control and review the generated SQL.

## Project-level disaster recovery

For ongoing production use, configure the backups available for your Supabase project and keep Storage object copies separately. Practise restoring into a separate project before relying on a backup. Retain schema migrations and the source lockfile together with the backup date/version. Do not replace an existing live workspace without a separate verified backup and a planned migration.
