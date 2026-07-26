# Secure Online Exam — Phase 1: CBT Core (Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED for live use)
- **AI proctoring SDK / API** — a paid third-party browser/video proctoring service. Candidates: **Mercer | Mettl**, **Talview Proctoring SDK**, **Proctorio**, **Honorlock**, or an embeddable JS engine. These provide: webcam/audio capture + streaming, on-device or cloud ML (face/gaze/object/voice detection), evidence storage, and a reviewer console. Requires a commercial account, API key/SDK licence, and (for some) a browser extension or desktop agent.
- **Safe Exam Browser (SEB)** for true desktop lockdown — free software, but requires students to install it and the school to manage `.seb` config files; treat as an optional hardware/setup dependency.
- **Video/media storage** — continuous webcam recording is heavy. Firebase Spark (free) storage/bandwidth is insufficient; proctoring media MUST live in the SDK vendor's storage, not ours.
- **(Optional) LLM API key** — for AI-assisted subjective grading suggestions (see Phase 4). Not needed for objective auto-grading.

### Why it is blocked
We will **never fake a live proctoring connection.** Real face/gaze/object detection requires the licensed SDK + the student's camera. Until an account + key exist, proctoring runs in **"simulated/mock" mode** clearly labelled as such (sample event feeds, no real camera ML).

### Buildable NOW, fully offline with mock/sample data
- Question bank + item authoring (all item types, metadata, blueprint).
- Exam configuration (randomisation, sectioning, marking schemes, scheduling, accommodations).
- **The entire CBT exam-taking player** (question palette, server-authoritative timer, autosave, resume, fullscreen + tab-switch *detection* using standard browser events — `visibilitychange`, `blur`, Fullscreen API — which need no paid SDK).
- Objective auto-grading + results + item analysis.
- Onscreen evaluation marking workspace UI with sample scanned sheets.
- A **proctoring abstraction layer** with a `MockProctoringProvider` that emits scripted sample events, so the live invigilation console and integrity report are fully built and demoable before any vendor key exists.

---

## Phase 1 scope: Question bank + CBT player + objective grading

### Data model (Firestore, under `schools/{schoolId}/`)

```
schools/{schoolId}/questionBank/{questionId}
  type            // 'mcq_single'|'mcq_multi'|'truefalse'|'fill'|'match'|'numeric'|'short'|'long'|'comprehension'
  stemHtml        // rich text / LaTeX
  options[]       // {id, html, isCorrect}  (objective types)
  answerKey       // {value, tolerance} | string[] | matchPairs[]
  marks, negativeMarks
  subjectId, gradeId, chapter, topic, bloomLevel, difficulty
  outcomeCode, mediaRefs[]
  parentId        // for comprehension child questions
  status          // 'draft'|'in_review'|'approved'|'archived'
  version, createdBy, createdAt, updatedAt

schools/{schoolId}/examBlueprints/{blueprintId}
  name, gradeId, subjectId
  rules[]         // {topic, difficulty, count, marks}
  totalMarks, totalQuestions

schools/{schoolId}/exams/{examId}
  title, type, gradeIds[], sectionIds[], subjectId
  blueprintId | manualQuestionIds[]
  config: {
    shuffleQuestions, shuffleOptions, drawFromPoolCount,
    navigation: 'free'|'linear'|'section-locked',
    sections[]: {name, questionRefs[], durationMin, locked},
    marking: {negative, partialCredit, stepMarking},
    proctoring: {mode:'none'|'soft'|'sdk', provider:'mock'|'<vendor>'},
    accommodations: {extraTimeStudentIds:{studentId:minutes}, largeFont:[]}
  }
  window: {startAt, endAt, flexible:bool, durationMin}
  status          // 'draft'|'scheduled'|'live'|'closed'
  createdBy, createdAt

schools/{schoolId}/exams/{examId}/papers/{studentId}   // per-student assembled paper (anti-collusion)
  questionOrder[], optionOrderMap{}, assignedAt

schools/{schoolId}/exams/{examId}/attempts/{studentId}
  status          // 'not_started'|'in_progress'|'submitted'|'auto_submitted'|'terminated'
  serverStartAt, serverDeadlineAt   // SERVER-authoritative timer (Timestamp)
  responses{questionId: {value, markedForReview, answeredAt}}
  navigationLog[] // {event, ts}  (visibility/blur/fullscreen-exit)
  lastAutosaveAt
  proctoringSessionId   // null until SDK wired (Phase 3)
  score, objectiveScore, evaluated:bool
```

### Screens
1. **Question Bank** — list/filter, item editor (per-type forms, LaTeX preview), review/approve workflow, bulk CSV import.
2. **Exam Builder** — pick blueprint or manual, configure randomisation/sections/marking/schedule/accommodations, proctoring-mode selector (defaults to `mock`).
3. **Exam Scheduler / dashboard** — status board, who's assigned, live count.
4. **CBT Player** (student) — system check stub, fullscreen player, question palette, timer (driven by `serverDeadlineAt`), autosave indicator, submit-summary, resume.
5. **Results** — per-student objective result, exam-level item analysis.

### Integration seam
- `proctoring/ProctoringProvider.ts` interface: `init(config) | start(attemptId) | onEvent(cb) | stop() | getSessionId()`. Phase 1 ships only `MockProctoringProvider` (scripted sample events). Swapping to a vendor in Phase 3 is a provider implementation only — player/console code unchanged.
- Server-authoritative timing: deadline is a Firestore `Timestamp` set at start; client computes remaining time from it and never trusts local clock. (A scheduled Cloud Function for auto-submit is a paid Blaze concern — Phase 1 auto-submits client-side on load + flags overdue attempts for teacher review.)

### Role gating (data-driven roles)
- `exam.author` / `exam.approve` — teachers/HOD create & approve items, build exams.
- `exam.schedule` — exam coordinator/admin.
- `exam.take` — student (only own assigned paper; security rules scope `attempts/{studentId}` to the authenticated student).
- `exam.results.view` — teacher/student(self)/parent(own child).
- All writes scoped by `schoolId` in Firestore security rules; tenant isolation enforced.

### Phase 1 acceptance
A teacher builds a 20-question MCQ test from the bank, schedules it, a student takes it end-to-end (fullscreen, palette, autosave, resume after refresh, submit), tab-switches are logged, and objective results + item analysis generate automatically — all with zero external services.
