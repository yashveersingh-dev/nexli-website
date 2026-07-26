# WhatsApp Automation — Phase 2: Automation Flows + Admission Chatbot + Reminders (Mock-Driven)

Buildable offline against `MockWhatsAppProvider`. Goes live with a real WABA/BSP (Phase 3).

## Scope
1. **Trigger/automation engine** — event-based rules: admission enquiry, fee due (T-3/T-0/overdue), absence marked, result published, bus delayed, circular issued → enqueue template/flow. Conditions, delays, branching, opt-out + quiet-hours + frequency caps respected.
2. **Admission chatbot flow** — guided enquiry capture (child name, grade, locality) → brochure/fee send → visit slot booking → application link → document checklist → lead stage + counsellor assignment + follow-up nudges. Keyword/menu routing now; AI NLU optional later.
3. **Fee reminders** — scheduled utility sequences with amount + pay link (links to wallet/fee + payment-gateway module), payment-confirmation/receipt messages, instalment nudges.
4. **WhatsApp Flows (native forms)** — modelled for admission form / feedback / consent (schema built now; rendered live only with API).

## Data model additions
```
schools/{schoolId}/waAutomations/{automationId}
  trigger{event, filter}, steps[]{type:'template'|'wait'|'branch'|'flow', config}
  enabled, quietHours, frequencyCap
schools/{schoolId}/admissionLeads/{leadId}
  childName, gradeSought, locality, contactId
  stage('enquiry'|'application'|'visit'|'offer'|'admitted'|'lost')
  assignedTo, score, nextFollowUpAt, history[]
schools/{schoolId}/waFlows/{flowId}
  name, purpose, schemaJson, status
```

## Screens
- **Automation Builder** (visual triggers → steps), **Admission Pipeline** (lead board by stage), **Reminder Schedules** config, **Flow Designer**.

## Integration seam
- Engine emits send-intents to the `WhatsAppProvider` (mock now). Triggers subscribe to existing module events (fees, attendance, results, transport, IoT).
- Fee pay-links reference the wallet/payment module; receipts triggered by that module's events.

## Role gating
- `wa.automation.manage` (admin), `admission.lead.manage` (admissions/counsellor), reminders gated to fee/admin roles.

## Acceptance
A simulated "Hi" runs the admission flow end-to-end creating a scored lead; a fee-due event fires a utility reminder with a pay-link; all sends land in the mock outbox with cost + status — offline.
