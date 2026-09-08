import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../features/auth/AuthProvider';
import { api, errorMessage } from '../services/api';
export function useWorkspace() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['workspace', user?.id],
    queryFn: ({ signal }) => api.snapshot(user.id, signal),
    enabled: !!user,
    refetchInterval: 60000,
  });
}
export function useAction() {
  const { user } = useAuth();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ run }) => run(user.id),
    onSuccess: async (_, { message = 'Saved successfully' }) => {
      await client.invalidateQueries({ queryKey: ['workspace', user.id] });
      if (message) toast.success(message);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  return { ...mutation, run: (run, message) => mutation.mutateAsync({ run, message }) };
}
