# Secure Online Exam + AI Proctoring + Onscreen Evaluation — Research

> Pooled "world-best" feature set for a computer-based testing (CBT) + remote proctoring + onscreen marking product, tailored to Indian K-12 / higher-secondary schools (CBSE/ICSE/State boards). Benchmarks: Mettl/Mercer, Talview, ProctorU/Meazure, Proctorio, Honorlock, Safe Exam Browser (SEB), TAO, Inspera, Conduct Exam, Eklavvya, and CBSE/board onscreen-evaluation (OSE) vendors.

## 1. Exam authoring & question bank
- Central question bank with rich item types: MCQ (single/multi), true/false, fill-in-the-blank, match-the-following, numeric/integer (with tolerance), short answer, long answer/essay, comprehension/passage with child questions, image-based, diagram labelling, audio/video stimulus.
- Per-question metadata: subject, chapter/topic, Bloom's taxonomy level, difficulty (easy/medium/hard), marks, negative marks, expected time, board/grade tagging, learning outcome code.
- Reusable item authoring with LaTeX/MathML for maths & science, chemistry equation editor, code snippets with syntax highlight.
- Question versioning, peer-review/approval workflow, plagiarism/duplicate detection within bank.
- Section blueprint: weightage by topic & difficulty; auto-assemble a paper to match a blueprint.
- Bulk import via CSV/Word/QTI; export to QTI 3.0 for interoperability.

## 2. Exam/test paper configuration
- Test types: practice (no proctoring), class test, unit test, pre-board, board-pattern mock, competitive (JEE/NEET pattern), adaptive.
- Randomisation: shuffle questions, shuffle options, draw N from a pool, per-student unique paper (anti-collusion).
- Sectioning with section-level timers, lock-after-submit, optional/compulsory questions, choice (attempt any 5 of 7).
- Marking schemes: positive/negative marking, partial credit for multi-select, step marking for subjective, no-negative practice mode.
- Scheduling: fixed window vs flexible window; per-class, per-section, per-student overrides; time-zone aware (mostly IST).
- Accommodations: extra time, larger font, screen reader compatibility, separate room/flag for CWSN (Children With Special Needs) per RPwD Act.
- Calculator/periodic-table/formula-sheet toggles; rough-work scratchpad; on-screen scientific calculator.

## 3. Candidate exam-taking experience (CBT player)
- Pre-exam system check: camera, mic, network speed, browser compatibility, fullscreen capability.
- Clean distraction-free player: question palette (answered / not answered / marked-for-review / not-visited), countdown timer, auto-save every few seconds, offline-resilient answer caching with resync.
- Navigation rules: free navigation vs linear (one-way) vs section-locked.
- Auto-submit on timeout; manual submit with confirmation summary.
- Resume after disconnect (server keeps authoritative timer; clock continues server-side).
- Accessibility: keyboard navigation, high contrast, font scaling, multilingual UI (English/Hindi + regional).

## 4. Lockdown & environment hardening
- Lockdown browser / kiosk mode: block tab switching, copy-paste, print, screenshots, right-click, multiple monitors, virtual machines, screen-sharing apps.
- Safe Exam Browser (SEB) config integration for high-stakes desktop exams.
- Browser-level (no install) "soft lockdown": fullscreen enforcement, tab/visibility change detection, focus-loss counting, copy/paste suppression — degrades gracefully where OS APIs are unavailable.
- Detect & warn on second display, dev tools open, picture-in-picture.

## 5. AI proctoring (the differentiator)
- Modes: **Live** (human proctor watches feeds in real time), **Record-and-review** (auto-recorded, AI flags, human reviews later), **AI-auto** (fully automated flagging, no human). Schools usually start record-and-review.
- Identity verification: photo capture + ID card capture; optional face match against stored student photo.
- Continuous webcam analysis: face presence (no face / multiple faces), gaze/head-pose estimation (looking away), mouth movement / talking, object detection (phone, book, earphones, second person).
- Audio analysis: ambient noise level, voice/speech detection, multiple-voice detection.
- Screen analysis: tab/app switch events, full-screen exits, prohibited-process detection (desktop agent only).
- Risk scoring: weighted aggregate of events into a per-candidate "integrity score" with a timeline of flagged moments (thumbnail + timestamp + reason), so a human reviews only flagged segments.
- Privacy-first design: explicit consent screen, local-on-device inference where possible, data-retention policy, DPDP Act 2023 compliance, parental consent for minors, configurable storage region.

## 6. Live invigilation console
- Grid of live candidate tiles, sort by risk, drill into one feed, two-way chat, broadcast announcements, force-pause / extend-time / terminate.
- Real-time alert stream; raise-hand from candidates; reassign candidates between proctors.

## 7. Onscreen evaluation (OSE) / digital marking
- Scanned-answer-sheet ingestion (for pen-paper exams) + native digital subjective answers.
- Examiner marking workspace: annotate PDF/image (tick, cross, comment stamps, marks-per-question entry), rubric-based scoring, per-step marking.
- Double / blind evaluation, third-evaluator on discrepancy, moderation, scaling/normalisation.
- Examiner allocation (anonymised, by subject/expertise), workload balancing, deadlines, productivity dashboard.
- Re-evaluation / rechecking workflow, marks reconciliation, locking, audit trail of every mark change.
- AI assist: auto-grade objective instantly; AI-suggested score + rationale for subjective (essay scoring, keyword/rubric match) with examiner override (human-in-the-loop, never auto-final).

## 8. Results, analytics & integrity reporting
- Auto result generation for objective; combined for mixed papers after OSE.
- Per-student report card, percentile/rank, topic-wise strength/weakness, time-per-question analytics.
- Item analysis: difficulty index, discrimination index, distractor analysis to improve the bank.
- Integrity report per exam: flagged candidates, evidence timeline, reviewer decision (clean / minor / violation), exportable.
- Cohort analytics for teachers/principal; board-pattern readiness reports.

## 9. UX principles
- Mobile-aware but exam-taking best on laptop/desktop; low-bandwidth mode (reduce video quality, fallback to periodic snapshots instead of continuous stream).
- "No surprise" candidate experience: practice/mock that mirrors real proctoring so students aren't startled.
- Teacher creates an exam in <10 minutes from existing bank; one screen to monitor; one screen to evaluate.
- Strong empty-states, autosave reassurance ("Saved"), and clear connectivity indicators.

## 10. India-specific notes
- DPDP Act 2023: biometric/face data of minors = sensitive; need verifiable parental consent + minimal retention.
- Board alignment: CBSE/ICSE/State exam patterns, grading bands, competency-based questions (NEP 2020), regional-language papers.
- Connectivity reality: intermittent rural internet → server-authoritative timer, aggressive autosave, snapshot fallback, resumable sessions are mandatory, not optional.
- Free Firebase Spark tier: video streaming/storage is the cost driver — design so heavy proctoring media goes to the external proctoring SDK's own storage, not Firestore/Firebase Storage.

## Sources
- [AI Based Remote Proctoring Guide — PMaps](https://www.pmapstest.com/blog/ai-based-remote-proctoring)
- [Best 5 AI Proctoring Software — Think Exam](https://thinkexam.com/blog/best-5-ai-proctoring-software-for-secure-online-exams-in-2025/)
- [AI-assisted Gaze Detection for Proctoring (arXiv 2409.16923)](https://arxiv.org/abs/2409.16923)
- [Secure Online Proctoring in the Age of AI-Assisted Cheating — Proctortrack](https://proctortrack.com/online-proctoring-ai-assisted-cheating/)
- [proctoring-ai-react (GitHub)](https://github.com/kanchan-kumar/proctoring-ai-react)
