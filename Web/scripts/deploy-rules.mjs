/**
 * Deploy firestore.rules using the Admin SDK Security Rules API (service-account
 * auth — no Firebase CLI login needed). createRuleset validates syntax server-side,
 * so invalid rules can never be released.
 *   GOOGLE_APPLICATION_CREDENTIALS=serviceAccount.json node scripts/deploy-rules.mjs
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getSecurityRules } from 'firebase-admin/security-rules';
import { readFileSync } from 'node:fs';

const PROJECT_ID = process.env.NEXLI_PROJECT_ID || 'nexli-erp';
initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });

const src = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
const sr = getSecurityRules();
const file = sr.createRulesFileFromSource('firestore.rules', src);
const ruleset = await sr.createRuleset(file);
await sr.releaseFirestoreRuleset(ruleset);
console.log(`✅ Firestore rules deployed to ${PROJECT_ID}. Ruleset: ${ruleset.name}`);
process.exit(0);
