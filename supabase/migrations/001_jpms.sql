-- JPMS initial migration. Run once in a new Supabase project's SQL Editor.
-- Supabase supplies auth.users, auth.uid(), storage.buckets and storage.objects.
begin;
create schema if not exists private;
revoke all on schema private from public;
create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 120), email text not null,
 phone text not null default '', profile_image text,
 theme text not null default 'system' check(theme in ('light','dark','system')),
 timezone text not null default 'Asia/Dhaka', created_at timestamptz not null default now()
);
create table public.students (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 120), phone text not null default '',
 guardian_name text not null default '', address text not null default '', class text not null, subject text not null,
 monthly_fee numeric(14,2) not null check(monthly_fee>=0), joining_date date not null,
 active boolean not null default true, schedule_days int[] not null default '{}', schedule_time time,
 created_at timestamptz not null default now(), unique(id,user_id), check(schedule_days <@ array[0,1,2,3,4,5,6])
);
create table public.batches (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 batch_name text not null check(char_length(btrim(batch_name)) between 1 and 120), class text not null, subject text not null,
 schedule text not null default '', schedule_days int[] not null default '{}', schedule_time time,
 active boolean not null default true, created_at timestamptz not null default now(), unique(id,user_id),
 check(schedule_days <@ array[0,1,2,3,4,5,6])
);
create table public.batch_students (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 batch_id uuid not null, student_name text not null check(char_length(btrim(student_name)) between 1 and 120),
 phone text not null default '', guardian_name text not null default '', address text not null default '',
 monthly_fee numeric(14,2) not null check(monthly_fee>=0), joining_date date not null,
 active boolean not null default true, created_at timestamptz not null default now(), unique(id,user_id),
 foreign key(batch_id,user_id) references public.batches(id,user_id) deferrable initially deferred
);
create table public.attendance (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 student_id uuid, batch_student_id uuid, date date not null,
 status text not null check(status in ('present','absent','cancelled')), note text not null default '',
 created_at timestamptz not null default now(), check(num_nonnulls(student_id,batch_student_id)=1),
 foreign key(student_id,user_id) references public.students(id,user_id) on delete cascade,
 foreign key(batch_student_id,user_id) references public.batch_students(id,user_id) on delete cascade,
 unique(student_id,date), unique(batch_student_id,date)
);
create table public.invoices (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 student_id uuid, batch_student_id uuid, title text not null, month date not null,
 amount numeric(14,2) not null check(amount>0), due_date date not null, created_at timestamptz not null default now(),
 unique(id,user_id), check(num_nonnulls(student_id,batch_student_id)=1), check(month=date_trunc('month',month)::date),
 foreign key(student_id,user_id) references public.students(id,user_id) deferrable initially deferred,
 foreign key(batch_student_id,user_id) references public.batch_students(id,user_id) deferrable initially deferred,
 unique(student_id,month), unique(batch_student_id,month)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 invoice_id uuid not null, student_id uuid, batch_student_id uuid,
 amount numeric(14,2) not null check(amount>0), payment_date date not null, month date not null,
 status text not null default 'paid' check(status='paid'), note text not null default '', created_at timestamptz not null default now(),
 unique(id,user_id), check(num_nonnulls(student_id,batch_student_id)=1),
 foreign key(invoice_id,user_id) references public.invoices(id,user_id) deferrable initially deferred,
 foreign key(student_id,user_id) references public.students(id,user_id) deferrable initially deferred,
 foreign key(batch_student_id,user_id) references public.batch_students(id,user_id) deferrable initially deferred
);
create table public.income (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 180),
 category text not null check(category in ('Tuition','Coaching Salary','Batch Fee','Freelancing','Other')),
 amount numeric(14,2) not null check(amount>0), date date not null, description text not null default '',
 payment_id uuid unique, created_at timestamptz not null default now(),
 foreign key(payment_id,user_id) references public.payments(id,user_id) on delete cascade
);
create table public.expense (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 180),
 category text not null check(category in ('Food','Transport','Study','Personal','Family','Others')),
 amount numeric(14,2) not null check(amount>0), date date not null, description text not null default '', created_at timestamptz not null default now()
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 180), description text not null default '', date date not null,
 priority text not null default 'medium' check(priority in ('high','medium','low')),
 status text not null default 'todo' check(status in ('todo','completed')), reminder_at timestamptz, created_at timestamptz not null default now()
);
create table public.loans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 person_name text not null check(char_length(btrim(person_name)) between 1 and 120), phone text not null default '',
 amount numeric(14,2) not null check(amount>0), type text not null check(type in ('Borrowed','Lent')),
 date date not null, due_date date, note text not null default '', repaid_amount numeric(14,2) not null default 0,
 status text generated always as (case when amount=repaid_amount then 'settled' else 'pending' end) stored,
 created_at timestamptz not null default now(), unique(id,user_id), check(repaid_amount>=0 and repaid_amount<=amount),
 check(due_date is null or due_date>=date)
);
create table public.loan_payments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 loan_id uuid not null, amount numeric(14,2) not null check(amount>0), date date not null, note text not null default '',
 created_at timestamptz not null default now(), foreign key(loan_id,user_id) references public.loans(id,user_id) deferrable initially deferred
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
 kind text not null check(kind in ('task','payment','tuition','loan')), source_id uuid not null, dedupe_key text not null,
 title text not null, body text not null, link text not null, read_at timestamptz, created_at timestamptz not null default now(), unique(user_id,dedupe_key)
);
create index students_owner on public.students(user_id,active);
create index batches_owner on public.batches(user_id,active);
create index batch_students_owner on public.batch_students(user_id,batch_id);
create index attendance_owner_date on public.attendance(user_id,date);
create index invoices_owner_month on public.invoices(user_id,month);
create index payments_owner_date on public.payments(user_id,payment_date);
create index payments_invoice on public.payments(invoice_id,user_id);
create index payments_student on public.payments(student_id,user_id);
create index payments_member on public.payments(batch_student_id,user_id);
create index income_owner_date on public.income(user_id,date);
create index expense_owner_date on public.expense(user_id,date);
create index tasks_owner_date on public.tasks(user_id,status,date);
create index loans_owner_due on public.loans(user_id,status,due_date);
create index loan_payments_owner on public.loan_payments(user_id,loan_id);
create index notifications_owner_date on public.notifications(user_id,created_at desc);

