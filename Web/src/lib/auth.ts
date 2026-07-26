import {
  RecaptchaVerifier,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
  type UserCredential,
} from 'firebase/auth';
import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * NEXLI authentication service.
 *
 * - **Staff** sign in with email + password.
 * - **Parents** sign in with phone OTP (no password) via Firebase phone auth +
 *   an invisible reCAPTCHA verifier. (Phone provider must be enabled in the
 *   Firebase console; the app domain must be authorized. Free-tier has a daily
 *   SMS quota — sufficient for pilots.)
 * - SMS MFA is intentionally NOT enabled (paid), but the model is MFA-ready.
 *
 * Profile resolution (role/tenant/flags) happens in SessionProvider after the
 * Firebase user is established — this layer only handles the credential exchange.
 */

/* ---------------- Error mapping ---------------- */

/** Friendly, non-leaky messages for Firebase auth error codes. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact your administrator.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/invalid-phone-number':
      return 'Enter a valid mobile number.';
    case 'auth/missing-phone-number':
      return 'Enter your mobile number.';
    case 'auth/invalid-verification-code':
      return 'That code is incorrect. Please re-enter it.';
    case 'auth/code-expired':
      return 'This code has expired. Request a new one.';
    case 'auth/captcha-check-failed':
      return 'Verification failed. Please reload and try again.';
    case 'auth/quota-exceeded':
      return 'SMS limit reached for now. Please try again later.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

interface FirebaseAuthError {
  code?: string;
}

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as FirebaseAuthError).code;
  }
  return undefined;
}

/* ---------------- Staff (email + password) ---------------- */

export async function signInStaff(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendStaffPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email.trim());
}

/* ---------------- Parent (phone OTP) ---------------- */

/**
 * Create an invisible reCAPTCHA verifier bound to a container element. Required
 * by Firebase before sending an OTP. Call `.clear()` (returned) to dispose.
 */
export function createRecaptcha(containerId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
}

/** Normalize an Indian mobile number to E.164 (+91XXXXXXXXXX). */
export function toE164India(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return `+${digits}`;
  const local = digits.replace(/^0+/, '').slice(-10);
  return `+91${local}`;
}

export function isValidIndianMobile(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(-10);
  return /^[6-9]\d{9}$/.test(digits);
}

/** Send an OTP to a phone number. Returns a ConfirmationResult to confirm later. */
export async function sendParentOtp(
  phoneRaw: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, toE164India(phoneRaw), verifier);
}

/** Confirm the 6-digit OTP, signing the parent in. */
export async function confirmParentOtp(
  confirmation: ConfirmationResult,
  code: string,
): Promise<UserCredential> {
  return confirmation.confirm(code);
}

/* ---------------- Sign out (with local data wipe) ---------------- */

/**
 * Sign out and PURGE all locally-cached Firestore data, then hard-reload.
 *
 * The offline persistent cache (IndexedDB) holds tenant data — student PII, fees,
 * medical/POCSO docs — for whoever was last signed in. On a shared device (gate
 * kiosk, staff-room PC, a parent borrowing a phone) the next user could read the
 * previous user's cached data straight from IndexedDB even though the rules would
 * block a fresh fetch. So on logout we:
 *   1. `signOut` (revoke the Firebase session),
 *   2. `terminate(db)` (release the Firestore client so the cache can be deleted —
 *      `clearIndexedDbPersistence` throws if the client is still running),
 *   3. `clearIndexedDbPersistence(db)` (delete the cached DB),
 *   4. full `location` reload so a clean, terminated SDK is re-initialized.
 *
 * Every step is best-effort and individually guarded: the session MUST end even
 * if the cache wipe or terminate fails (e.g. another open tab holds the DB). The
 * hard reload is the backstop — after it, no in-memory state from the previous
 * user survives. All logouts are treated identically (staff, parent, super admin).
 */
export async function signOutAndClearLocalData(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    /* ignore — proceed to wipe + reload regardless */
  }
  try {
    // Releases the Firestore client; required before clearing the IndexedDB cache.
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch {
    // Can fail if another tab still holds the persistence lease, or the browser
    // blocks IDB. Not fatal: the session is already revoked and the reload below
    // discards all in-memory data.
  }
  // Hard reload to a clean app with a fresh (terminated) SDK and no stale state.
  if (typeof window !== 'undefined') {
    window.location.assign('/');
  }
}

export { errorCode };
