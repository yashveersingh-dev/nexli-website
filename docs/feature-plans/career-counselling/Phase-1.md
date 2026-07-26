# Career Counselling & Aptitude Engine — Phase 1 (minimal real version)

> Goal of Phase 1: a real, working **RIASEC interest + core aptitude** assessment a
> Class 9–10 student can take, a **deterministic offline scoring + stream
> recommendation** engine, an explainable **report**, and a counsellor review screen
> that links the result to the existing counselling module. No mock results;
> everything is computed from the student's actual answers.

## Buildable now vs blocked
| Capability | Status | Note |
|---|---|---|
| Assessment item bank (RIASEC + aptitude) as Firestore/bundled data | ✅ Buildable now (offline) | Seeded `assessment_defs` + `assessment_items`. |
| Take-assessment UI (chunked, save-and-resume, timed where needed) | ✅ Buildable now | Pure React + Firestore. |
| **Scoring + stream-recommendation logic** | ✅ Buildable now (offline) | Deterministic pure functions — explicitly the part the task says is offline-buildable. |
| Career fit ranking from a curated career library | ✅ Buildable now | Static/Firestore career library + match function. |
| Explainable report (scores + why + printable PDF) | ✅ Buildable now | Reuses existing print/PDF pattern. |
| Counsellor review + link to existing counselling session | ✅ Buildable now | Writes `career_results`, links a `career`-type `counseling` session. |
| **AI-generated narrative guidance** (personalised essay) | ⛔ Blocked (AI key) | Phase 1 ships templated, rules-driven narrative; the AI essay is gated behind a key and clearly shelled (locked overlay using existing `AILockedOverlay`). |
| Live national college/scholarship DB sync (NSP, AISHE, etc.) | ⛔ Blocked (paid/gov data) | Phase 1 uses a curated seed library; live sync deferred + never faked. |

**Key point for the task:** the aptitude/RIASEC **scoring logic is fully offline-
buildable now**; only the optional AI-written narrative needs an AI key.

## Data model (under `schools/{schoolId}/…`)

### New collections
1. `assessment_defs` (collection) — which batteries exist (seeded, school-toggleable).
   ```
   { id, title, kind: 'riasec'|'aptitude'|'mi'|'personality'|'vak'|'eq',
     classBands: ['8-9'|'10'|'11-12'], constructs: string[],
     timeLimitSec?, instructions, active, version }
   ```
2. `assessment_items` (collection) — the item bank.
   ```
   { id, defId, construct,            // e.g. 'R','I','A','S','E','C' or 'numerical'
     prompt, type: 'likert'|'forced_choice'|'mcq',
     options: [{ value, label, keyedTo?, correct? }],
     reverseKeyed?: boolean, weight?, order, locale? }
   ```
3. `assessment_attempts` (collection) — a student's run (resumable).
   ```
   { id, studentId, studentName, classGrade, defId,
     status: 'in_progress'|'submitted'|'scored',
     answers: { [itemId]: value }, startedAt, submittedAt,
     elapsedSec?, createdBy }
   ```
4. `career_results` (collection) — scored outcome (the deliverable).
   ```
   { id, studentId, studentName, classGrade, attemptIds: string[],
     scores: {
       riasec: { R,I,A,S,E,C: number }, hollandCode: 'RIA' etc,
       aptitude: { numerical, verbal, logical, spatial, mechanical: band/percentile },
       mi?: {...}, personality?: {...}
     },
     streamRecommendation: {
       top: 'science_pcm'|'science_pcb'|'commerce_maths'|'commerce'|'humanities'|'vocational',
       alternatives: [...], fitScores: { stream: % }, drivers: string[]  // explainability
     },
     careerMatches: [{ careerId, title, fitPct, cluster }],
     subjectSuggestions: string[],
     skillsToBuild: string[],          // NEP competencies → Skills Passport
     consistencyFlags?: string[],
     narrative?: { templated: string, ai?: string },   // ai null in P1 unless key present
     status: 'draft'|'counsellor_reviewed'|'shared',
     counsellorNote?, reviewedBy?, reviewedAt?,
     linkedCounselingSessionId?,       // ties to existing counselling module
     createdAt, createdBy }
   ```
5. `career_library` (collection) — curated careers (seeded, school-editable).
   ```
   { id, title, cluster, riasecTags: string[], requiredAptitudes: string[],
     subjects: string[], educationPath, entranceExams: string[],
     salaryBandInr?, demandOutlook?, description, active }
   ```
6. `career_config` (single doc `default`) — stream-matrix weights + toggles.
   ```
   { enabled, streamMatrix: { [stream]: { riasecWeights, aptitudeWeights } },
     requireCounsellorReview: boolean, aiNarrativeEnabled: boolean, updatedAt }
   ```