create function private.sync_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.users(id,name,email) values(new.id,left(coalesce(nullif(btrim(new.raw_user_meta_data->>'name'),''),nullif(split_part(new.email,'@',1),''),'JPMS user'),120),coalesce(new.email,''));
 else update public.users set email=coalesce(new.email,'') where id=new.id;
 end if; return new;
end $$;
create trigger jpms_signup after insert on auth.users for each row execute function private.sync_auth_profile();
create trigger jpms_email after update of email on auth.users for each row execute function private.sync_auth_profile();
insert into public.users(id,name,email)
 select id,left(coalesce(nullif(btrim(raw_user_meta_data->>'name'),''),nullif(split_part(email,'@',1),''),'JPMS user'),120),coalesce(email,'') from auth.users on conflict(id) do nothing;
create function private.validate_profile() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from pg_timezone_names where name=new.timezone) then raise exception 'Enter a valid IANA timezone.'; end if;
 if new.profile_image is not null and split_part(new.profile_image,'/',1)<>new.id::text then raise exception 'Invalid photo owner.'; end if;
 return new;
end $$;
create trigger jpms_profile before insert or update on public.users for each row execute function private.validate_profile();

-- All receipt mutations lock their invoice. Inserts/updates cannot overpay it.
create function private.guard_payment() returns trigger language plpgsql security definer set search_path='' as $$
declare bill public.invoices; paid numeric;
begin
 if tg_op='DELETE' then perform 1 from public.invoices where id=old.invoice_id for update; return old; end if;
 if auth.uid() is distinct from new.user_id then raise exception 'Payment owner mismatch.'; end if;
 if tg_op='UPDATE' and (new.invoice_id<>old.invoice_id or new.user_id<>old.user_id) then raise exception 'A receipt cannot move to another invoice.'; end if;
 select * into bill from public.invoices where id=new.invoice_id and user_id=new.user_id for update;
 if not found then raise exception 'Invoice not found.'; end if;
 select coalesce(sum(amount),0) into paid from public.payments where invoice_id=bill.id and id<>new.id;
 if paid+new.amount>bill.amount then raise exception 'Payment exceeds remaining invoice balance.'; end if;
 new.student_id:=bill.student_id; new.batch_student_id:=bill.batch_student_id; new.month:=bill.month; new.status:='paid'; return new;
