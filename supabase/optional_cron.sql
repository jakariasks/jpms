-- Enable pg_cron in Supabase Database -> Extensions first. Run this once as owner.
-- Creates persisted inbox reminders while JPMS is closed; not email/SMS/push delivery.
select cron.schedule('jpms-reminders','*/15 * * * *','select private.refresh_all_reminders();');
-- Inspect: select * from cron.job where jobname='jpms-reminders';
-- History: select * from cron.job_run_details order by start_time desc limit 20;
-- Disable: select cron.unschedule('jpms-reminders');
