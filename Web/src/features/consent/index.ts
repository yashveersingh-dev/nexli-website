/**
 * Public surface of the Privacy & Consent (DPDP) module.
 *
 * The DPDP consent gate is exported here so other modules (e.g. admissions /
 * student creation, which this module does NOT own) can enforce consent without
 * importing internals. Wiring of these into creation flows is the data agent's
 * job — see NOTES in the handoff for exact call sites.
 */
export { ConsentGate, ConsentWarning, ConsentRequiredBanner } from './ConsentGate';
export type { ConsentGateProps } from './ConsentGate';
export { useConsentStatus, assertConsent } from './useConsentStatus';
export type { ConsentStatus } from './useConsentStatus';
export { decideConsentGate, consentRecordHref } from './gateDecision';
export type { ConsentGateDecision, ConsentGateKind } from './gateDecision';

// Operational DPDP registers (also surfaced as tabs in the consent hub).
export type {
  ErasureRequest,
  ErasureStatus,
  BreachNotification,
  BreachStatus,
} from './registerTypes';
export {
  useErasureRequests,
  createErasureRequest,
  updateErasureRequest,
  useBreachNotifications,
  createBreachNotification,
  updateBreachNotification,
} from './registersData';

// The module's route component (kept as the default registry entry point).
export { default } from './routes';
