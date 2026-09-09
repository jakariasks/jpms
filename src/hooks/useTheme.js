import { useEffect, useState, useCallback } from 'react';
const choices = ['light', 'dark', 'system'];
let memoryTheme;
function read() {
  if (choices.includes(memoryTheme)) return memoryTheme;
  try {
    const value = localStorage.getItem('jpms-theme');
    return choices.includes(value) ? value : memoryTheme || 'system';
  } catch {
    return memoryTheme || 'system';
  }
}
function apply(value) {
  const dark =
    value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  return dark;
}
export function useTheme() {
  const [theme, setState] = useState(read);
  const [isDark, setDark] = useState(
    () =>
      theme === 'dark' ||
      (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
  );
  useEffect(() => {
    const handler = (event) => {
      if (event?.type === 'storage' && event.key !== null && event.key !== 'jpms-theme') return;
      if (event?.type === 'storage') memoryTheme = undefined;
      const value = choices.includes(event?.detail) ? event.detail : read();
      setState(value);
      setDark(apply(value));
    };
    const media = matchMedia('(prefers-color-scheme: dark)');
    handler();
    media.addEventListener('change', handler);
    window.addEventListener('jpms-theme', handler);
    window.addEventListener('storage', handler);
    return () => {
      media.removeEventListener('change', handler);
      window.removeEventListener('jpms-theme', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const setTheme = useCallback((value) => {
    if (!choices.includes(value)) return;
    memoryTheme = value;
    try {
      localStorage.setItem('jpms-theme', value);
    } catch {}
    setState(value);
    setDark(apply(value));
    window.dispatchEvent(new CustomEvent('jpms-theme', { detail: value }));
  }, []);
  return { theme, isDark, setTheme };
}
