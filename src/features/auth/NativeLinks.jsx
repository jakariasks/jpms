import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
import { parseNativeAuthLink } from './authLinks';
import { errorMessage } from '../../services/api';
export default function NativeLinks() {
  const navigate = useNavigate();
  const { setRecovering } = useAuth();
  const launchUrl = useRef(null);
  const pending = useRef(new Set());
  const completedUrl = useRef(null);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !supabase) return;
    let handleRef;
    let stopped = false;
    async function handle({ url }) {
      const link = parseNativeAuthLink(url);
      if (!link || pending.current.has(url) || completedUrl.current === url) return;
      pending.current.add(url);
      try {
        if (link.error) throw new Error(link.error);
        const { access_token, refresh_token, recovery } = link;
        setRecovering(recovery);
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        navigate(recovery ? '/reset-password' : '/', { replace: true });
      } catch (error) {
        setRecovering(false);
        toast.error(errorMessage(error));
        navigate('/login', { replace: true });
      } finally {
        completedUrl.current = url;
        pending.current.delete(url);
        // Some platforms close the tab themselves after the app link opens.
        await Browser.close().catch(() => {});
      }
    }
    App.addListener('appUrlOpen', handle)
      .then((ref) => {
        if (stopped) ref.remove();
        else handleRef = ref;
      })
      .catch(() => toast.error('Sign-in links are unavailable. Please restart the app.'));
    // Reuse the launch result across route changes and React effect re-runs.
    launchUrl.current ??= App.getLaunchUrl().catch(() => undefined);
    launchUrl.current.then((result) => {
      if (result && !stopped) void handle(result);
    });
    return () => {
      stopped = true;
      handleRef?.remove();
    };
  }, [navigate, setRecovering]);
  return null;
}
