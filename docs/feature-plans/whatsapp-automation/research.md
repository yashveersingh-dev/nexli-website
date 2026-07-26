# WhatsApp Business API Automation — Research

> Pooled "world-best" feature set for a WhatsApp-first parent/admission engagement product for Indian schools. Benchmarks: AiSensy, Interakt, Gupshup, Wati, WhatsApp Cloud API (Meta), Yellow.ai, Verloop, plus admissions CRMs (NoPaperForms/Meritto).

## 1. Channel foundation
- Official **WhatsApp Business Platform (Cloud API)** via Meta directly or a BSP (AiSensy/Interakt/Gupshup/Wati). Verified business profile, display name, green tick (optional).
- Phone-number management, quality rating & messaging-limit tiers, opt-in/opt-out compliance (HSM/template policy).
- Webhook for inbound messages + delivery/read status callbacks.

## 2. Template (HSM) management
- Template categories (2026 model): **Utility**, **Authentication**, **Marketing**, **Service**. India per-message pricing (2026): Marketing highest, Utility/Authentication low, **Service (user-initiated session replies) free**.
- Template builder: header (text/image/doc/video), body with named/numbered variables, footer, buttons (quick-reply, call-to-action URL/phone), multilingual variants.
- Submission → Meta approval status tracking; rejection reasons; version history.
- Variable mapping to school data (student name, class, due amount, date, link).

## 3. Admission chatbot (lead → enrolment)
- Inbound "Hi" → guided flow: enquiry capture (child name, grade sought, locality), brochure/fee-structure send, slot booking for visit/interaction, application link, document checklist.
- Lead scoring & stage (enquiry → application → visit → offer → admitted); auto-assign to counsellor; follow-up nudges.
- FAQ deflection (fees, syllabus, transport, timings) via menu/keyword + (optional) AI NLU.
- Handoff to human when intent unclear or on request.

## 4. Fee reminders & payments
- Scheduled utility reminders: upcoming due, due-today, overdue, partial-paid; with amount + pay link (ties to wallet/fee + payment gateway module).
- Payment confirmation / receipt message; instalment plan nudges.
- Quiet-hours, frequency caps, language per family.

## 5. Broadcast & alerts
- Segmented broadcasts (by class/section/route/house) using approved templates: holidays, PTM, exam datesheet, results published, event invites, emergency closure.
- Tie-in with IoT/safety alerts, transport alerts, attendance alerts, circulars.
- Per-message delivery/read analytics; failed-delivery retry/fallback to SMS.

## 6. Two-way shared inbox
- Unified team inbox: assign, tag, snooze, internal notes, canned replies, quick-template insert.
- 24-hour service-window awareness (free-form replies only inside window; outside → template).
- Conversation history tied to the student/parent record; SLA timers; resolution status.
- Multi-agent, working-hours auto-reply, away messages.

## 7. Automation & flows
- Trigger library: event-based (admission enquiry, fee due, absence marked, result published, bus delayed) → template/flow.
- Visual flow builder; conditions, delays, branching; opt-out handling.
- WhatsApp **Flows** (native forms) for structured data capture (admission form, feedback, consent).

## 8. Analytics & compliance
- Conversation volume, template performance, cost per category, response time, CSAT.
- Consent ledger (opt-in source + timestamp), opt-out registry, DPDP Act 2023 compliance, audit trail.
- Cost dashboard (per-template-message INR; alerts on spend).

## 9. UX principles
- Parents act from WhatsApp (no app install) — the product's reach advantage in India.
- Staff work from one inbox; templates inserted in two clicks; bot-to-human handoff seamless.
- Honest cost visibility (marketing vs utility) so schools control spend.

## 10. India-specific notes & 2026 pricing
- Most Indian schools go via a **BSP** (AiSensy/Interakt/Gupshup/Wati) — simpler onboarding, INR billing, markup 10–30% over Meta rates (some BSPs zero platform fee).
- 2026 pricing shifted to **per-template-message**: India approx — Marketing ~₹0.88/msg, Utility & Authentication ~₹0.115–0.145/msg, **Service/user-initiated replies free**.
- Language: Hindi + regional template variants essential.
- Opt-in must be genuine (admission form / explicit consent); fines + number-quality penalties for spam.

## Sources
- [WhatsApp Business API Pricing India 2026 — AiSensy](https://aisensy.com/pricing)
- [Best WhatsApp Business API Cost in India 2026 — mTalkz](https://www.mtalkz.com/blog/whatsapp-business-api-cost-india)
- [WhatsApp Business API Pricing India 2026 — Whautomate](https://whautomate.com/whatsapp-business-api-pricing-india)
- [WhatsApp API Pricing India 2026 — Codingclave](https://codingclave.com/guides/whatsapp-api-pricing-india-2026-comparison)
