import { Navigate, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loading } from '../../components/ui';
export default function AuthCallback() {
  const { user, loading, recovering } = useAuth();
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const error =
    hash.get('error_description') ||
    new URLSearchParams(window.location.search).get('error_description');
  if (error)
    return (
      <main className="fatal">
        <h1>This link could not be used</h1>
        <p>{error}</p>
        <Link className="text-link" to="/forgot-password">
          Request another recovery link
        </Link>
      </main>
    );
  if (loading)
    return (
      <main className="fatal">
        <Loading />
      </main>
    );
  return <Navigate to={user ? (recovering ? '/reset-password' : '/') : '/login'} replace />;
}
