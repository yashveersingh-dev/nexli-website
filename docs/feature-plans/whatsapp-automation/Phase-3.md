# WhatsApp Automation — Phase 3: Live WABA/BSP Integration (BLOCKED — needs official API)

## Gate
Requires **official WhatsApp Business Platform access**: a verified Meta Business + WABA + registered phone number + system-user token (Cloud API) **or** a **BSP account + API key** (AiSensy/Interakt/Gupshup/Wati), **Meta-approved templates**, and a **public HTTPS webhook** (Cloud API path needs **Firebase Blaze** or the BSP's hosted relay). Live sending **costs INR per message.** Do not enable live mode until all exist.

## Scope
1. Implement `CloudApiProvider` and/or `BspProvider` behind the Phase 1 `WhatsAppProvider` interface — real `sendTemplate`/`sendSession`, inbound webhook handler, delivery/read status callbacks mapped to the existing message state machine.
2. Real template submission → Meta approval-status sync.
3. Phone-number quality-rating + messaging-limit-tier monitoring; SMS fallback on failure (ties to comms module).
4. Webhook signature verification; per-tenant routing by `phoneNumberId` → `schoolId`.
5. Live cost ledger reconciled against actual category billing.

## Data model additions
```
schools/{schoolId}/waConfig
  qualityRating, messagingTier, webhookVerified:bool, lastBillingSyncAt
schools/{schoolId}/waCostLedger/{period}
  byCategory{marketing, utility, authentication}, totalInr
```

## Integration seam
- Pure provider swap — Template Studio, inbox, automations, admission chatbot, reminders (Phases 1–2) unchanged. Only `waConfig.mode` flips `mock` → `cloud`/`bsp`.
- Secrets/tokens in server/secret config, never in client bundle. Webhook authenticated + signature-verified.

## Role gating
- `wa.config.manage` (super-admin) to connect WABA/BSP and flip live mode.

## Acceptance
With a live WABA/BSP + approved templates, a parent messaging the real number lands in the same inbox; automations send real utility reminders; delivery/read + actual INR cost reconcile in the ledger — no UI rewrites from earlier phases.
