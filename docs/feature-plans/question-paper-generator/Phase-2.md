# Question Paper Generator — Phase 2 (Blueprint Intelligence, Multiple Sets, Workflow)

> Phase 2 turns the manual builder into a **smart, board-compliant, multi-set generator with governance** — still fully offline, no AI, no new libraries.

---

## A. Blueprint distribution engine + live meter

- Extend `paperBlueprints` with `bloomTargets`, `difficultyTargets`, `competencyTargetPct`, and per-chapter weightage (`chapterTargets: {chapter, pct}[]`).
- **Live coverage meter** component `BlueprintMeter.tsx` shown in the builder: for the current selection it computes achieved vs target % for Bloom, difficulty, competency, and chapter spread, with colour-coded bars and "under/over by N" hints (data already on each question's tags — pure computation).
- **Smarter auto-generate**: constrained random selection that tries to satisfy targets (greedy fill + swap to reduce deviation), honouring: no-repeat-within-paper, exclude/lock lists, "avoid same sub-topic twice", and "no question used in last N papers" (uses `lastUsedAt`/`usageCount`). "Regenerate" + "Regenerate this section only".
- **Validation gate**: builder warns before save if total marks ≠ declared, or any section count unmet.

## B. Multiple sets, shuffling, anti-cheating

- Add `PaperSet` to `questionPapers`: `{ code:'A'|'B'|…, sectionOrder, questionOrderBySection, optionOrderByQuestion, answerKey }`.
- **Generate N sets** from one approved paper: shuffle question order *within each section only* (never across sections — matches Addmen behaviour) and shuffle MCQ option order; regenerate a **per-set answer key** automatically.
- **Equivalent-swap mode** (optional per set): replace a question with another of identical subject/topic/Bloom/marks from the bank so sets differ in content, not just order.
- `PaperDoc` prints a **set code/watermark** ("Set A") in the header; batch-print all sets (reuse `HpcBatchPrintPage` stacking pattern).
- Export a **set-assignment sheet** (which set to which seat/roll) as a printable table.

## C. Internal choice & "attempt any" support

- Section model gains `choiceOf?: number` ("attempt any 5 of 7") and per-question `orWith?: questionId` to render **internal-choice "OR"** pairs (universal in CBSE/ICSE papers). `PaperDoc` renders the "OR" divider; answer key shows both.

## D. Companion documents

- **Marking scheme / rubric doc** (`MarkingSchemeDoc.tsx`): step-wise marks per question from `markingScheme`.
- **Blueprint summary sheet**: prints the achieved distribution table (for HOD/board file).
- **Invigilator copy** option (paper + key combined, watermarked "CONFIDENTIAL").

## E. Approval workflow + confidentiality (reuse HPC pattern)

- Add a `paperWorkflow.ts` mirroring `features/hpc/hpcWorkflow.ts`: `draft → submitted → approved → locked`, with `return(note)`. Approver roles = leadership / HOD via `exams.approve` (reuse `canApproveHpc`-style helper).
- **Locked** papers are immutable (snapshot already captured in `items`); only an approver can unlock.
- **Confidentiality**: papers never appear in parent/student nav (already enforced in Phase 1); add an explicit `firestore.rules` deny for non-staff and an audit entry on every view/print of an approved paper.
- A **review queue** screen (`PaperReviewPage.tsx`) for HODs (copy `HpcHub` review list).

## F. Reuse & templates

- "Save paper as template" → creates a `paperBlueprint` from the paper's structure.
- "Clone last year's paper" → duplicate + auto-reshuffle + bump academic year.
- Paper **versioning**: each regenerate stored as a version; compare/revert.

## Build order
1. Extend `paperBlueprints` + `questionPapers` types/schemas (`PaperSet`, targets, choice fields).
2. `BlueprintMeter.tsx` + selection-deviation utility (`blueprintFit.ts`).
3. Upgrade auto-generate to constrained selection + per-section regenerate.
4. Set generation + shuffling utilities (`shuffle.ts`) + per-set answer keys.
5. `paperWorkflow.ts` + `PaperReviewPage.tsx`; wire approve/return/lock buttons into builder savebar.
6. Companion doc components + batch/set printing.
7. Tighten `firestore.rules` (confidentiality, approve, lock) and add audit on view/print.

## Definition of done
- Auto-generate produces a paper within target tolerances; meter is live and accurate.
- N shuffled sets with correct per-set keys; internal "OR" choices render.
- HOD review/approve/lock workflow works with audit; papers stay staff-only.
- Marking scheme, blueprint summary, set-assignment, and invigilator docs all print.
