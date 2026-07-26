# Secure Online Exam — Phase 2: Soft Lockdown + Mock Proctoring Console

Buildable fully offline. No paid SDK yet — uses only standard browser APIs + the `MockProctoringProvider`.

## Scope
1. **Browser soft-lockdown** (no install, no paid SDK):
   - Enforce Fullscreen API; count and log exits.
   - `visibilitychange` / `window.blur` → tab-switch/focus-loss events.
   - Suppress copy/paste/right-click/print where the browser allows; warn otherwise.
   - Detect multiple displays (`window.screen` heuristics), dev-tools-open heuristic.
   - Configurable thresholds → escalating warnings → optional auto-flag/auto-pause.
   - Honest degradation: clearly state in UI what the browser cannot block (no faked guarantees).

2. **Mock proctoring event pipeline** — `MockProctoringProvider` emits a realistic scripted stream (no-face, multi-face, looking-away, phone-detected, voice-detected) with timestamps + sample thumbnail placeholders, so downstream UI is real.

3. **Live invigilation console** (built against mock feed):
   - Candidate grid sorted by live risk score; per-candidate drill-in (mock tile), event timeline, broadcast announcement, force-pause / extend-time / terminate actions writing to `attempts`.

4. **Integrity scoring engine** — pure, deterministic, offline:
   - Weighted aggregation of `navigationLog` + proctoring events → per-attempt `integrityScore` + `flaggedSegments[]`.

## Data model additions
```
schools/{schoolId}/exams/{examId}/attempts/{studentId}
  proctoringEvents[]   // {type, severity, ts, thumbRef?, source:'browser'|'mock'|'sdk'}
  integrityScore       // 0-100 (engine output)
  flaggedSegments[]    // {ts, type, severity, note}
  reviewerDecision     // 'pending'|'clean'|'minor'|'violation'
  reviewerNote, reviewedBy, reviewedAt

schools/{schoolId}/exams/{examId}/proctorSessions/{proctorUserId}
  assignedStudentIds[], announcements[]
```

## Screens
- **Live Invigilation Console** (proctor/teacher).
- **Lockdown warnings overlay** inside CBT player.
- **Integrity Review** screen — list flagged attempts, evidence timeline, decision buttons.

## Integration seam
- The console subscribes to a `ProctoringProvider` event stream + Firestore `attempts`. Same code path will consume real SDK events in Phase 3.
- Integrity engine lives in `exam/integrity/scoreAttempt.ts` — pure function, unit-testable, vendor-agnostic.

## Role gating
- `exam.proctor` — invigilation console + actions.
- `exam.integrity.review` — review/decide on flags.
- Students cannot read others' attempts or proctoring data (security rules).

## Acceptance
A proctor opens the console during a live mock exam, sees candidates ranked by risk from scripted events, drills into one, broadcasts a message, extends one student's time, and an integrity report with a flag timeline + reviewer decision is produced — all offline.
