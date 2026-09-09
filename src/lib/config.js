function clean(value) {
  const text = String(value || '').trim();
  return (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
    ? text.slice(1, -1).trim()
    : text;
}

function origin(value) {
  if (!value || /\s/.test(value)) return '';
  try {
    const parsed = new URL(value);
    return ['https:', 'http:'].includes(parsed.protocol) &&
      parsed.hostname &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      ['/', ''].includes(parsed.pathname)
      ? parsed.origin
      : '';
  } catch {
    return '';
  }
}

function publicKey(value) {
  if (value.length <= 20 || !/^[\x21-\x7e]+$/.test(value)) return false;
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const payload = value.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    return JSON.parse(atob(payload)).role === 'anon';
  } catch {
    return false;
  }
}

// Never include actual environment values in error messages.
export function readConfig(env, fallbackOrigin) {
  const rawUrl = clean(env.VITE_SUPABASE_URL);
  const url = origin(rawUrl);
  const key = clean(env.VITE_SUPABASE_PUBLISHABLE_KEY) || clean(env.VITE_SUPABASE_ANON_KEY);
  const rawAppUrl = clean(env.VITE_APP_URL) || fallbackOrigin;
  const appUrl = origin(rawAppUrl);
  const errors = [];
  if (!url || rawUrl.includes('YOUR_'))
    errors.push(
      'VITE_SUPABASE_URL must be your Supabase project origin, without an API path or line breaks.',
    );
  if (!publicKey(key) || key.includes('YOUR_'))
    errors.push(
      'Use a valid Supabase publishable or anon key on one line. Secret/service-role keys are not supported.',
    );
  if (!appUrl)
    errors.push(
      'VITE_APP_URL must be your website origin, without /login, /auth/callback or extra text.',
    );
  return { url, key, appUrl, errors, configured: errors.length === 0 };
}
