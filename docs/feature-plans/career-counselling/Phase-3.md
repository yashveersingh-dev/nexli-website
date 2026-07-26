# Career Counselling & Aptitude Engine — Phase 3 (longitudinal, AI narrative, analytics)

> The standalone-grade depth: longitudinal re-assessment to track how interests
> evolve (NEP's developmental view), an optional AI narrative layer (gated behind a
> key), parent involvement, and school-wide career analytics.

## New capabilities

### 1. Longitudinal tracking & re-assessment
- Allow periodic re-takes (e.g. Class 9 explorer → Class 10 decision → Class 12
  refinement); store each `career_results` with a `cycle` so the student sees how
  interests/aptitudes evolved over time (trend charts).
- "How your profile changed" comparison view across cycles.

### 2. Optional AI narrative guidance (⛔ needs AI key — gated)
- When `career_config.aiNarrativeEnabled` and a key is present, generate a
  personalised, encouraging narrative + tailored next-steps from the deterministic
  scores (the scores are still the offline source of truth; AI only writes prose).
- Without a key, the **templated narrative** from Phase 1 is shown and the AI section
  uses the existing `AILockedOverlay`. The recommendation never depends on AI.
- (When implemented, follow the Claude API guidance for the model + prompt; the AI
  only *describes* the deterministic result, it does not *decide* it.)

### 3. Parent involvement
- Parent-facing read-only result + a short "how to support this stream choice" guide
  (templated). Optional parent acknowledgement before a stream decision is finalised
  (reuses the existing consent module pattern).

### 4. Subject-selection workflow (post-recommendation action)
- Turn the recommendation into an actual **subject/stream selection request** for
  Class 11 (links to the academics module's subject allocation), with counsellor
  sign-off — closing the loop from assessment → decision → enrolment.

### 5. School-wide career analytics
- Leadership dashboard: stream-inclination distribution per batch, aptitude
  strengths across the cohort, careers most-matched, scholarship-eligible counts,
  assessment completion coverage — informs streams the school should offer (NEP
  multidisciplinary planning). Export CSV/PDF (existing pattern).

### 6. Outcome tracking
- Optionally record the **actual stream chosen** vs recommended, and (via alumni
  module) longer-term outcomes — feeds back to validate/tune the stream matrix weights.

## Data model additions
- Extend `career_results` with `cycle`, `prevResultId`, `aiNarrativeStatus`.
- `stream_selection` `{ id, studentId, chosenStream, recommendedStream, counsellorSignOff, parentAck?, decidedAt }`.
- `career_outcomes` `{ id, studentId, actualStream, recommendedStream, notes }`.

## Screens
- `ProfileTrendPage` (longitudinal comparison).
- AI narrative section in the report (gated).
- `StreamSelectionPage` (decision workflow + sign-offs).
- `CareerAnalyticsPage` (leadership cohort analytics).

## Role gating
- Stream-selection sign-off: counsellor + academic coordinator.
- AI narrative + analytics config: principal/coordinator.
- Parent: read own child's shared result + acknowledge.

## Cross-module reuse
- Academics (subject allocation), Consent (parent acknowledgement), Skills Passport
  (application pack), Alumni (outcome tracking), existing Counselling module (sessions).

## Acceptance
- A student's re-assessment shows a clear longitudinal comparison.
- The AI narrative is purely additive and cleanly gated; removing the key leaves a
  fully functional, deterministic product.
- The recommendation flows into an auditable stream-selection decision with the right
  sign-offs, and leadership sees accurate cohort analytics.
