import { useSyncExternalStore } from 'react';
import { todayIn } from '../utils/domain';

function subscribe(onChange) {
  const interval = setInterval(onChange, 60_000);
  window.addEventListener('focus', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    clearInterval(interval);
    window.removeEventListener('focus', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

export function useToday(timezone = 'Asia/Dhaka') {
  const snapshot = () => todayIn(timezone);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
