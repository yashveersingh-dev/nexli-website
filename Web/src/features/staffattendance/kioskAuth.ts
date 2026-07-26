import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  RecaptchaVerifier,
  getAuth,
  signInWithPhoneNumber,
  signOut,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';
import { firebaseConfig } from '@/lib/firebase';
import { toE164India } from '@/lib/auth';

/**
 * Kiosk phone-OTP on a SECONDARY Firebase app instance.
 *
 * The OTP kiosk runs inside the reception/owner's PRIMARY session. Firebase phone
 * auth signs the verified phone IN — on the primary `auth` that would REPLACE the
 * operator's session (exactly the trap `lib/provisioning.ts` avoids for staff
 * creation). So we mirror that pattern: spin up a throwaway secondary app, run
 * the whole OTP exchange there, then sign out + dispose it. The kiosk's primary
 * session is never touched. We only use the verification to confirm the staff
 * member owns the phone number — we then resolve the staff by phone and record
 * attendance through the normal seam under the operator's identity.
 *
 * Phone auth must be enabled in the Firebase console (Phone provider) and the app
 * domain authorized. For review, add a Phone "test number" so OTP works without
 * real SMS (and note: free-tier has a daily SMS quota).
 */

export interface KioskOtpSession {
  app: FirebaseApp;
  auth: Auth;
  verifier: RecaptchaVerifier;
  confirmation: ConfirmationResult;
  /** E.164 number the OTP was sent to (used to match a staff member). */
  phoneE164: string;
}

/**
 * Send an OTP on a fresh secondary app + invisible reCAPTCHA. Returns the live
 * session — keep it to `confirmKioskOtp` then ALWAYS `disposeKioskSession`.
 * Throws on failure (caller surfaces a toast); on throw the partial app is torn
 * down so we never leak a secondary app.
 */
export async function startKioskOtp(
  phoneRaw: string,
  recaptchaContainerId: string,
): Promise<KioskOtpSession> {
  const app = initializeApp(firebaseConfig, `nexli-kiosk-${Date.now()}`);
  const auth = getAuth(app);
  let verifier: RecaptchaVerifier | null = null;
  try {
    verifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
    const phoneE164 = toE164India(phoneRaw);
    const confirmation = await signInWithPhoneNumber(auth, phoneE164, verifier);
    return { app, auth, verifier, confirmation, phoneE164 };
  } catch (err) {
    // Tear down the partially-built secondary app so it never leaks.
    try {
      verifier?.clear();
    } catch {
      /* ignore */
    }
    await deleteApp(app).catch(() => {});
    throw err;
  }
}

/** Confirm the 6-digit code. Resolves when the phone is verified on the secondary auth. */
export async function confirmKioskOtp(session: KioskOtpSession, code: string): Promise<void> {
  await session.confirmation.confirm(code);
}

/**
 * ALWAYS call this when the OTP flow ends (success, failure, or cancel): sign out
 * the secondary auth + delete the secondary app so the kiosk's primary session is
 * preserved and no resources leak.
 */
export async function disposeKioskSession(session: KioskOtpSession | null): Promise<void> {
  if (!session) return;
  try {
    session.verifier.clear();
  } catch {
    /* ignore */
  }
  try {
    await signOut(session.auth);
  } catch {
    /* ignore */
  }
  await deleteApp(session.app).catch(() => {});
}
