import { supabase } from '../lib/supabase';
export const TABLES = [
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
export function errorMessage(error) {
  if (error?.code === '23503')
    return 'This record has related history. Remove its dependents or archive it.';
  if (error?.code === '23505')
    return 'This record already exists. Refresh your data before trying again.';
  if (error?.code === '23514') return 'Check the amounts, dates and required fields.';
  if (error?.code === '42501')
    return 'Permission denied. Please check your session and database policies.';
  if (error?.code === 'PGRST116')
    return 'The record is no longer available or cannot be edited directly. Refresh and try again.';
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code))
    return 'Run supabase/migrations/001_jpms.sql in your Supabase SQL Editor first.';
  return error?.message || 'Something went wrong. Please try again.';
}
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}
async function allRows(table, uid, signal) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const page = unwrap(
      await supabase
        .from(table)
        .select('*')
        .eq('user_id', uid)
        .order('id')
        .range(start, start + 499)
        .abortSignal(signal),
    );
    rows.push(...page);
    if (page.length < 500) return rows;
  }
}
export const api = {
  async snapshot(uid, signal) {
    unwrap(await supabase.rpc('refresh_reminders').abortSignal(signal));
    const rows = await Promise.all(TABLES.map((t) => allRows(t, uid, signal)));
    return Object.fromEntries(TABLES.map((t, i) => [t, rows[i]]));
  },
  async save(table, values, uid, id, submissionId) {
    if (!TABLES.includes(table)) throw new Error('Unknown record type.');
    const request = id
      ? supabase.from(table).update(values).eq('id', id).eq('user_id', uid)
      : supabase
          .from(table)
          .insert({ ...values, user_id: uid, ...(submissionId ? { id: submissionId } : {}) });
    const result = await request.select().single();
    // A preserved form submission UUID prevents duplicate creates after a lost response.
    if (!id && submissionId && result.error?.code === '23505') {
      const found = await supabase
        .from(table)
        .select('*')
        .eq('id', submissionId)
        .eq('user_id', uid)
        .maybeSingle();
      if (found.data) {
        const matches = Object.entries(values).every(
          ([k, v]) =>
            JSON.stringify(found.data[k]) === JSON.stringify(v) ||
            String(found.data[k]) === String(v),
        );
        if (matches) return found.data;
        throw new Error(
          'This submission was already saved with different details. Close this form and refresh first.',
        );
      }
    }
    return unwrap(result);
  },
  async remove(table, id, uid) {
    if (!TABLES.includes(table)) throw new Error('Unknown record type.');
    if (['students', 'batch_students'].includes(table))
      return unwrap(
        await supabase.rpc('delete_student_record', {
          record_id: id,
          is_batch: table === 'batch_students',
        }),
      );
    return unwrap(
      await supabase.from(table).delete().eq('id', id).eq('user_id', uid).select().single(),
    );
  },
  async attendance(values, uid) {
    return unwrap(
      await supabase
        .from('attendance')
        .upsert(
          { ...values, user_id: uid },
          { onConflict: values.student_id ? 'student_id,date' : 'batch_student_id,date' },
        )
        .select()
        .single(),
    );
  },
  async generate(month) {
    return unwrap(
      await supabase.rpc('generate_monthly_invoices', { billing_month: month + '-01' }),
    );
  },
  async markAllRead(uid) {
    return unwrap(
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', uid)
        .is('read_at', null),
    );
  },
  async profile(uid) {
    return unwrap(await supabase.from('users').select('*').eq('id', uid).single());
  },
  async updateProfile(uid, values) {
    return unwrap(await supabase.from('users').update(values).eq('id', uid).select().single());
  },
  async avatarUrl(path) {
    return path
      ? unwrap(await supabase.storage.from('jpms-avatars').createSignedUrl(path, 3600)).signedUrl
      : null;
  },
  async uploadAvatar(uid, file) {
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    if (!ext || file.size > 2097152) throw new Error('Choose JPG, PNG or WebP, at most 2 MB.');
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    unwrap(
      await supabase.storage
        .from('jpms-avatars')
        .upload(path, file, { contentType: file.type, upsert: false }),
    );
    try {
      await api.updateProfile(uid, { profile_image: path });
    } catch (error) {
      await supabase.storage.from('jpms-avatars').remove([path]);
      throw error;
    }
    return path;
  },
};
