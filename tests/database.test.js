import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { buildRestoreSql } from '../scripts/backup-to-sql.mjs';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('PostgreSQL migration, ownership and accounting integration', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth,storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;`);
    await db.exec(
      await readFile(new URL('../supabase/migrations/001_jpms.sql', import.meta.url), 'utf8'),
    );
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3),($4,$5,$6)',
      [
        A,
        'jakaria@example.test',
        JSON.stringify({ name: 'Jakaria Hasan' }),
        B,
        'other@example.test',
        JSON.stringify({ name: 'Other User' }),
      ],
    );
    const asUser = async (uid, role = 'authenticated') => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']);
      await db.exec(`set role ${role}`);
    };
    let student, batch, member, invoice, batchInvoice, payment, loan;
    await t.test('profile trigger, private profiles and protected profile columns', async () => {
      await asUser(A);
      const rows = (await db.query('select * from public.users')).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].name, 'Jakaria Hasan');
      await assert.rejects(
        db.query("update public.users set email='spoof@example.test' where id=$1", [A]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("update public.users set timezone='Invalid/Timezone' where id=$1", [A]),
        /valid IANA timezone/,
      );
      await assert.rejects(
        db.query('update public.users set profile_image=$1 where id=$2', [`${B}/photo.jpg`, A]),
        /photo owner/,
      );
    });
    await t.test('RLS and composite foreign keys block cross-user rows', async () => {
      await asUser(B);
      const foreign = (
        await db.query(
          "insert into public.students(user_id,name,class,subject,monthly_fee,joining_date) values($1,'Other student','10','Math',3000,'2026-01-01') returning id",
          [B],
        )
      ).rows[0];
      await asUser(A);
      assert.equal((await db.query('select * from public.students')).rows.length, 0);
      await assert.rejects(
        db.query(
          "insert into public.attendance(user_id,student_id,date,status) values($1,$2,'2026-09-01','present')",
          [A, foreign.id],
        ),
        /foreign key constraint/,
      );
      await assert.rejects(
        db.query("insert into public.tasks(user_id,title,date) values($1,'Spoof','2026-09-01')", [
          B,
        ]),
        /row-level security/,
      );
      student = (
        await db.query(
          "insert into public.students(user_id,name,class,subject,monthly_fee,joining_date) values($1,'Student A','10','Math',3000,'2026-01-01') returning *",
          [A],
        )
      ).rows[0];
      batch = (
        await db.query(
          "insert into public.batches(user_id,batch_name,class,subject) values($1,'SSC A','10','Physics') returning *",
          [A],
        )
      ).rows[0];
      member = (
        await db.query(
          "insert into public.batch_students(user_id,batch_id,student_name,monthly_fee,joining_date) values($1,$2,'Batch student',1200,'2026-01-01') returning *",
          [A, batch.id],
        )
      ).rows[0];
    });
    await t.test('billing is idempotent, respects joining month and snapshots fees', async () => {
      await db.query("select public.generate_monthly_invoices('2025-12-01')");
      assert.equal((await db.query('select * from public.invoices')).rows.length, 0);
      await db.query("select public.generate_monthly_invoices('2026-09-01')");
      await db.query("select public.generate_monthly_invoices('2026-09-01')");
      const bills = (await db.query('select * from public.invoices')).rows;
      assert.equal(bills.length, 2);
      invoice = bills.find((b) => b.student_id);
      batchInvoice = bills.find((b) => b.batch_student_id);
      assert.equal(Number(invoice.amount), 3000);
      assert.equal(invoice.due_date.toISOString().slice(0, 10), '2026-09-30');
      await db.query('update public.students set monthly_fee=3500 where id=$1', [student.id]);
      await db.query("select public.generate_monthly_invoices('2026-09-01')");
      assert.equal(
        Number(
          (await db.query('select amount from public.invoices where id=$1', [invoice.id])).rows[0]
            .amount,
        ),
        3000,
      );
      await assert.rejects(
        db.query('update public.invoices set amount=1 where id=$1', [invoice.id]),
        /permission denied/,
      );
    });
    await t.test(
      'receipt updates keep one income, use cash dates and prevent overpayment',
      async () => {
        payment = (
          await db.query(
            "insert into public.payments(user_id,invoice_id,amount,payment_date) values($1,$2,1000,'2026-09-05') returning *",
            [A, invoice.id],
          )
        ).rows[0];
        assert.equal(payment.student_id, student.id);
        assert.equal(payment.month.toISOString().slice(0, 10), '2026-09-01');
        let income = (
          await db.query('select * from public.income where payment_id=$1', [payment.id])
        ).rows;
        assert.equal(income.length, 1);
        assert.equal(Number(income[0].amount), 1000);
        await db.query(
          "update public.payments set amount=1500,payment_date='2026-10-01' where id=$1",
          [payment.id],
        );
        income = (await db.query('select * from public.income where payment_id=$1', [payment.id]))
          .rows;
        assert.equal(income.length, 1);
        assert.equal(Number(income[0].amount), 1500);
        assert.equal(income[0].date.toISOString().slice(0, 10), '2026-10-01');
        await assert.rejects(
          db.query(
            "insert into public.payments(user_id,invoice_id,amount,payment_date) values($1,$2,1500.01,'2026-09-06')",
            [A, invoice.id],
          ),
          /exceeds remaining/,
        );
        assert.equal(
          (await db.query('select * from public.payments where invoice_id=$1', [invoice.id])).rows
            .length,
          1,
        );
        assert.equal(
          (
            await db.query('update public.income set amount=1 where payment_id=$1 returning id', [
              payment.id,
            ])
          ).rows.length,
          0,
        );
        await assert.rejects(
          db.query(
            "insert into public.income(user_id,title,category,amount,date,payment_id) values($1,'Fake','Tuition',1,'2026-09-01',$2)",
            [A, payment.id],
          ),
          /row-level security/,
        );
        await asUser(B);
        await assert.rejects(
          db.query(
            "insert into public.payments(user_id,invoice_id,amount,payment_date) values($1,$2,1,'2026-09-01')",
            [B, invoice.id],
          ),
          /Invoice not found/,
        );
        await asUser(A);
      },
    );
    await t.test('batch receipts map to Batch Fee and delete their linked income', async () => {
      const p = (
        await db.query(
          "insert into public.payments(user_id,invoice_id,amount,payment_date) values($1,$2,1200,'2026-09-06') returning id",
          [A, batchInvoice.id],
        )
      ).rows[0];
      assert.equal(
        (await db.query('select category from public.income where payment_id=$1', [p.id])).rows[0]
          .category,
        'Batch Fee',
      );
      await db.query('delete from public.payments where id=$1', [p.id]);
      assert.equal(
        (await db.query('select * from public.income where payment_id=$1', [p.id])).rows.length,
        0,
      );
    });
    await t.test('duplicate attendance and invalid statuses are rejected', async () => {
      await db.query(
        "insert into public.attendance(user_id,student_id,date,status) values($1,$2,'2026-09-01','present')",
        [A, student.id],
      );
      await assert.rejects(
        db.query(
          "insert into public.attendance(user_id,student_id,date,status) values($1,$2,'2026-09-01','absent')",
          [A, student.id],
        ),
        /unique constraint/,
      );
      await assert.rejects(
        db.query(
          "insert into public.attendance(user_id,student_id,date,status) values($1,$2,'2026-09-02','wrong')",
          [A, student.id],
        ),
        /check constraint/,
      );
    });
    await t.test(
      'deleting students preserves paid history and removes unpaid dependents',
      async () => {
        await assert.rejects(
          db.query('select public.delete_student_record($1,false)', [student.id]),
          /payment history/,
        );
        await db.query('select public.delete_student_record($1,true)', [member.id]);
        assert.equal(
          (await db.query('select * from public.batch_students where id=$1', [member.id])).rows
            .length,
          0,
        );
        assert.equal(
          (await db.query('select * from public.invoices where id=$1', [batchInvoice.id])).rows
            .length,
          0,
        );
        await asUser(B);
        await assert.rejects(
          db.query('select public.delete_student_record($1,false)', [student.id]),
          /Student not found/,
        );
        await asUser(A);
      },
    );
    await t.test('archived students stop receiving new invoices', async () => {
      await db.query('update public.students set active=false where id=$1', [student.id]);
      await db.query("select public.generate_monthly_invoices('2027-01-01')");
      assert.equal(
        (
          await db.query(
            "select * from public.invoices where student_id=$1 and month='2027-01-01'",
            [student.id],
          )
        ).rows.length,
        0,
      );
      await db.query('update public.students set active=true where id=$1', [student.id]);
    });
    await t.test(
      'repayments settle and reopen loans; generated balances cannot be forged',
      async () => {
        loan = (
          await db.query(
            "insert into public.loans(user_id,person_name,amount,type,date,due_date) values($1,'Friend',5000,'Lent','2026-09-01','2026-09-30') returning *",
            [A],
          )
        ).rows[0];
        const p = (
          await db.query(
            "insert into public.loan_payments(user_id,loan_id,amount,date) values($1,$2,1250,'2026-09-05') returning id",
            [A, loan.id],
          )
        ).rows[0];
        assert.equal(
          Number(
            (await db.query('select repaid_amount from public.loans where id=$1', [loan.id]))
              .rows[0].repaid_amount,
          ),
          1250,
        );
        await assert.rejects(
          db.query("update public.loans set type='Borrowed' where id=$1", [loan.id]),
          /cannot change after repayment/,
        );
        await assert.rejects(
          db.query('update public.loans set amount=1000 where id=$1', [loan.id]),
          /check constraint/,
        );
        await assert.rejects(
          db.query('update public.loans set repaid_amount=5000 where id=$1', [loan.id]),
          /permission denied/,
        );
        await assert.rejects(
          db.query(
            "insert into public.loan_payments(user_id,loan_id,amount,date) values($1,$2,4000,'2026-09-06')",
            [A, loan.id],
          ),
          /exceeds remaining/,
        );
        await db.query(
          "insert into public.loan_payments(user_id,loan_id,amount,date) values($1,$2,3750,'2026-09-06')",
          [A, loan.id],
        );
        assert.equal(
          (await db.query('select status from public.loans where id=$1', [loan.id])).rows[0].status,
          'settled',
        );
        await db.query('delete from public.loan_payments where id=$1', [p.id]);
        const changed = (await db.query('select * from public.loans where id=$1', [loan.id]))
          .rows[0];
        assert.equal(changed.status, 'pending');
        assert.equal(Number(changed.repaid_amount), 3750);
      },
    );
    await t.test('reminders persist, deduplicate and resolve completed tasks', async () => {
      const task = (
        await db.query(
          "insert into public.tasks(user_id,title,date,reminder_at) values($1,'Due task',current_date,now()-interval '1 hour') returning id",
          [A],
        )
      ).rows[0];
      await db.query('select public.refresh_reminders()');
      await db.query('select public.refresh_reminders()');
      let n = (
        await db.query("select * from public.notifications where source_id=$1 and kind='task'", [
          task.id,
        ])
      ).rows;
      assert.equal(n.length, 1);
      assert.equal(n[0].read_at, null);
      await db.query("update public.tasks set status='completed' where id=$1", [task.id]);
      await db.query('select public.refresh_reminders()');
      n = (
        await db.query("select * from public.notifications where source_id=$1 and kind='task'", [
          task.id,
        ])
      ).rows;
      assert.ok(n[0].read_at);
      await asUser(B);
      assert.equal(
        (await db.query('select * from public.notifications where user_id=$1', [A])).rows.length,
        0,
      );
      await asUser(A);
    });
    await t.test(
      'backup SQL preserves accounting, escapes text and refuses nonempty targets',
      async () => {
        await db.query(
          "insert into public.expense(user_id,title,category,amount,date,description) values($1,$2,'Study',19.95,'2026-09-01',$3)",
          [A, "Student's book", "Quotes ' and backslashes \\"],
        );
        const tables = [
          'students',
          'batches',
          'batch_students',
          'attendance',
          'invoices',
          'payments',
          'income',
          'expense',
          'tasks',
          'loans',
          'loan_payments',
          'notifications',
        ];
        const backup = {
          app: 'JPMS',
          schema_version: 1,
          profile: (await db.query('select * from public.users where id=$1', [A])).rows[0],
          data: {},
        };
        for (const table of tables) {
          const rows = (await db.query(`select * from public.${table}`)).rows;
          backup.data[table] = rows.map((r) =>
            Object.fromEntries(
              Object.entries(r).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v]),
            ),
          );
        }
        await db.exec('reset role');
        await db.exec('begin');
        for (const table of [
          'notifications',
          'loan_payments',
          'loans',
          'income',
          'payments',
          'invoices',
          'attendance',
          'batch_students',
          'batches',
          'students',
          'tasks',
          'expense',
        ])
          await db.query(`delete from public.${table} where user_id=$1`, [A]);
        await db.exec('commit');
        const sql = buildRestoreSql(backup, A);
        await db.exec(sql);
        assert.equal(
          Number(
            (await db.query('select sum(amount) total from public.income where user_id=$1', [A]))
              .rows[0].total,
          ),
          backup.data.income.reduce((s, r) => s + Number(r.amount), 0),
        );
        assert.equal(
          Number(
            (await db.query('select repaid_amount from public.loans where id=$1', [loan.id]))
              .rows[0].repaid_amount,
          ),
          3750,
        );
        assert.equal(
          (await db.query('select title from public.expense where user_id=$1', [A])).rows[0].title,
          "Student's book",
        );
        await assert.rejects(db.exec(sql), /workspace must be empty/);
        await db.exec('rollback');
        assert.throws(
          () => buildRestoreSql({ ...backup, schema_version: 2 }, A),
          /version 1 backup/,
        );
        await asUser(A);
      },
    );
    await t.test('Storage policies and anonymous access reject other owners', async () => {
      await db.query("insert into storage.objects(bucket_id,name) values('jpms-avatars',$1)", [
        `${A}/photo.jpg`,
      ]);
      await assert.rejects(
        db.query("insert into storage.objects(bucket_id,name) values('jpms-avatars',$1)", [
          `${B}/photo.jpg`,
        ]),
        /row-level security/,
      );
      await asUser(B);
      assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
      await asUser(null, 'anon');
      await assert.rejects(db.query('select * from public.tasks'), /permission denied/);
      await assert.rejects(db.query('select public.refresh_reminders()'), /permission denied/);
      await assert.rejects(db.query('select private.refresh_all_reminders()'), /permission denied/);
    });
    await t.test(
      'administrator account removal cascades through financial relationships',
      async () => {
        await db.exec('reset role');
        await db.query('delete from auth.users where id=$1', [A]);
        assert.equal(
          (await db.query('select * from public.users where id=$1', [A])).rows.length,
          0,
        );
        assert.equal(
          (await db.query('select * from public.payments where user_id=$1', [A])).rows.length,
          0,
        );
        assert.equal(
          (await db.query('select * from public.loans where user_id=$1', [A])).rows.length,
          0,
        );
        assert.equal(
          (await db.query('select * from public.users where id=$1', [B])).rows.length,
          1,
        );
      },
    );
  } finally {
    await db.close();
  }
});
