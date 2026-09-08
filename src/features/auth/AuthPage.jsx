import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, appUrl } from '../../lib/supabase';
import { useAuth } from './AuthProvider';
import { Field, Button, Loading } from '../../components/ui';
import { errorMessage } from '../../services/api';
import googleLogo from '../../assets/google-g.png';
import './google-auth.css';
const titles = {
  login: ['Welcome back', 'Your day, money and teaching — all in one place.'],
  register: ['Create your workspace', 'Start organizing the things that matter to you.'],
  forgot: ['Reset your password', 'We’ll send a secure recovery link to your email.'],
  reset: ['Choose a new password', 'Use a strong password you haven’t used elsewhere.'],
};
export const authRedirect = (recovery = false) =>
  Capacitor.isNativePlatform()
    ? `com.jakaria.jpms://auth/${recovery ? 'recovery' : 'callback'}`
    : `${appUrl}/${recovery ? 'reset-password' : 'auth/callback'}`;
export default function AuthPage({ mode = 'login' }) {
  const methods = useForm();
  const { user, loading, recovering, setRecovering } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const googleInFlight = useRef(false);
  const hasGoogleLogin = mode === 'login' || mode === 'register';
  useEffect(() => {
    // Returning with the browser Back button can restore a busy page from its cache.
    const resetGoogleBusy = () => {
      googleInFlight.current = false;
      setGoogleBusy(false);
    };
    window.addEventListener('pageshow', resetGoogleBusy);
    return () => window.removeEventListener('pageshow', resetGoogleBusy);
  }, []);
  if (loading)
    return (
      <main className="fatal">
        <Loading />
      </main>
    );
  if (user && mode !== 'reset')
    return <Navigate to={recovering ? '/reset-password' : '/'} replace />;
  async function signInWithGoogle() {
    if (googleInFlight.current || methods.formState.isSubmitting) return;
    googleInFlight.current = true;
    setGoogleBusy(true);
    setGoogleError('');
    setNotice('');
    methods.clearErrors('root');
    let leavingPage = false;
    try {
      if (!supabase) throw new Error('Sign-in is not configured. Please contact the app owner.');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: authRedirect(),
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('Google sign-in could not start. Please try again.');
      setRecovering(false);
      if (Capacitor.isNativePlatform()) {
        // Google sign-in opens in a system browser tab; NativeLinks handles the return.
        await Browser.open({ url: data.url, toolbarColor: '#153d35' });
      } else {
        window.location.assign(data.url);
        leavingPage = true;
      }
    } catch (error) {
      setGoogleError(errorMessage(error));
    } finally {
      if (!leavingPage) {
        googleInFlight.current = false;
        setGoogleBusy(false);
      }
    }
  }
  async function submit(values) {
    if (googleInFlight.current) return;
    methods.clearErrors('root');
    setGoogleError('');
    setNotice('');
    try {
      let result;
      if (mode === 'login')
        result = await supabase.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
      if (mode === 'register')
        result = await supabase.auth.signUp({
          email: values.email.trim(),
          password: values.password,
          options: { data: { name: values.name.trim() }, emailRedirectTo: authRedirect() },
        });
      if (mode === 'forgot')
        result = await supabase.auth.resetPasswordForEmail(values.email.trim(), {
          redirectTo: authRedirect(true),
        });
      if (mode === 'reset') result = await supabase.auth.updateUser({ password: values.password });
      if (result.error) throw result.error;
      if (mode === 'forgot')
        setNotice(
          'If an account exists for this email, a recovery link has been sent. Check your inbox and spam folder.',
        );
      if (mode === 'register' && !result.data.session) {
        setNotice('Check your email to confirm your account, then return to sign in.');
        methods.reset();
      }
      if (mode === 'reset') {
        setRecovering(false);
        toast.success('Password updated');
        navigate('/', { replace: true });
      }
    } catch (error) {
      methods.setError('root', { message: errorMessage(error) });
    }
  }
  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand">
          <span className="brand-mark">J</span>
          <div>
            JPMS<small>Personal workspace</small>
          </div>
        </div>
        <h1>
          A little more clarity.
          <br />
          <span>Every single day.</span>
        </h1>
        <p>
          Make room for your studies, your students, and your own ambitions. Keep the details
          together.
        </p>
        <div className="auth-note flex items-center gap-2">
          <ShieldCheck size={18} />
          Your private space for a well-managed life.
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <h1>{titles[mode][0]}</h1>
          <p>{titles[mode][1]}</p>
          {notice && (
            <div className="notice mt-6" role="status">
              {notice}
            </div>
          )}
          {hasGoogleLogin && (
            <div className="google-auth">
              <button
                type="button"
                className="google-sign-in"
                onClick={signInWithGoogle}
                disabled={googleBusy || methods.formState.isSubmitting}
                aria-busy={googleBusy}
              >
                <img src={googleLogo} alt="" width="20" height="20" />
                <span>Continue with Google</span>
                {googleBusy && <LoaderCircle size={18} className="spin" aria-hidden="true" />}
              </button>
              {googleBusy && (
                <span className="sr-only" role="status">
                  Opening Google sign-in…
                </span>
              )}
              {googleError && (
                <p role="alert" className="alert-error">
                  {googleError}
                </p>
              )}
              <div className="auth-divider">
                <span>or continue with email</span>
              </div>
            </div>
          )}
          {mode === 'reset' && !user ? (
            <div className="notice mt-6">
              Open the recovery link from your email first.{' '}
              <Link className="text-link" to="/forgot-password">
                Request a new link
              </Link>
            </div>
          ) : (
            <FormProvider {...methods}>
              <form noValidate onSubmit={methods.handleSubmit(submit)}>
                {mode === 'register' && (
                  <Field
                    name="name"
                    label="Full name"
                    required
                    maxLength={120}
                    autoComplete="name"
                  />
                )}
                {mode !== 'reset' && (
                  <Field
                    name="email"
                    label="Email address"
                    type="email"
                    required
                    autoComplete="email"
                  />
                )}
                {mode !== 'forgot' && (
                  <Field
                    name="password"
                    label={mode === 'reset' ? 'New password' : 'Password'}
                    type="password"
                    required
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    rules={{
                      minLength: {
                        value: mode === 'login' ? 1 : 8,
                        message: 'Use at least 8 characters',
                      },
                      maxLength: { value: 128, message: 'Use at most 128 characters' },
                    }}
                  />
                )}{' '}
                {['register', 'reset'].includes(mode) && (
                  <Field
                    name="confirm"
                    label="Confirm password"
                    type="password"
                    required
                    autoComplete="new-password"
                    rules={{
                      validate: (value) =>
                        value === methods.getValues('password') || 'Passwords do not match',
                    }}
                  />
                )}
                {mode === 'login' && (
                  <Link className="text-link justify-end" to="/forgot-password">
                    Forgot password?
                  </Link>
                )}
                {methods.formState.errors.root && (
                  <p role="alert" className="alert-error">
                    {methods.formState.errors.root.message}
                  </p>
                )}
                <Button
                  type="submit"
                  busy={methods.formState.isSubmitting}
                  disabled={googleBusy}
                  icon={ArrowRight}
                >
                  {
                    {
                      login: 'Sign in',
                      register: 'Create account',
                      forgot: 'Send recovery link',
                      reset: 'Update password',
                    }[mode]
                  }
                </Button>
              </form>
            </FormProvider>
          )}
          <div className="auth-links">
            {mode === 'login' ? (
              <>
                New to JPMS? <Link to="/register">Create an account</Link>
              </>
            ) : (
              <Link to="/login">Back to sign in</Link>
            )}
          </div>
          <p className="auth-footer">Jakaria Personal Management System</p>
        </div>
      </section>
    </main>
  );
}
