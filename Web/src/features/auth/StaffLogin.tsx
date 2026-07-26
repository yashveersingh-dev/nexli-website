import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/form';
import { useSession } from '@/app/providers/SessionProvider';
import { authErrorMessage, errorCode, sendStaffPasswordReset, signInStaff } from '@/lib/auth';
import { AuthAlert, AuthLayout } from './AuthLayout';

type Mode = 'signin' | 'reset';

export function StaffLogin() {
  const navigate = useNavigate();
  const { status } = useSession();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Already signed in → leave the public login.
  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  const onSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInStaff(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
      setBusy(false);
    }
  };

  const onReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendStaffPasswordReset(email);
      setSentTo(email.trim());
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {mode === 'signin' ? (
        <>
          <h2 className="nx-auth__title">Welcome back</h2>
          <p className="nx-auth__desc">Sign in to your NEXLI staff account.</p>

          <form className="nx-auth__form" onSubmit={onSignIn} noValidate>
            {error && <AuthAlert>{error}</AuthAlert>}
            <Field label="Work email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                leftIcon="mail"
                placeholder="name@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              labelAction={
                <button type="button" className="nx-auth__link" onClick={() => { setMode('reset'); setError(null); }} style={{ fontSize: 12 }}>
                  Forgot password?
                </button>
              }
            >
              <Input
                id="password"
                type="password"
                revealable
                autoComplete="current-password"
                leftIcon="lock"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <Button type="submit" variant="gold" size="lg" block loading={busy} rightIcon="arrow-right">
              Sign in
            </Button>
          </form>

          <div className="nx-auth__formfoot">
            <div className="nx-auth__divider">PARENT OR GUARDIAN?</div>
            <Button variant="ghost" size="lg" block leftIcon="phone" onClick={() => navigate('/login/parent')}>
              Sign in with your mobile number
            </Button>
            <div className="nx-auth__switch" style={{ marginTop: 10 }}>
              No password needed — we'll text you a one-time code.
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="nx-auth__title">Reset password</h2>
          <p className="nx-auth__desc">We'll email you a secure link to set a new password.</p>

          {sentTo ? (
            <div className="nx-auth__form">
              <AuthAlert tone="success">
                If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. Check your inbox
                (and spam).
              </AuthAlert>
              <Button variant="ghost" size="lg" block leftIcon="chevron-left" onClick={() => { setMode('signin'); setSentTo(null); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form className="nx-auth__form" onSubmit={onReset} noValidate>
              {error && <AuthAlert>{error}</AuthAlert>}
              <Field label="Work email" htmlFor="reset-email">
                <Input
                  id="reset-email"
                  type="email"
                  leftIcon="mail"
                  placeholder="name@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Button type="submit" variant="gold" size="lg" block loading={busy} rightIcon="send">
                Send reset link
              </Button>
              <button type="button" className="nx-auth__link" style={{ textAlign: 'center' }} onClick={() => { setMode('signin'); setError(null); }}>
                Back to sign in
              </button>
            </form>
          )}
          <p className="nx-auth__desc" style={{ marginTop: 18, fontSize: 12 }}>
            Note: students and parents cannot change passwords. Password help for them is handled by your school's
            coordinator or IT admin.
          </p>
        </>
      )}
    </AuthLayout>
  );
}
