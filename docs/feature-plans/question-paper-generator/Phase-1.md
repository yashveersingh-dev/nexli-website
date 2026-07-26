# Question Paper Generator — Phase 1 (Minimal Real Version)

> **Goal of Phase 1:** A teacher can build a real, printable, board-style question paper by picking tagged questions from a school question bank (manually or auto-filled from a simple blueprint), get an automatic answer key, and export to PDF — all **fully offline**, on the free Spark tier, with no AI and no extra libraries.

---

## ⚠️ Buildable now vs blocked

**Buildable 100% now (offline, Spark tier, mock/sample data, no new dependencies):**
- The entire question bank data model + CRUD (Firestore subcollections under `schools/{id}/…`).
- Tagging (subject, chapter, topic, Bloom, difficulty, marks, type, competency flag).
- Manual paper builder + a basic auto-fill blueprint (pure client-side selection logic).
- Paper preview, **answer key**, and **PDF export via `window.print()` + print CSS** — this is the *existing* Nexli pattern (`HpcCardDoc`, `ReceiptDoc`, `HpcBatchPrintPage`). No PDF/jsPDF library needed.
- Role gating via existing `exams` module permissions.
- Seed/sample question packs shipped as a local JSON to demo with realistic data (no live service faked).
- Maths shown as **plain text / Unicode** (e.g. `x² + 2x`, `√`, `≤`) — readable, board-acceptable for most subjects.

**Blocked / needs something extra (deferred to later phases — state plainly, never fake a live service):**
- **Crisp LaTeX maths & rendering** → needs a maths-rendering library (KaTeX/MathJax) added to `package.json`. *Not* in Phase 1; Phase 4. Until then, Unicode/plain-text maths only.
- **Editable DOCX export** → needs a docx generation library. Deferred to Phase 5 (optional).
- **AI question generation / auto-tagging / translation** → needs an AI API key (e.g. Anthropic) + the existing `ai` feature flag + a Cloud Function/proxy (Spark tier cannot call paid AI from a callable; needs Blaze for outbound). Deferred to Phase 6, gated behind the existing `ai` flag and `AILockedOverlay`.
- **Inline images/diagrams in questions** → needs Firebase **Storage** (Spark allows limited Storage, but uploads of many images may exceed free quota). Phase 1 stores image URLs as text only (paste a link); real upload UI is Phase 3, clearly flagged for quota.
- **OMR sheet scanning/marking** → needs image processing; only OMR *sheet generation* (printable) is in scope later (Phase 5). Actual scan/grade is out of scope / future.

Everything in Phase 1 below is in the "buildable now" set.

---

## Data model (Firestore, all tenant-scoped under `schools/{schoolId}/…`)

Add to `lib/db.ts` helpers (mirroring existing `tenantCol`/`tenantDoc`):

### `questionBank` (collection) — one doc per question
```
schools/{schoolId}/questionBank/{questionId}
{
  schoolId, type: 'mcq'|'mcq_multi'|'assertion_reason'|'true_false'|'fill_blank'
        |'match'|'vsa'|'sa'|'la'|'case'|'numerical'|'diagram'|'other',
  stem: string,                      // question text (plain/Unicode in P1)
  options?: { key:'A'|'B'|'C'|'D'|..; text:string }[],   // for MCQ types
  correct?: string[] ,               // option keys or answer text
  answer?: string,                   // model answer / one-word
  solution?: string,                 // worked solution (for key)
  markingScheme?: string,            // step marks notes
  imageUrls?: string[],              // pasted URLs only in P1
  // ---- tags (the differentiator) ----
  subjectId: string, subjectName?: string,
  gradeIds?: string[],               // classes this fits
  chapter?: string, topic?: string, subTopic?: string,
  loCode?: string,                   // NCERT learning-outcome code
  bloom: 'remember'|'understand'|'apply'|'analyse'|'evaluate'|'create',
  difficulty: 'easy'|'medium'|'hard',
  competency?: boolean,              // NEP competency-based vs rote
  marks: number,
  expectedTimeMins?: number,
  boards?: ('CBSE'|'ICSE'|'State'|'IB'|'Cambridge'|'NIOS')[],
  source?: string, pyqYear?: number,
  language?: 'en'|'hi'|string,
  linkedTranslationId?: string,      // pair to other-language twin (P4)
  // ---- governance ----
  status: 'draft'|'pending'|'approved'|'archived',
  usageCount?: number, lastUsedAt?: number,
  ...TenantRecord (createdAt/By, updatedAt/By)
}
```

### `questionPapers` (collection) — a generated paper
```
schools/{schoolId}/questionPapers/{paperId}
{
  schoolId, title, subjectId, subjectName, gradeId, gradeName, sectionName?,
  examName?, examId?,                // optional link to /examinations
  academicYear, totalMarks, durationMins, instructions?: string[],
  blueprintId?: string,             // if built from a blueprint
  sections: PaperSection[],         // see below
  sets?: PaperSet[],                // P2; P1 = single set
  status: 'draft'|'submitted'|'approved'|'locked',
  // approval workflow fields mirror hpcWorkflow (submittedByName, approvedByName, …)
  ...TenantRecord
}

PaperSection = {
  label: string,            // "Section A"
  instruction?: string,
  questionIds: string[],    // ordered references into questionBank
  // denormalized snapshot of each question is also stored so a paper is
  // immutable even if the bank question later changes (snapshot in P1):
  items: { questionId, stem, type, marks, options?, correct?, answer?, solution? }[]
}
```

