import { useEffect, useState, useCallback } from 'react';
function read() {
  try {
    return localStorage.getItem('jpms-theme') || 'system';
  } catch {
    return 'system';
  }
}
function apply(value) {
  document.documentElement.classList.toggle(
    'dark',
    value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
  );
}
export function useTheme() {
  const [theme, setState] = useState(read);
  useEffect(() => {
    const handler = () => {
      const value = read();
      setState(value);
      apply(value);
    };
    const media = matchMedia('(prefers-color-scheme: dark)');
    handler();
    media.addEventListener('change', handler);
    window.addEventListener('jpms-theme', handler);
    return () => {
      media.removeEventListener('change', handler);
      window.removeEventListener('jpms-theme', handler);
    };
  }, []);
  const setTheme = useCallback((value) => {
    try {
      localStorage.setItem('jpms-theme', value);
    } catch {}
    setState(value);
    apply(value);
    window.dispatchEvent(new Event('jpms-theme'));
  }, []);
  return { theme, setTheme };
}
