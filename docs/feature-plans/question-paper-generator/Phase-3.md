# Question Paper Generator — Phase 3 (Bank Scale, Import, Images, PYQ, Item Analysis)

> Phase 3 makes the **bank itself world-class**: fast bulk authoring, imports, images/diagrams, a PYQ library, and the closed-loop item analysis that feeds difficulty tags back from real results. Mostly offline; image upload is the one piece that touches Firebase Storage quota (flagged).

---

## A. Bulk import & authoring at scale

- **CSV/Excel import** of questions with a column→field mapper (reuse the pattern in `features/students/import/`), validation preview, and dry-run before commit.
- **GIFT / Aiken / Moodle-XML import** for MCQ banks (popular formats teachers already have).
- **Paste-from-Word** flow: paste rich text → split into questions heuristically → teacher confirms tags. (Pure client parsing; images handled in section B.)
- **Duplicate detection** on import (normalised stem hash) with merge/skip choices.
- **Bulk tag editor**: select N questions → set chapter/Bloom/difficulty/board in one action.
- **Moderation queue**: imported/teacher-authored questions land as `pending`; HOD bulk-approves into the shared `approved` bank.

## B. Images & diagrams (Firebase Storage — quota-flagged)

- **Image upload** for question stems/options/solutions via Firebase Storage under `schools/{id}/qbank/{questionId}/…`.
- ⚠️ **Quota note:** Spark tier gives limited Storage (a few GB + daily download caps). For a small school this is fine; heavy diagram banks may need Blaze. Phase 1's "paste image URL" stays as the zero-cost fallback. The UI shows current usage and warns near limits (reuse `lib/usage.ts`).
- Image sizing/caption fields; figures render in `PaperDoc` at print-quality (CSS print sizing).
- Diagram/label question type editor (image + answer labels).

## C. PYQ & sample-paper library (Indian USP)

- A `pyqPacks` concept: questions tagged `source:'PYQ'` + `pyqYear` + board, browsable as a "Previous Years" view; one click to "add all PYQs for Chapter X" into a paper.
- Ship a **starter sample-paper/blueprint pack** per board (CBSE/ICSE/state) as seed blueprints + a curated sample-question JSON (no copyrighted text — original/representative items).
- "Generate a board-pattern mock" = blueprint + PYQ-weighted selection.

## D. Item analysis loop (closes the assessment circle)

- After an exam is marked (Nexli **gradebook**/Examinations results), compute per-question stats where marks were captured per question: **% correct, average marks, discrimination**.
- Store on the question (`stats: { attempts, pctCorrect, avgMarks, lastComputedAt }`).
- **Auto-suggest difficulty re-tag** ("87% got this right → looks Easy, tagged Hard?").
- A **"Most-missed questions"** report per exam → feeds remediation/homework.
- Surface a **freshness/over-use dashboard** (most-used questions this term).

## E. Bank quality & collaboration

- Per-question **comments/flags** ("answer wrong", "ambiguous") with a resolve loop.
- **Question versioning** + change history (audit).
- **Cross-subject / integrated** question support (multiple subjectIds).
- Teacher **favourites / personal collections** for quick reuse.

## Build order
1. CSV/Excel + GIFT/Aiken importers with mapper + dry-run + dedupe.
2. Bulk tag editor + moderation queue screens.
3. Storage upload (behind a `usage`/quota guard) + figure rendering; keep URL fallback.
4. PYQ view + seed packs per board.
5. Item-analysis computation from gradebook results + re-tag suggestions + most-missed report.
6. Comments/flags + versioning.

## Dependencies / flags
- **Firebase Storage** (Spark-limited; warn on quota) — only for uploaded images; URL paste stays free.
- Item analysis needs **per-question marks** to exist in gradebook; if only total marks are stored, show "enable per-question marks to unlock item analysis" rather than faking data.

## Definition of done
- Import 100s of questions from a spreadsheet/GIFT in minutes with dedupe.
- Upload diagrams (within quota) or use URLs; figures print cleanly.
- PYQ library browsable; one-click chapter PYQ insert.
- Item analysis populates question stats and suggests re-tags after a real marked exam.
