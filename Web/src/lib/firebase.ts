import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

/**
 * NEXLI Firebase initialization.
 *
 * - Spark (free) tier; Firestore hosted in an India region (DPDP data residency).
 * - Offline-first: persistent local cache with multi-tab support so attendance,
 *   timetable, rosters, etc. work on 2G / offline and sync when back online.
 * - App Check is a documented seam (added with a reCAPTCHA key later); it must not
 *   block local development.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // Fail loud and early in dev rather than producing cryptic Firebase errors later.
  // eslint-disable-next-line no-console
  console.error(
    '[NEXLI] Missing Firebase env vars. Copy Web/.env.example to Web/.env and fill in the values.',
  );
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);

// App Check (anti-abuse): attests requests come from our real app, not a stolen
// API key hitting Firestore/Auth directly. Env-gated so local dev and any build
// WITHOUT a key is unaffected — it only initializes when a reCAPTCHA v3 site key
// is present. NEEDS YASHVEER: create a reCAPTCHA v3 site key, set
// VITE_RECAPTCHA_SITE_KEY, and turn ON App Check enforcement in the Firebase
// console (Firestore + Auth) — until enforcement is enabled this is a no-op.
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (recaptchaSiteKey) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth: Auth = getAuth(firebaseApp);

export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  // Optional fields are modelled as `undefined` throughout the data layer (and
  // `stripUndefined` only strips shallowly). Ignore undefined on write so a nested
  // optional (e.g. a blank dish calorie, an unset cutoff) can never throw
  // "Unsupported field value: undefined" at runtime. Matches the seed's setting.
  ignoreUndefinedProperties: true,
});

export { firebaseConfig };
