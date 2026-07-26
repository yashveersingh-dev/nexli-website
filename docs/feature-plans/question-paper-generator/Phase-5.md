# Question Paper Generator — Phase 5 (OMR, DOCX Export, Online Test & Delivery)

> Phase 5 extends *output and delivery*: OMR sheets for MCQ exams, editable DOCX export, online/practice-test delivery to students, and the exam-day linkage to Nexli Examinations.

---

## A. OMR answer-sheet generation

- For MCQ papers, generate a **printable OMR bubble sheet** (`OmrSheetDoc.tsx`): roll-no/name grid, set code, N question bubbles A–D, alignment markers/fiducials in corners.
- Per-set bubble sheet matched to per-set answer key (from Phase 2).
- ⚠️ **Scope note:** Phase 5 produces *printable* OMR sheets only. **OMR scanning/auto-grading is out of scope** (needs image-processing infra) — clearly stated, not faked. Marks still entered via gradebook, or a future integration.

## B. Editable DOCX export (new optional dependency)

- Add a **docx** generation library (e.g. `docx`) — front-end, offline, free; ⚠️ new dependency, but no API key/paid plan.
- Export paper + key + marking scheme as `.docx` so teachers can do final hand-edits (a top-requested feature). Maths exported as images or OMML where feasible.
- PDF (print) remains the default; DOCX is an extra button.

## C. Online / practice test delivery

- A paper can be **published as a practice test** to students (links into the existing `student`/`parent` audiences and `homework` patterns):
  - `practiceAttempts` subcollection: `schools/{id}/practiceAttempts/{attemptId}` (paperId, studentId, answers, autoScore for objective types, timeSpent).
  - Student takes objective questions online → **auto-graded MCQ/numerical**; subjective shown with model answers after submit (self-study mode).
  - Timer, one-question-per-screen option, instant feedback toggle.
- **Board-style exam papers stay confidential** (staff-only); only papers explicitly flagged `practice` are student-visible. Reuse Phase-2 confidentiality rules.

## D. Exam-day linkage (Examinations module)

- Attach an approved paper to an **Exam term + subject datesheet** entry (`features/examinations`): the datesheet shows "paper ready ✓"; admit-card/invigilation flows can reference it.
- Optional **timed release**: paper PDF unlocks to invigilators at exam start time.
- Marks captured per question (where used) flow to **gradebook** → enabling Phase-3 item analysis.

## Build order
1. `OmrSheetDoc` + per-set matching + print alignment.
2. Add `docx` lib; build DOCX exporter for paper/key/scheme.
3. Practice-test publish + `practiceAttempts` model + student attempt UI + MCQ auto-grade.
4. Link papers to Examinations datesheet; optional timed release; marks→gradebook hook.

## Dependencies / flags
- **`docx` library** — new front-end dep, offline, free.
- OMR **scanning** is explicitly **not** built (infra-heavy); only sheet *generation*.
- Online-test auto-grade covers **objective** types only; subjective remains manual.

## Definition of done
- Printable OMR sheets per set, aligned and matched to keys.
- DOCX export of paper + companions opens cleanly in Word.
- A practice test can be assigned to students, auto-grades objective questions, and stays separate from confidential board papers.
- Approved papers link to the Examinations datesheet.
