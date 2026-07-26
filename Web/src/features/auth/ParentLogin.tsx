import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { Button } from '@/components/Button';
import { Field, Input, OTPInput } from '@/components/form';
import { useSession } from '@/app/providers/SessionProvider';
import {
  authErrorMessage,
  confirmParentOtp,
  createRecaptcha,
  errorCode,
  isValidIndianMobile,
  sendParentOtp,
  toE164India,
} from '@/lib/auth';
import { AuthAlert, AuthLayout } from './AuthLayout';

type Step = 'phone' | 'otp';
const RESEND_SECONDS = 30;

export function ParentLogin() {
  const navigate = useNavigate();
  const { status } = useSession();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  useEffect(() => {
    if (status === 'authenticated') navigate('/', { replace: true });
  }, [status, navigate]);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Dispose the reCAPTCHA verifier on unmount.
  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  const ensureVerifier = (): RecaptchaVerifier => {
    if (!verifierRef.current) verifierRef.current = createRecaptcha('nx-recaptcha');
    return verifierRef.current;
  };

  const requestOtp = async () => {
    setError(null);
    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setBusy(true);
    try {
      confirmationRef.current = await sendParentOtp(phone, ensureVerifier());
      setStep('otp');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
      // Reset the verifier so a retry gets a fresh challenge.
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setBusy(false);
    }
  };

  const onPhoneSubmit = (e: FormEvent) => {
    e.preventDefault();
    void requestOtp();
  };

  const verify = async (value: string) => {
    setError(null);
    if (value.length !== 6 || !confirmationRef.current) return;
    setBusy(true);
    try {
      await confirmParentOtp(confirmationRef.current, value);
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      {step === 'phone' ? (
        <>
          <h2 className="nx-auth__title">Parent sign in</h2>
          <p className="nx-auth__desc">Enter your registered mobile number — we'll text you a one-time code. No password needed.</p>

          <form className="nx-auth__form" onSubmit={onPhoneSubmit} noValidate>
            {error && <AuthAlert>{error}</AuthAlert>}
            <Field label="Mobile number" htmlFor="phone" hint="Use the number registered with your school.">
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                prefix="+91"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={13}
                required
                autoFocus
              />
            </Field>
            <Button type="submit" variant="gold" size="lg" block loading={busy} rightIcon="arrow-right">
              Send code
            </Button>
          </form>

          <div className="nx-auth__formfoot">
            <div className="nx-auth__divider">STAFF?</div>
            <div className="nx-auth__switch">
              Teachers & administrators ·{' '}
              <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
                Sign in with email
              </a>
            </div>
          </div>
        </>
      ) : (
        <>
          <h2 className="nx-auth__title">Enter the code</h2>
          <p className="nx-auth__otpsent">
            We sent a 6-digit code to <strong>{toE164India(phone)}</strong>.
          </p>

          <div className="nx-auth__form">
            {error && <AuthAlert>{error}</AuthAlert>}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}>
              <OTPInput
                value={code}
                onChange={setCode}
                onComplete={verify}
                autoFocus
                aria-label="Enter the 6-digit code"
              />
            </div>
            <Button
              variant="gold"
              size="lg"
              block
              loading={busy}
              disabled={code.length !== 6}
              onClick={() => void verify(code)}
            >
              Verify & continue
            </Button>
            <div className="nx-auth__resend">
              {cooldown > 0 ? (
                <>Resend code in {cooldown}s</>
              ) : (
                <button type="button" className="nx-auth__link" onClick={() => void requestOtp()}>
                  Resend code
                </button>
              )}
            </div>
            <button
              type="button"
              className="nx-auth__link"
              style={{ textAlign: 'center' }}
              onClick={() => { setStep('phone'); setError(null); setCode(''); }}
            >
              Change number
            </button>
          </div>
        </>
      )}

      {/* Invisible reCAPTCHA target (required by Firebase phone auth). */}
      <div id="nx-recaptcha" />
    </AuthLayout>
  );
}