end $$;
create trigger jpms_payment_guard before insert or update or delete on public.payments for each row execute function private.guard_payment();
create function private.sync_receipt_income() returns trigger language plpgsql security definer set search_path='' as $$
declare bill public.invoices;
begin
 select * into bill from public.invoices where id=new.invoice_id;
 insert into public.income(user_id,title,category,amount,date,description,payment_id)
 values(new.user_id,left(bill.title||' · '||to_char(new.month,'Mon YYYY'),180),case when new.student_id is null then 'Batch Fee' else 'Tuition' end,new.amount,new.payment_date,new.note,new.id)
 on conflict(payment_id) do update set title=excluded.title,category=excluded.category,amount=excluded.amount,date=excluded.date,description=excluded.description;
 return new;
end $$;
create trigger jpms_receipt_income after insert or update on public.payments for each row execute function private.sync_receipt_income();
create function private.guard_repayment() returns trigger language plpgsql security definer set search_path='' as $$
declare principal public.loans; paid numeric;
begin
 if tg_op='DELETE' then perform 1 from public.loans where id=old.loan_id for update; return old; end if;
 if auth.uid() is distinct from new.user_id then raise exception 'Repayment owner mismatch.'; end if;
 if tg_op='UPDATE' and (new.loan_id<>old.loan_id or new.user_id<>old.user_id) then raise exception 'A repayment cannot move to another loan.'; end if;
 select * into principal from public.loans where id=new.loan_id and user_id=new.user_id for update;
 if not found then raise exception 'Loan not found.'; end if;
 if new.date<principal.date then raise exception 'Repayment cannot precede loan date.'; end if;
 select coalesce(sum(amount),0) into paid from public.loan_payments where loan_id=principal.id and id<>new.id;
 if paid+new.amount>principal.amount then raise exception 'Repayment exceeds remaining loan balance.'; end if; return new;
end $$;
create trigger jpms_repayment_guard before insert or update or delete on public.loan_payments for each row execute function private.guard_repayment();
create function private.sync_loan_balance() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 target:=case when tg_op='DELETE' then old.loan_id else new.loan_id end;
 perform 1 from public.loans where id=target for update;
 update public.loans set repaid_amount=(select coalesce(sum(amount),0) from public.loan_payments where loan_id=target) where id=target;
 return null;
end $$;
create trigger jpms_loan_balance after insert or update or delete on public.loan_payments for each row execute function private.sync_loan_balance();
create function private.guard_loan_edit() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.type<>old.type or new.date<>old.date) and exists(select 1 from public.loan_payments where loan_id=old.id) then raise exception 'Loan type/date cannot change after repayment. Correct the repayment history first.'; end if;
 return new;
end $$;
create trigger jpms_loan_edit before update on public.loans for each row execute function private.guard_loan_edit();

-- Every business table is private to its owner, including child records.
do $$ declare tab text; begin
 foreach tab in array array['users','students','batches','batch_students','attendance','invoices','payments','income','expense','tasks','loans','loan_payments','notifications'] loop
  execute format('alter table public.%I enable row level security',tab);
  execute format('revoke all on public.%I from anon,authenticated',tab);
 end loop;
 foreach tab in array array['students','batches','batch_students','attendance','payments','expense','tasks','loan_payments'] loop
  execute format('grant select,insert,update,delete on public.%I to authenticated',tab);
  execute format('create policy own_rows on public.%I for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id)',tab);
 end loop;
