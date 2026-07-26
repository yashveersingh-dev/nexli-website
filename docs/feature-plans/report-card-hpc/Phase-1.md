# Report Card / NEP HPC — Phase 1 (Traditional Marks Report Card + Auto-Fill, alongside existing HPC)

> **Goal of Phase 1:** Add the **traditional marks report card** (which Nexli currently lacks) that **auto-fills from gradebook/exam marks + attendance**, computes grades/totals/rank/pass-fail, supports approval + bulk print-to-PDF — reusing the **existing HPC workflow and print pattern**. The existing NEP HPC stays as-is and is deepened in Phase 2.

---

## ⚠️ Buildable now vs blocked

**Buildable 100% now (offline, Spark tier, mock/sample data, no new dependencies):**
- Traditional report-card data model + computation (grades, totals, rank, pass/fail/compartment) — Nexli already has `letterGrade`, `PASS_PERCENT`, `resultStatusFor`, `RESULT_STATUS_META`.
- **Auto-fill from existing data**: read marks from `gradebook`/`examinations` and attendance from `attendance` (all already tenant-scoped) — no re-entry.
- A printable `ReportCardDoc` + bulk batch print via `window.print()` (the exact `HpcCardDoc`/`HpcBatchPrintPage` pattern). No PDF lib.
- Approval workflow — **reuse `features/hpc/hpcWorkflow.ts`** verbatim (draft→submitted→approved/returned, publish-on-approve).
- Parent/student view of published cards — reuse `MyHpcPage` pattern + own-record rules.
- Configurable grading scale + assessment components (stored as a settings doc) — pure data.
- Sample students/marks already exist for demo.