### `paperBlueprints` (collection) — reusable pattern
```
schools/{schoolId}/paperBlueprints/{blueprintId}
{
  schoolId, name, board, gradeIds?, subjectId?, totalMarks, durationMins,
  sections: { label, instruction?, questionType, marksEach, count, choiceOf? }[],
  // optional distribution targets (used by meter in P2):
  bloomTargets?: Partial<Record<Bloom, number>>,    // % targets
  difficultyTargets?: Partial<Record<Difficulty, number>>,
  ...TenantRecord
}
```

**Security rules** (`firestore.rules`): add the three subcollections under the existing tenant block, gated on the `exams` module permissions (read = `exams.read`, write = `exams.write`, approve = `exams.approve`). Papers must **not** be readable by parent/student roles. Reuse the existing tenant-isolation helpers already in the rules file.

---

## Build order (Phase 1 steps)

1. **Types** — add `types/qpaper.ts`: `Question`, `QuestionPaper`, `PaperSection`, `PaperBlueprint`, the enums above. Export Bloom/difficulty/type label maps + option lists (mirror `analytics/meta.ts` style).
2. **DB helpers** — in `lib/db.ts` add `questionBankCol/Doc`, `questionPapersCol/Doc`, `paperBlueprintsCol/Doc`.
3. **Data layer** — `features/qpaper/data.ts`: hooks `useQuestions(schoolId, filters)`, `useQuestion`, `usePapers`, `usePaper`, `useBlueprints`, plus `createQuestion/updateQuestion`, `createPaper/updatePaper`, `createBlueprint`. Reuse `useCollection`/`useDocument`. Add audit via `lib/audit.ts`.
4. **Schemas** — `features/qpaper/questionSchema.ts` and `paperSchema.ts` (zod string-schemas, same convention as `assessmentSchema.ts`).
5. **Question bank screens**:
   - `QuestionBankPage.tsx` — filterable, searchable list (filters: subject, grade, chapter, type, Bloom, difficulty, competency, board, status). Chips + count. Bulk-select.
   - `QuestionFormPage.tsx` — single-question editor with type-specific fields (options for MCQ, answer/solution for others), all tags, live "marks" + preview.
6. **Paper builder**:
   - `PaperBuilderPage.tsx` — top: title/subject/grade/marks/duration/instructions. Body: section list; for each section, "Add questions" opens a filtered picker drawer (reuses the bank list) with a **running marks meter** vs declared total. Manual reorder (move up/down).
   - **Basic auto-fill**: a "Fill from blueprint" action — given a `paperBlueprint`, pick random `approved` questions matching each section's type+marks from the chosen subject/grade, respecting "no repeat within paper". Pure client logic; "Regenerate" reshuffles the picks.
7. **Preview + export**:
   - `PaperDoc.tsx` — printable component (board-style header from `school` name/logo, instructions, numbered sections, marks in margin, answer blanks). Class `qp-print`.
   - `AnswerKeyDoc.tsx` — auto-built key (MCQ correct keys + model answers/solutions).
   - `PaperPreviewPage.tsx` — renders `PaperDoc`, "Print / save PDF" → `window.print()`; toggle to print key. Print CSS in `qpaper.css` copying the `.fin-print` / `.hpc-print` pattern.
8. **Blueprint manager** — `BlueprintsPage.tsx` + `BlueprintFormPage.tsx` (define sections/type/marks/count). Ship 2–3 **seed blueprints** (CBSE Class X 80-mark, a 40-mark unit test, a 20-mark MCQ test) as local constants so the feature works on day one.
9. **Routes + registration**:
   - `features/qpaper/routes.tsx` (`index` = bank, `papers`, `papers/new`, `papers/:id`, `papers/:id/preview`, `blueprints`, `questions/new`, `questions/:id`).
   - Register in `app/registerModules.ts` as `staff` module `qpaper`.
   - Add nav item to `STAFF_NAV` in `app/nav.ts`: `{ id:'qpaper', label:'Question Papers', icon:'file-text', path:'/question-papers', permission:'exams.write' }`.
   - Add a `qpaper` row to `lib/roles/modules.ts` (`legacy:'exams'`) so the permission matrix shows it.
10. **Seed/sample data** — a `qpaper/sampleQuestions.ts` with ~40 realistic tagged questions across 2–3 subjects/classes (CBSE flavour) so demos and tests run without any backend writes. A dev-only "Load sample questions" button (writes to the tenant bank) for quick population.
11. **Empty/loading/permission states** — reuse `EmptyState`, `Skeleton`, lock screen (copy `HpcBatchPrintPage` guard).

---

## Definition of done (Phase 1)
- Create/edit/tag questions; bank list filters work.
- Build a paper manually **and** via "Fill from blueprint"; marks meter validates total.
- Preview renders a clean board-style paper; "Print / save PDF" produces a usable PDF; answer key prints.
- Save/load papers; clone a paper.
- Everything gated on `exams` permissions; no parent/student access to papers.
- Works with bundled sample questions, zero external services.
