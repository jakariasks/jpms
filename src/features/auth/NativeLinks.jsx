import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
export default function NativeLinks() {
  const navigate = useNavigate();
  const { setRecovering } = useAuth();
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return;
    let handleRef;
    let stopped = false;
    async function handle({ url }) {
      try {
        const target = new URL(url);
        if (target.protocol !== 'com.jakaria.jpms:' || target.hostname !== 'auth') return;
        const params = new URLSearchParams(target.hash.slice(1));
        if (params.get('error_description')) throw new Error(params.get('error_description'));
        const recovery = target.pathname === '/recovery' || params.get('type') === 'recovery';
        const access_token = params.get('access_token'),
          refresh_token = params.get('refresh_token');
        if (!access_token || !refresh_token)
          throw new Error('Incomplete or expired sign-in link. Request a new one.');
        if (recovery) setRecovering(true);
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        navigate(recovery ? '/reset-password' : '/', { replace: true });
      } catch (error) {
        toast.error(error.message);
      }
    }
    App.addListener('appUrlOpen', handle).then((ref) => {
      if (stopped) ref.remove();
      else handleRef = ref;
    });
    App.getLaunchUrl().then((result) => {
      if (result && !stopped) handle(result);
    });
    return () => {
      stopped = true;
      handleRef?.remove();
    };
  }, [navigate, setRecovering]);
  return null;
}