**Blocked / needs something extra (deferred — never fake a live service):**
- **Structured 360° self/peer/parent capture** (HPC) → no new dep, but is workflow-heavy → **Phase 2**. (HPC v1's free-text fields remain meanwhile.)
- **Stage-specific NEP templates** (Foundational/Preparatory/Middle) → **Phase 2**.
- **Bilingual cards** → self-hosted Indic font (offline, free) → **Phase 3** (shared with the other modules' fonts).
- **Portfolio/evidence attachments** → Firebase **Storage** (Spark-limited; quota-flagged) → **Phase 3**.
- **AI remark drafting / translation / early-warning** → AI key + Blaze + `ai` flag → **Phase 4**; else `AILockedOverlay`.

Everything in Phase 1 is in the "buildable now" set.

---

## Data model (Firestore, tenant-scoped; HPC collection already exists)

### `reportCards` (NEW collection) — traditional marks card, per student per term
```
schools/{schoolId}/reportCards/{cardId}
{
  schoolId, studentId, studentName, gradeName?, sectionName?, rollNo?, admissionNo?,
  academicYear, term: 'term1'|'term2'|'annual'|'trimester1'|...,
  schemeId: string,                  // -> reportCardSchemes
  subjects: {
    subjectName: string,
    components: { label:string; max:number; marks:number }[],   // PT, Notebook, HY, Annual...
    total: number, max: number, percentage: number,
    grade: string,                   // from scheme (A1.. or band)
    passMark?: number, passed: boolean,
    remark?: string,
  }[],
  coScholastic?: { area:string; grade:string }[],   // Work Ed, Art, Health&PE, Discipline
  attendance?: { present:number; total:number; pct:number },
  health?: { heightCm?:number; weightKg?:number },
  totals: { obtained:number; max:number; percentage:number; cgpa?:number },
  rank?: number, classSize?: number,
  result: 'pass'|'fail'|'compartment',
  promotedTo?: string,
  overallRemark?: string, classTeacherRemark?: string, principalRemark?: string,
  status: 'draft'|'submitted'|'approved'|'returned',  // reuse HpcApprovalStatus
  published?: boolean,
  // reuse hpcWorkflow fields: submittedByName, approvedByName, approvedAt, approvalNote
  ...TenantRecord
}
```

### `reportCardSchemes` (NEW collection) — grading & component config per board/class
```
schools/{schoolId}/reportCardSchemes/{schemeId}
{
  schoolId, name, board: 'CBSE'|'ICSE'|'State'|..., gradeIds?: string[],
  terms: { id:string; label:string }[],
  components: { id:string; label:string; max:number; weight?:number }[],  // CBSE: PT/Notebook/SubjectEnrichment/HY/Annual
  gradeBands: { grade:string; minPct:number; maxPct:number; point?:number }[],  // A1 90-100, etc.
  coScholasticAreas?: string[],
  passPercent: number, showRank?: boolean,
  ...TenantRecord
}
```
Ship 2–3 **seed schemes** (CBSE 9-point term scheme, a simple percentage scheme, a state-board variant) as bundled constants — works on day one.

**Security rules:** add `reportCards` + `reportCardSchemes` under the tenant block, gated on `gradebook` (read `gradebook.read`, write `gradebook.write`, approve via leadership — same as HPC). Parent/student read **own published** cards only (own-record rules, like HPC).

---

## Build order (Phase 1 steps)

1. **Types** — `types/reportcard.ts`: `ReportCard`, `ReportCardScheme`, enums + label maps. Reuse `ResultStatus`/`RESULT_STATUS_META` from `examinations/examSchema.ts`.
2. **DB helpers** — `lib/db.ts`: `reportCardsCol/Doc`, `reportCardSchemesCol/Doc`.
3. **Compute layer** — `features/reportcard/compute.ts`: from a scheme + a student's marks (gradebook/exam) + attendance → build the `ReportCard` (component totals, %, grade band, pass per subject, overall, rank within class). Reuse `letterGrade`/`PASS_PERCENT`/`resultStatusFor`.
4. **Data layer** — `features/reportcard/data.ts`: `useReportCards(filters)`, `useReportCard`, `useSchemes`, `createScheme`, `generateReportCards(scheme, sectionId, term)` (auto-fill batch), `updateReportCard`. Audit via `lib/audit.ts`. Reuse `useHpcCards`-style hooks.
5. **Scheme manager** — `SchemesPage.tsx` + `SchemeFormPage.tsx` (terms, components, grade bands, co-scholastic areas, pass %, show-rank). Seed schemes preloaded.
6. **Generate flow** — `GenerateReportCardsPage.tsx`: pick scheme + class/section + term → preview the auto-filled batch (rows = students, with computed totals/grade/rank) → "Create drafts". Teacher can then open any card to adjust marks/remarks.
7. **Card editor** — `ReportCardFormPage.tsx`: per-subject component marks (editable, pre-filled), co-scholastic grades, attendance (pre-filled), remarks (with a phrase bank), health. Live recompute. Reuse `react-hook-form`+zod conventions.
8. **Printable doc** — `ReportCardDoc.tsx`: board-style header (school logo/name/address from `School`), subject table with components & grades, co-scholastic, attendance, totals/rank/result, remarks, grade legend, signatory lines. Print class `rc-print`; CSS in `reportcard.css` (copy `.hpc-print`). Add term-trend mini-chart later.
9. **Batch print** — `ReportCardBatchPrintPage.tsx` (copy `HpcBatchPrintPage`: stack approved cards, `window.print()`).
10. **Workflow** — reuse `hpcWorkflow.ts` (rename-agnostic): submit/approve/return/publish buttons in the editor savebar + a review queue (copy `HpcHub` review list).
11. **Parent/student** — `MyReportCardPage.tsx` (copy `MyHpcPage`): show own **published** cards, download PDF.
12. **Hub unification** — extend/clone `HpcHub` into a **`ProgressHub`** with two tabs: **Report Cards** (traditional) and **Holistic (HPC)** — one entry point, two card types. Reuse existing HPC tiles.
13. **Routes + registration**:
   - `features/reportcard/routes.tsx` (hub, schemes, generate, cards list, :id, :id/print, batch print) + `MyReportCardRoutes`.
   - Register in `app/registerModules.ts` (`staff` `reportcard`, `parent`/`student` `MyReportCardRoutes`).
   - Nav: add `{ id:'reportcard', label:'Report Cards', icon:'file-text', path:'/report-cards', permission:'gradebook.read' }` to `STAFF_NAV`; parent/student "My Report Card". (HPC nav stays.)
   - `lib/roles/modules.ts`: a `reportcard` row (`legacy:'gradebook'`).

---

## Definition of done (Phase 1)
- A coordinator picks a scheme + class + term and **auto-generates** a full set of marks report cards from existing gradebook/exam + attendance data.
- Cards compute grades, totals, rank, and pass/fail/compartment correctly.
- Teacher edits remarks/marks; submit→approve→publish via the reused HPC workflow.
- Bulk print-to-PDF for the class; parents see only their child's published card.
- Existing NEP HPC continues to work unchanged; both live under one Progress hub.
