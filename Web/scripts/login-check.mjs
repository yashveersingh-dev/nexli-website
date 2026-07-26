/**
 * Diagnostic: reproduce the app's client login against the live project, using the
 * web SDK + the values in Web/.env. Read-only (sign in + read own profile docs).
 * Tells us whether (a) Email/Password is enabled, and (b) Firestore rules let a
 * signed-in user read their userIndex/member docs. Run from Web/:  node scripts/login-check.mjs
 */
import { readFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
console.log('project:', cfg.projectId, '· apiKey present:', !!cfg.apiKey);

const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = process.env.CHK_EMAIL || 'principal@nexlidemo.test';
const PASS = process.env.CHK_PASS || 'NexliDemo@2026';

try {
  const cred = await signInWithEmailAndPassword(auth, EMAIL, PASS);
  console.log(`AUTH OK  (${EMAIL})  uid=${cred.user.uid}`);
  try {
    const idx = await getDoc(doc(db, 'userIndex', cred.user.uid));
    console.log('  userIndex read OK · exists=', idx.exists(), '· roleId=', idx.data()?.roleId, '· schoolId=', idx.data()?.schoolId);
    const sid = idx.data()?.schoolId;
    if (sid) {
      const m = await getDoc(doc(db, 'schools', sid, 'members', cred.user.uid));
      console.log('  member read OK · exists=', m.exists());
    }
    console.log('RESULT: ✅ Email/Password enabled AND rules allow profile read — login will work.');
  } catch (e) {
    console.log('  FIRESTORE READ FAILED:', e.code || e.message);
    console.log('RESULT: ⚠ Auth works but Firestore read denied — rules likely NOT deployed (DB locked).');
  }
} catch (e) {
  const code = e.code || e.message;
  console.log(`AUTH FAILED (${EMAIL}):`, code);
  if (code === 'auth/operation-not-allowed') console.log('RESULT: ⚠ Email/Password provider is DISABLED in the Firebase console.');
  else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') console.log('RESULT: ⚠ Provider enabled but credentials rejected (password mismatch?).');
  else console.log('RESULT: ⚠ Unexpected auth error.');
}
process.exit(0);