end $$;
grant select on public.users to authenticated;
grant update(name,phone,profile_image,theme,timezone) on public.users to authenticated;
create policy own_profile_read on public.users for select to authenticated using((select auth.uid())=id);
create policy own_profile_update on public.users for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
grant select on public.invoices to authenticated;
create policy own_invoices on public.invoices for select to authenticated using((select auth.uid())=user_id);
grant select,insert,update,delete on public.income to authenticated;
create policy own_income_read on public.income for select to authenticated using((select auth.uid())=user_id);
create policy manual_income_insert on public.income for insert to authenticated with check((select auth.uid())=user_id and payment_id is null);
create policy manual_income_update on public.income for update to authenticated using((select auth.uid())=user_id and payment_id is null) with check((select auth.uid())=user_id and payment_id is null);
create policy manual_income_delete on public.income for delete to authenticated using((select auth.uid())=user_id and payment_id is null);
grant select,delete on public.loans to authenticated;
grant insert(id,user_id,person_name,phone,amount,type,date,due_date,note) on public.loans to authenticated;
grant update(person_name,phone,amount,type,date,due_date,note) on public.loans to authenticated;
create policy own_loans on public.loans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant select,delete on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy own_notices on public.notifications for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);

create function private.issue_invoices(owner uuid,bill_month date) returns void language plpgsql security definer set search_path='' as $$
begin
 insert into public.invoices(user_id,student_id,title,month,amount,due_date)
 select owner,id,name,bill_month,monthly_fee,(bill_month+interval '1 month - 1 day')::date from public.students
 where user_id=owner and active and monthly_fee>0 and joining_date<bill_month+interval '1 month' on conflict(student_id,month) do nothing;
 insert into public.invoices(user_id,batch_student_id,title,month,amount,due_date)
 select owner,s.id,s.student_name||' · '||b.batch_name,bill_month,s.monthly_fee,(bill_month+interval '1 month - 1 day')::date
 from public.batch_students s join public.batches b on b.id=s.batch_id and b.user_id=s.user_id
 where s.user_id=owner and s.active and b.active and s.monthly_fee>0 and s.joining_date<bill_month+interval '1 month' on conflict(batch_student_id,month) do nothing;
end $$;
create function public.generate_monthly_invoices(billing_month date) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 if billing_month is null or billing_month<>date_trunc('month',billing_month)::date or billing_month<date '2000-01-01' or billing_month>date '2100-12-01' then raise exception 'Choose a valid month.'; end if;
 perform private.issue_invoices(auth.uid(),billing_month);
end $$;
create function public.delete_student_record(record_id uuid,is_batch boolean default false) returns void language plpgsql security definer set search_path='' as $$
declare owner uuid:=auth.uid();
begin
 if owner is null then raise exception 'Sign in first.'; end if;
 if is_batch then perform 1 from public.batch_students where id=record_id and user_id=owner for update;
 else perform 1 from public.students where id=record_id and user_id=owner for update; end if;
 if not found then raise exception 'Student not found.'; end if;
 perform 1 from public.invoices where user_id=owner and (case when is_batch then batch_student_id=record_id else student_id=record_id end) order by id for update;
 if exists(select 1 from public.payments where user_id=owner and (case when is_batch then batch_student_id=record_id else student_id=record_id end)) then raise exception 'This student has payment history. Archive the student instead.'; end if;
 delete from public.invoices where user_id=owner and (case when is_batch then batch_student_id=record_id else student_id=record_id end);
 if is_batch then delete from public.batch_students where id=record_id and user_id=owner;
 else delete from public.students where id=record_id and user_id=owner; end if;
end $$;

