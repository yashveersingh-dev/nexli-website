# WhatsApp Automation — Phase 1: Template Studio + Inbox + Send Abstraction (Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED for live use)
- **Official WhatsApp Business Platform access** — either Meta **Cloud API** directly (Meta Business account, verified business, WABA, registered phone number, system-user token, approved message templates) **or** a **BSP account** (AiSensy / Interakt / Gupshup / Wati) with an API key. Without this, no message can be sent or received.
- **Approved message templates (HSM)** — every business-initiated message needs a Meta-approved template; approval is an external process taking hours–days.
- **A webhook endpoint** for inbound messages + delivery/read callbacks — needs a public HTTPS endpoint. **Firebase Spark cannot host the webhook** (Cloud Functions = Blaze); a BSP that exposes polling/its own inbox can partly mitigate, but live two-way still needs Blaze or the BSP's hosted webhook relay.
- **Per-message cost** — real sends cost INR (Marketing ~₹0.88, Utility/Auth ~₹0.115–0.145; Service replies free). Live sending is a paid operation.

### Why it is blocked
No real WhatsApp messages without a verified WABA/BSP + approved templates. We will **never simulate a fake live send** to a real number. Until keys exist, all sends route to a **`MockWhatsAppProvider`** that records the would-be message (template, variables, recipient, simulated status) into an outbox — no network call.

### Buildable NOW, fully offline with mock provider
- **Template Studio** (build templates, variables, buttons, languages, local approval-status simulation).
- **Two-way inbox UI** (assign/tag/snooze/notes/canned replies, 24h-window logic) driven by a mock conversation seed.
- **Contact & consent ledger** (opt-in/opt-out registry).
- **Outbox + delivery-status state machine** (queued → sent → delivered → read → failed) updated by the mock provider.
- **Cost estimator** (per-category INR) computed locally — full spend visibility before going live.
- A `WhatsAppProvider` abstraction so going live = adding `CloudApiProvider` / `BspProvider`, no UI changes.

---

## Phase 1 scope

### Data model (Firestore, under `schools/{schoolId}/`)
```
schools/{schoolId}/waConfig (singleton)
  mode('mock'|'cloud'|'bsp'), bsp, phoneNumberId, wabaId, tokenRef, webhookSecretRef
schools/{schoolId}/waTemplates/{templateId}
  name, category('utility'|'authentication'|'marketing'|'service')
  language, header{type,content}, bodyText, variables[], footer, buttons[]
  status('local_draft'|'submitted'|'approved'|'rejected'), metaTemplateName, version
schools/{schoolId}/waContacts/{contactId}
  personId, phone, optIn:bool, optInSource, optInAt, optOutAt, languagePref
schools/{schoolId}/waConversations/{conversationId}
  contactId, personId, assignedTo, status('open'|'snoozed'|'closed')
  tags[], lastInboundAt, serviceWindowExpiresAt, slaDueAt
schools/{schoolId}/waConversations/{cid}/messages/{messageId}
  direction('in'|'out'), kind('template'|'session'), templateId?, body, variables{}
  status('queued'|'sent'|'delivered'|'read'|'failed'), error?, costEstimateInr, ts
schools/{schoolId}/waOutbox/{jobId}
  templateId, recipients[], variablesMap, scheduledAt, status, sentCount, failedCount
```

### Screens
1. **Template Studio** — builder with live preview, variable mapping to school fields, language variants, (simulated) approval status.
2. **Shared Inbox** — conversation list, thread view, assign/tag/snooze/notes, canned replies, 24h service-window indicator (template vs free-form enforced).
3. **Contacts & Consent** — opt-in/opt-out ledger, language preference.
4. **Outbox & Cost** — queued/sent jobs, per-category INR cost estimate + spend dashboard.

### Integration seam
- `whatsapp/WhatsAppProvider.ts`: `sendTemplate() | sendSession() | onInbound(cb) | onStatus(cb)`. Phase 1 = `MockWhatsAppProvider`. Live = `CloudApiProvider` / `BspProvider` (Phase 3).
- Status callbacks update the message state machine identically for mock and live.
- Recipient data pulled from existing student/parent records; consent enforced before queueing.

### Role gating (data-driven roles)
- `wa.templates.manage` (comms admin), `wa.inbox.agent` (front-desk/counsellor), `wa.broadcast.send` (admin), `wa.config.manage` (super-admin).
- Agents see only assigned/tenant conversations; all scoped by `schoolId`.

### Phase 1 acceptance
Build an approved-looking utility template, see a seeded inbound conversation, reply (free-form inside window, template outside), queue a broadcast to a segment, and see per-message INR cost + delivery-status progression — all via the mock provider, zero real messages.
