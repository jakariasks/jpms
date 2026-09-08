const incompleteLink = 'Incomplete or expired sign-in link. Please sign in again.';

// OAuth providers can return errors in either the query string or URL fragment.
export function readAuthCallbackError(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    return null;
  }
  const hash = new URLSearchParams(target.hash.slice(1));
  const get = (name) => hash.get(name) || target.searchParams.get(name);
  const code = get('error_code') || get('error');
  if (code === 'otp_expired') return 'This sign-in link has expired. Please request a new one.';
  const description = get('error_description');
  if (description) return description;
  if (code === 'access_denied')
    return 'Sign-in was cancelled or access was denied. Please try again.';
  return code ? 'Sign-in could not be completed. Please try again.' : null;
}

// Only consume links belonging to this app. Supabase verifies the returned tokens.
export function parseNativeAuthLink(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    return null;
  }
  if (
    target.protocol !== 'com.jakaria.jpms:' ||
    target.hostname !== 'auth' ||
    target.port ||
    target.username ||
    target.password ||
    !['/callback', '/recovery'].includes(target.pathname)
  )
    return null;
  const error = readAuthCallbackError(target.href);
  if (error) return { error };
  const hash = new URLSearchParams(target.hash.slice(1));
  const access_token = hash.get('access_token');
  const refresh_token = hash.get('refresh_token');
  if (!access_token || !refresh_token) return { error: incompleteLink };
  return {
    access_token,
    refresh_token,
    recovery: target.pathname === '/recovery' || hash.get('type') === 'recovery',
  };
}
