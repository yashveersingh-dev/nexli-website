#!/usr/bin/env node
/** Verifies the Firebase Admin SDK can authenticate with the current credentials
 *  (GOOGLE_APPLICATION_CREDENTIALS / ADC). Prints the resolved project + does a
 *  trivial Auth + Firestore call. No data is written. */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';

try {
  const app = initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
  console.log(`• Credentials source: GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'set' : '(ADC)'}`);
  console.log(`• Configured projectId: ${app.options.projectId}`);

  // Auth check (lists up to 1 user; succeeds even if there are zero users).
  const users = await getAuth().listUsers(1);
  console.log(`✓ Auth reachable (existing users sampled: ${users.users.length})`);

  // Firestore check (reads up to 1 school doc).
  const snap = await getFirestore().collection('schools').limit(1).get();
  console.log(`✓ Firestore reachable (schools sampled: ${snap.size})`);

  console.log('\n✅ Admin SDK authenticated successfully.\n');
  process.exit(0);
} catch (e) {
  console.error('\n✖ Admin SDK verification FAILED:', e.code || e.message || e);
  console.error('  Check that GOOGLE_APPLICATION_CREDENTIALS points to a valid service-account key for project', PROJECT_ID, '\n');
  process.exit(1);
}
