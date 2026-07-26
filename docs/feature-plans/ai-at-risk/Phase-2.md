# AI At-Risk — Phase 2: MTSS Intervention Workflow + Case Management (Fully Offline-Buildable)

No external dependency. Builds the action layer on top of the Phase 1 scoring engine.

## Scope
1. **Intervention plans** — create from a risk flag; assign owner (teacher/counsellor/coordinator); MTSS tier auto-suggested from band (Tier 1/2/3); goals, actions, due dates, parent-involvement toggle.
2. **Action library** — reusable templates: mentoring, attendance contract, remedial class, counselling referral (links to counselling module), home visit, fee-relief referral (links to fees), peer support.
3. **Progress monitoring** — scheduled check-ins; re-score comparison (did band improve?); decision: continue / escalate tier / close with outcome.
4. **Case management** — counsellor caseload view, SLA + reminders, escalation, full audit history; cross-link to safeguarding when a flag is protection-related.
5. **Alerts & nudges** — band-crossing alerts to the owner, weekly digest, positive-improvement nudges. (Delivery via comms/WhatsApp module, which may be in mock mode.)
6. **Equity & effectiveness reporting** — are interventions reaching the right students; outcome gaps by cohort.

## Data model additions
```
schools/{schoolId}/interventionPlans/{planId}
  studentId, owner, tier(1|2|3), status('open'|'monitoring'|'escalated'|'closed')
  goals[], actions[]{type, dueAt, status, note}, parentInvolved:bool
  baselineBand, currentBand, outcome, history[], createdBy, createdAt
schools/{schoolId}/interventionTemplates/{templateId}
  name, tier, defaultActions[], linkedModule
schools/{schoolId}/atRiskCases/{caseId}
  studentId, assignedTo, planIds[], slaDueAt, escalations[], auditLog[]
```

## Screens
- **Intervention Plan** editor + timeline, **Counsellor Caseload**, **Plan Progress / Re-score** view, **Effectiveness/Equity Report**, **Action Template** library.

## Integration seam
- Re-score uses Phase 1 engine; referrals create records in counselling/fees/safeguarding via thin adapters; nudges emit to the comms module.
- Outcome data feeds back as a labelled dataset for the optional Phase 3 ML layer.

## Role gating
- `atrisk.intervene` (teacher/counsellor for own caseload), `atrisk.case.manage` (counsellor/coordinator), `atrisk.escalate` (coordinator/principal). Audit-logged; need-to-know.

## Acceptance
From an At-Risk flag, an owner creates a Tier-2 plan with actions + parent loop; a check-in re-scores the student and closes with a recorded outcome; counsellor caseload + effectiveness report update — fully offline.
