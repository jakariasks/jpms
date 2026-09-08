import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || '';
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
function secretKey(value) {
  if (value.startsWith('sb_secret_')) return true;
  try {
    return (
      JSON.parse(atob(value.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).role ===
      'service_role'
    );
  } catch {
    return false;
  }
}
function validUrl(value) {
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) && !!parsed.hostname;
  } catch {
    return false;
  }
}
export const configured =
  validUrl(url) &&
  key.length > 20 &&
  !url.includes('YOUR_') &&
  !key.includes('YOUR_') &&
  !secretKey(key);
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;
export const appUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