### Reused existing data (read-only)
- `students` (name, class/grade, section) — eligibility (Class 9–12) + identity.
- gradebook / `examinations` marks — sanity-check aptitude vs actual performance
  (shown as context in the report, never overrides the test).
- `counseling` (existing module, `career` type) — the result links to / creates a
  confidential session for the human conversation.

## Scoring engine (`features/careercounselling/scoring.ts`)
Pure, unit-tested functions (the offline core):
- `scoreRiasec(items, answers)` → `{ R,I,A,S,E,C }` + `hollandCode` (top-3).
- `scoreAptitude(items, answers)` → per-aptitude raw → band/percentile (norm table).
- `recommendStream(scores, streamMatrix)` → `{ top, alternatives, fitScores, drivers }`
  using transparent weighted rules (Logical+Numerical→Science; Verbal+Social/EQ→
  Humanities; Analytical+Conventional/Enterprising→Commerce; etc.).
- `matchCareers(scores, careerLibrary)` → ranked `careerMatches` with fit %.
- `consistencyChecks(answers, items)` → flags (reverse-key contradictions, straight-lining).
- `buildTemplatedNarrative(result)` → rules-based prose (no AI).

## Screens & components

### Student portal — Career assessment
`features/careercounselling/TakeAssessmentPage.tsx`:
- Eligibility gate (Class 9–12). Lists available batteries (`assessment_defs`).
- **Chunked runner**: one construct/section per screen, progress bar, save-and-resume
  (writes `assessment_attempts.answers` incrementally), timer only on aptitude.
- On submit → score → write `career_results` (status `draft`).
- `MyCareerResultPage.tsx`: the student sees their report **after counsellor review**
  (if `requireCounsellorReview`), else immediately: RIASEC chart, aptitude bands,
  recommended stream + *why*, top careers, subject suggestions, skills-to-build,
  "Download report" (PDF). AI narrative section uses `AILockedOverlay` if no key.

### Counsellor — review & guidance
`features/careercounselling/CareerCounsellingHub.tsx`:
- Queue of `draft` results (filter by class/section).
- Review screen: full scores + report + the student's marks context (gradebook),
  edit/confirm the recommendation, add a professional `counsellorNote`, then
  **"Create / link counselling session"** → creates a `career`-type session in the
  existing `counseling` collection and sets `linkedCounselingSessionId`.
- Set status `counsellor_reviewed` → `shared` (controls student visibility).
- **Cohort view**: stream-inclination distribution for a Class-10 batch (chart) for
  school planning.

### Career library browser
`features/careercounselling/CareerLibraryPage.tsx`: searchable cards (cluster, RIASEC
tags, subjects, entrance exams, salary band) — usable independent of an assessment.

## Role gating
- New module key `career` (add to `lib/roles/modules.ts` + catalogue). Note: keep
  distinct from the existing `counseling` module — this is the assessment engine.
- **Students**: take assessment + view own shared result.
- **Counsellor / career counsellor / special educator / psychologist**: review,
  recommend, manage library, cohort view (`career.manage`).
- **VP-Academic / principal / coordinator**: view cohort analytics.
- Register routes:
  - `registerModule('student', 'career', …)` (take + my result)
  - `registerModule('staff', 'career', …)` (counsellor hub + library + cohort)
- `firestore.rules`: a student reads/writes only own `assessment_attempts` and reads
  own `career_results` **only when `status: 'shared'`**; counsellor roles read/write
  results + library. Mirrors the confidential counselling rule pattern.

## Reuse of existing components & patterns
`Panel`, `KPICard`, `Badge`, `Icon`, `Tabs`, `Modal`, `Sheet`, form (`Field`,
`Input`, `Select`, `Textarea`, `Toggle`), `EmptyState`, `Skeleton`, charts,
`AILockedOverlay` (for the gated AI narrative), `useSession`, `useStudents`,
`tenantCol`/`useCollection`, `formatDate`. Data layer follows
`features/counseling/data.ts`. Cross-links into the existing counselling module and
writes `skillsToBuild` toward the Skills Passport.

## Phase 1 acceptance
- A Class-10 student completes the RIASEC + aptitude battery (save-and-resume works).
- The engine produces a deterministic Holland code, aptitude bands, and a
  stream recommendation **with visible drivers** — re-running scoring on the same
  answers yields the identical result (no randomness, no AI dependency).
- A counsellor reviews, adjusts, links a confidential `career` counselling session,
  and shares the report; the student then sees it and downloads the PDF.
- The AI narrative section is cleanly locked behind a key (offline shell), and the
  college/scholarship live sync is shown as a curated-seed-only / approval-pending
  state — nothing faked.
