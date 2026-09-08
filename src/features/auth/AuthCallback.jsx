import { Navigate, Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Loading } from '../../components/ui';
import { readAuthCallbackError } from './authLinks';
export default function AuthCallback() {
  const { user, loading, recovering, authError } = useAuth();
  const error = readAuthCallbackError(window.location.href) || authError?.message;
  if (error)
    return (
      <main className="fatal">
        <h1>Sign-in could not be completed</h1>
        <p role="alert">{error}</p>
        <Link className="text-link" to="/login">
          Back to sign in
        </Link>
        <Link className="text-link" to="/forgot-password">
          Request a password recovery link
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
