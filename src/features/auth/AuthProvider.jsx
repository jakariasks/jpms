import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { queryClient } from '../../lib/queryClient';
import { api } from '../../services/api';
import { useToday } from '../../hooks/useToday';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [recovering, setRecovering] = useState(window.location.pathname === '/reset-password');
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let alive = true;
    let eventSeen = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      eventSeen = true;
      if (!alive) return;
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        setRecovering(false);
      }
      setSession(next);
      setLoading(false);
      setAuthError(null);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (alive && !eventSeen) {
          setSession(data?.session ?? null);
          setAuthError(error);
          setLoading(false);
        }
      })
      .catch((error) => {
        if (alive) {
          setAuthError(error);
          setLoading(false);
        }
      });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);
  const user = session?.user || null;
  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => api.profile(user.id),
    enabled: !!user,
  });
  // Date-sensitive pages subscribe to this context even when cached rows stay unchanged.
  const today = useToday(profileQuery.data?.timezone);
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    await queryClient.cancelQueries();
    queryClient.clear();
    setSession(null);
  }
  return (
    <Context.Provider
      value={{
        user,
        session,
        loading,
        authError,
        profile: profileQuery.data,
        today,
        profileQuery,
        recovering,
        setRecovering,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
