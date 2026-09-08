import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../services/api';
import { initials } from '../utils/domain';

// Every profile surface shares the same owner/path-scoped signed URL query.
export default function ProfileAvatar({ className = '', alt = '' }) {
  const { user, profile } = useAuth();
  const path = profile?.profile_image;
  const [failedUrl, setFailedUrl] = useState(null);
  const avatar = useQuery({
    queryKey: ['avatar', user?.id, path],
    queryFn: () => api.avatarUrl(path),
    enabled: !!user?.id && !!path,
    staleTime: 45 * 60 * 1000,
    refetchInterval: 45 * 60 * 1000,
  });
  const src = path && avatar.data && avatar.data !== failedUrl ? avatar.data : null;

  return (
    <span
      className={`avatar profile-avatar ${className}`}
      role={!src && alt ? 'img' : undefined}
      aria-label={!src && alt ? alt : undefined}
      aria-hidden={!alt || undefined}
    >
      {src ? (
        <img src={src} alt={alt} referrerPolicy="no-referrer" onError={() => setFailedUrl(src)} />
      ) : (
        initials(profile?.name || user?.email || 'JPMS')
      )}
    </span>
  );
}
