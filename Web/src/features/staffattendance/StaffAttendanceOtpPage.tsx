import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { Field, Input, OTPInput } from '@/components/form';
import { EmptyState } from '@/components/feedback';
import { useToast } from '@/components/Toast';
import { useSession, useOwnership } from '@/app/providers/SessionProvider';
import { isValidIndianMobile, toE164India, errorCode, authErrorMessage } from '@/lib/auth';
import { useStaff } from '@/features/school/data';
import type { StaffProfile } from '@/types/hr';
import { startKioskOtp, confirmKioskOtp, disposeKioskSession, type KioskOtpSession } from './kioskAuth';
import { recordStaffCheckIn, todayKey, useStaffAttendanceForDate } from './data';
import { STAFF_STATUS_META, formatTime } from './meta';
import type { CheckDirection } from './types';

const RECAPTCHA_ID = 'sa-kiosk-recaptcha';
const RESEND_SECONDS = 30;

type Step = 'phone' | 'code' | 'action' | 'done';

/**
 * Workflow 3 — Mobile OTP kiosk. Staff enter their mobile → OTP via a SECONDARY
 * Firebase app instance (`kioskAuth.ts`), so the kiosk's PRIMARY (reception)
 * session is never replaced. On a verified phone we match it to a staff member by
 * `phone` (E.164) and `recordStaffCheckIn(method: 'otp')`.
 */