create function private.refresh_user_reminders(owner uuid) returns void language plpgsql security definer set search_path='' as $$
declare tz text; today date;
begin
 select timezone into tz from public.users where id=owner; if not found then return; end if;
 today:=(now() at time zone tz)::date;
 perform private.issue_invoices(owner,date_trunc('month',today)::date);
 update public.notifications n set read_at=now() where user_id=owner and read_at is null and (
  (kind='task' and not exists(select 1 from public.tasks t where t.id=n.source_id and t.status='todo')) or
  (kind='loan' and not exists(select 1 from public.loans l where l.id=n.source_id and l.status='pending')) or
  (kind='payment' and not exists(select 1 from public.invoices i where i.id=n.source_id and i.amount>(select coalesce(sum(p.amount),0) from public.payments p where p.invoice_id=i.id)))
 );
 insert into public.notifications(user_id,kind,source_id,dedupe_key,title,body,link)
 select owner,'task',id,'task:'||id||':'||coalesce(reminder_at::text,date::text),'Task reminder',title,'/tasks' from public.tasks
 where user_id=owner and status='todo' and ((reminder_at is not null and reminder_at<=now()) or (reminder_at is null and date<=today))
 on conflict(user_id,dedupe_key) do update set body=excluded.body;
 insert into public.notifications(user_id,kind,source_id,dedupe_key,title,body,link)
 select owner,'loan',id,'loan:'||id||':'||due_date,'Loan reminder',person_name||' · '||type||' · BDT '||(amount-repaid_amount)::text||' remaining','/loans' from public.loans
 where user_id=owner and status='pending' and due_date<=today on conflict(user_id,dedupe_key) do update set body=excluded.body;
 insert into public.notifications(user_id,kind,source_id,dedupe_key,title,body,link)
 select owner,'payment',i.id,'payment:'||i.id,'Payment due',i.title||' · '||to_char(i.month,'Mon YYYY'),case when i.student_id is null then '/batches' else '/tuition' end from public.invoices i
 where i.user_id=owner and i.due_date<=today and i.amount>(select coalesce(sum(p.amount),0) from public.payments p where p.invoice_id=i.id) on conflict(user_id,dedupe_key) do nothing;
 insert into public.notifications(user_id,kind,source_id,dedupe_key,title,body,link)
 select owner,'tuition',id,'tuition:'||id||':'||today,'Tuition today',name||' · '||to_char(schedule_time,'HH24:MI'),'/tuition/'||id from public.students
 where user_id=owner and active and joining_date<=today and extract(dow from today)::int=any(schedule_days) and schedule_time is not null and ((today+schedule_time) at time zone tz)<=now()+interval '1 hour' on conflict(user_id,dedupe_key) do nothing;
 insert into public.notifications(user_id,kind,source_id,dedupe_key,title,body,link)
 select owner,'tuition',id,'batch:'||id||':'||today,'Batch today',batch_name||' · '||to_char(schedule_time,'HH24:MI'),'/batches/'||id from public.batches
 where user_id=owner and active and extract(dow from today)::int=any(schedule_days) and schedule_time is not null and ((today+schedule_time) at time zone tz)<=now()+interval '1 hour' on conflict(user_id,dedupe_key) do nothing;
end $$;
create function public.refresh_reminders() returns void language plpgsql security definer set search_path='' as $$
begin if auth.uid() is null then raise exception 'Sign in first.'; end if; perform private.refresh_user_reminders(auth.uid()); end $$;
create function private.refresh_all_reminders() returns void language plpgsql security definer set search_path='' as $$
declare owner uuid; begin for owner in select id from public.users loop perform private.refresh_user_reminders(owner); end loop; end $$;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.generate_monthly_invoices(date),public.delete_student_record(uuid,boolean),public.refresh_reminders() from public,anon;
grant execute on function public.generate_monthly_invoices(date),public.delete_student_record(uuid,boolean),public.refresh_reminders() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('jpms-avatars','jpms-avatars',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy jpms_avatar_read on storage.objects for select to authenticated using(bucket_id='jpms-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy jpms_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='jpms-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy jpms_avatar_update on storage.objects for update to authenticated using(bucket_id='jpms-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='jpms-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy jpms_avatar_delete on storage.objects for delete to authenticated using(bucket_id='jpms-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