export function StaffAttendanceOtpPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { schoolId, uid, member } = useSession();
  const { canOperate, ownerLabel } = useOwnership('staff_attendance');
  const today = todayKey();
  const { data: staff } = useStaff(schoolId);
  const { data: records } = useStaffAttendanceForDate(schoolId, today);

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matched, setMatched] = useState<StaffProfile | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [flash, setFlash] = useState<{ name: string; direction: CheckDirection } | null>(null);

  const sessionRef = useRef<KioskOtpSession | null>(null);

  // Resend cooldown timer.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  // Always dispose the secondary app on unmount.
  useEffect(() => {
    return () => {
      void disposeKioskSession(sessionRef.current);
      sessionRef.current = null;
    };
  }, []);

  const todayRecord = useMemo(
    () => (matched ? records.find((r) => r.staffId === matched.id) ?? null : null),
    [matched, records],
  );

  const reset = async () => {
    await disposeKioskSession(sessionRef.current);
    sessionRef.current = null;
    setStep('phone');
    setPhone('');
    setCode('');
    setError(null);
    setMatched(null);
    setNoMatch(false);
    setCooldown(0);
    setFlash(null);
  };

  if (!canOperate) {
    return (
      <div className="nx-page">
        <Panel>
          <EmptyState
            icon="shield"
            title="Kiosk is an operate surface"
            message={`The mobile OTP kiosk is run by ${ownerLabel}. You can review attendance from the hub.`}
            action={<Button variant="subtle" onClick={() => navigate('/staff-attendance')}>Back to hub</Button>}
          />
        </Panel>
      </div>
    );
  }

  const sendOtp = async () => {
    if (!isValidIndianMobile(phone)) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Tear down any prior session before starting a new one.
      await disposeKioskSession(sessionRef.current);
      sessionRef.current = await startKioskOtp(phone, RECAPTCHA_ID);
      setStep('code');
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
    } finally {
      setSending(false);
    }
  };

  const verifyOtp = async (value: string) => {
    const session = sessionRef.current;
    if (!session || value.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await confirmKioskOtp(session, value);
      // Verified — now done with the secondary auth; dispose it immediately.
      const phoneE164 = session.phoneE164;
      await disposeKioskSession(session);
      sessionRef.current = null;

      // Match the verified phone to a staff member (E.164 compare).
      const match = staff.find(
        (s) => s.phone && toE164India(s.phone) === phoneE164 && s.status !== 'resigned' && s.status !== 'retired',
      );
      if (!match) {
        setNoMatch(true);
        setStep('done');
        return;
      }
      setMatched(match);
      setStep('action');
    } catch (err) {
      setError(authErrorMessage(errorCode(err)));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const punch = async (direction: CheckDirection) => {
    if (!schoolId || !matched) return;
    setBusy(true);
    try {
      await recordStaffCheckIn(schoolId, {
        staffId: matched.id,
        staffName: matched.name,
        method: 'otp',
        direction,
        by: { uid: uid ?? 'unknown', name: member?.name },
      });
      setFlash({ name: matched.name, direction });
      setStep('done');
    } catch {
      toast.error('Could not record', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nx-page">
      <div className="nx-page__head">
        <div>
          <h1 className="nx-page__title">Mobile check-in</h1>
          <p className="nx-page__sub">Verify your mobile by OTP, then check in or out.</p>
        </div>
        <Button variant="ghost" leftIcon="chevron-left" onClick={() => navigate('/staff-attendance')}>Exit</Button>
      </div>

      <div className="nx-kiosk">
        <Panel>
          <div className="nx-kiosk__head">
            <span className="nx-kiosk__badge"><Icon name="phone" size={14} /> Secure OTP check-in</span>
          </div>

          {/* Step: phone */}
          {step === 'phone' && (
            <div className="nx-otp-step">
              <Field label="Your mobile number" error={error ?? undefined} hint="A 6-digit code will be sent by SMS.">
                <Input
                  prefix="+91"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  aria-label="Mobile number"
                  invalid={!!error}
                  autoFocus
                />
              </Field>
              <Button variant="gold" block leftIcon="arrow-right" loading={sending} onClick={sendOtp}>Send OTP</Button>
            </div>
          )}

          {/* Step: code */}
          {step === 'code' && (
            <div className="nx-otp-step">
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
                Enter the 6-digit code sent to <strong style={{ color: 'var(--text)' }}>+91 {phone}</strong>.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <OTPInput value={code} onChange={setCode} onComplete={verifyOtp} invalid={!!error} disabled={verifying} autoFocus aria-label="Enter the 6-digit OTP" />
              </div>
              {error && <p className="nx-field__error" role="alert" style={{ textAlign: 'center' }}>{error}</p>}
              <Button variant="gold" block loading={verifying} onClick={() => verifyOtp(code)} disabled={code.length !== 6}>Verify</Button>
              <div className="nx-otp-step__resend">
                {cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : (
                  <button type="button" onClick={sendOtp} disabled={sending}>Resend code</button>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <Button variant="ghost" size="sm" leftIcon="x" onClick={reset}>Use a different number</Button>
              </div>
            </div>
          )}

          {/* Step: action (matched) */}
          {step === 'action' && matched && (
            <div className="nx-otp-step">
              <div className="nx-kiosk-found">
                <Avatar name={matched.name} src={matched.photoUrl} size={48} />
                <div className="nx-kiosk-found__main">
                  <div className="nx-kiosk-found__name">{matched.name}</div>
                  <div className="nx-kiosk-found__meta">
                    {matched.designation || matched.employeeId || '—'}
                    {todayRecord?.checkInAt ? ` · in ${formatTime(todayRecord.checkInAt)}` : ''}
                  </div>
                </div>
                <span className="nx-sa-pill nx-sa-pill--present"><Icon name="shield-check" size={12} /> Verified</span>
              </div>
              <div className="nx-kiosk-actions">
                <button type="button" className="nx-kiosk-big nx-kiosk-big--in" onClick={() => punch('in')} disabled={busy}>
                  <span className="nx-kiosk-big__icon"><Icon name="check-circle" size={30} /></span>
                  Check In
                </button>
                <button type="button" className="nx-kiosk-big nx-kiosk-big--out" onClick={() => punch('out')} disabled={busy}>
                  <span className="nx-kiosk-big__icon"><Icon name="arrow-right" size={30} /></span>
                  Check Out
                </button>
              </div>
            </div>
          )}

          {/* Step: done (confirmation OR no-match) */}
          {step === 'done' && (
            noMatch ? (
              <div className="nx-kiosk-confirm" role="status" aria-live="polite">
                <div className="nx-kiosk-confirm__icon is-out"><Icon name="alert-triangle" size={32} /></div>
                <div className="nx-kiosk-confirm__title">No staff matches that number</div>
                <div className="nx-kiosk-confirm__sub">
                  Your mobile +91 {phone} isn't linked to a staff profile. Ask HR/reception to update your number.
                </div>
                <div style={{ marginTop: 16 }}>
                  <Button variant="subtle" onClick={reset}>Try another number</Button>
                </div>
              </div>
            ) : (
              <div className="nx-kiosk-confirm" role="status" aria-live="polite">
                <div className={`nx-kiosk-confirm__icon${flash?.direction === 'out' ? ' is-out' : ''}`}>
                  <Icon name={flash?.direction === 'out' ? 'arrow-right' : 'check'} size={34} />
                </div>
                <div className="nx-kiosk-confirm__title">{flash?.direction === 'out' ? 'Checked out' : 'Checked in'}</div>
                <div className="nx-kiosk-confirm__sub">{flash?.name} · {formatTime(Date.now())}</div>
                <div style={{ marginTop: 16 }}>
                  <Button variant="gold" leftIcon="refresh" onClick={reset}>Next person</Button>
                </div>
              </div>
            )
          )}

          {/* Invisible reCAPTCHA host (secondary app verifier). */}
          <div id={RECAPTCHA_ID} />
        </Panel>

        {(matched && todayRecord) && step === 'action' && (
          <Panel title="Today" sub="your status">
            <div className="nx-sa-feed__row" style={{ borderBottom: 0 }}>
              <div className="nx-sa-feed__main">
                <div className="nx-sa-feed__name">{STAFF_STATUS_META[todayRecord.status].label}</div>
                <div className="nx-sa-feed__time">
                  {todayRecord.checkInAt ? `In ${formatTime(todayRecord.checkInAt)}` : 'Not checked in'}
                  {todayRecord.checkOutAt ? ` · Out ${formatTime(todayRecord.checkOutAt)}` : ''}
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        OTP uses a separate, throwaway sign-in so the kiosk's own session stays active. Real SMS needs the Firebase Phone
        provider enabled (use a test number for review).
      </p>
    </div>
  );
}
