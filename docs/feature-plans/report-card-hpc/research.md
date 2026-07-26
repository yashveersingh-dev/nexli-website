# Report Card / NEP Holistic Progress Card (HPC) — World-Best Feature Research

> Goal: research the **#1 standalone report-card / progress-card product** for Indian schools and pool every feature. Must cover BOTH the **traditional marks report card** (CBSE/ICSE/state) AND the **NEP 2020 Holistic Progress Card (HPC)** defined by **PARAKH / NCERT** for Foundational, Preparatory and Middle stages.
> Benchmarks studied: PARAKH/NCERT HPC framework, CBSE HPC pilots, Vawsum/Extramarks/Schoolnet HPC tools, and classic ERP report-card engines.

---

## 0. Two products in one

A best-in-class Indian report-card engine must do both, switchable per class/board:
1. **Traditional report card** — subject marks/grades, terms, totals, ranks, pass/fail/compartment, attendance, remarks, co-scholastic grades, promotion. (CBSE term/annual, ICSE, state-board formats.)
2. **NEP HPC** — competency/learning-outcome based, **360° (teacher + self + peer + parent)**, multi-domain (cognitive, affective/socio-emotional, psychomotor), narrative + portfolio, stage-appropriate templates.

> Nexli **already ships an HPC v1** (`features/hpc/*`: domains radar, scholastic/co-scholastic lines, narratives, draft→submit→approve→publish, printable `HpcCardDoc`, batch print, parent `MyHpcPage`). This research/plan **extends** that into the world-best version and adds the traditional report card alongside it.

---

## 1. NEP HPC — what PARAKH/NCERT actually prescribes

- **360-degree assessment**: combines **teacher assessment + student self-assessment + peer assessment + parent feedback** for a complete picture. *(Nexli v1 has teacher domains + selfReflection + peerFeedback text; needs structured self/peer/parent inputs.)*
- **Stage-specific cards** (different templates):
  - **Foundational** (Classes 1–2 / ages 3–8): play-based, ability summaries, "A Glimpse of Myself".
  - **Preparatory** (Classes 3–5): emerging subjects + abilities.
  - **Middle** (Classes 6–8): subject competencies + abilities; secondary stage framework emerging.
- **Multi-domain indicators**: cognitive, **socio-emotional/affective**, **physical/psychomotor**, plus **life skills, creativity, values, co-curriculars, health & fitness**.
- **Competency / learning-outcome based**, not marks — uses **descriptors/levels** (e.g. Beginner→Proficient→Advanced) mapped to NCERT learning outcomes; reduces rote emphasis.
- **Signature HPC sections** (from the NCERT card):
  - **"A Glimpse of Myself"** — self-expression (drawing/description).
  - **"All About Me"** — likes, interests, personal details.
  - **Developmental Goals Checklist** — progress across domains.
  - **Self & Peer Assessment** — reflection + classmate feedback.
  - **Parent Feedback & Portfolio** — parent inputs + samples of the child's work.
- **Ambient / observational evidence**: project/inquiry-based learning, quizzes, role-plays, group work, portfolios, anecdotal records — not just tests.
- **APAAR / ABC linkage** (NEP digital ID) where applicable.

## 2. Traditional report card — what Indian schools need

- **Assessment structure config**: terms (Term 1/2 or trimesters), components per subject (Periodic Test, Notebook, Subject Enrichment, Half-Yearly, Annual — CBSE model), weightages, max marks.
- **Grading schemes**: CBSE 9-point (A1–E), CCE grades, percentage, GPA/CGPA, ICSE marks, state-board variants — **configurable scales** with grade boundaries.
- **Computation**: per-subject totals from components, term aggregate, **overall %/CGPA**, **rank/position** (with tie handling, optional/hidden), **result status** (pass/fail/**compartment**) — Nexli already has `letterGrade`/`PASS_PERCENT`/`resultStatusFor`.
- **Co-scholastic & discipline grades** (Work Education, Art, Health & PE, Discipline) on a separate scale.
- **Attendance** (present/total, %), **height/weight** (health), **remarks** (auto-suggested + custom).
- **Promotion / detention**, "promoted to Class X".
- **Best-of-N / improvement** rules, grace marks, moderation.

## 3. The report-card "engine" features that win

- **Template/format designer** per board/class: which sections, columns, scales, header/logo, signatures, watermark.
- **Bulk generation** for a whole class/section/grade in one run → batch PDF (one per page) — Nexli HPC already batch-prints.
- **Data sourcing without re-entry**: pull marks from **gradebook/examinations**, attendance from **attendance**, fees-clearance gating optional. The card builds itself from existing data.
- **Remarks intelligence**: bank of remark phrases by performance band; teacher picks/edits; per-subject + overall.
- **Multi-term cumulative view**: Term 1 + Term 2 → annual; trend across terms/years; "progress over time" charts (Nexli has a `RadarChart`).
- **Approval & lock**: class teacher authors → coordinator/principal approves → publish to parent (Nexli HPC has this exact state machine).
- **Parent/student delivery**: published cards in the parent portal (Nexli `MyHpcPage`), download PDF, e-sign/acknowledge receipt.
- **Bilingual report cards** (Hindi/regional + English).
- **Analytics**: class performance, subject-wise toppers, weak areas, distribution graphs (feeds teaching + the certificate module's merit lists).

## 4. 360° contribution workflows (HPC differentiator)

- **Self-assessment form** for the student (age-appropriate, possibly emoji/visual scales for foundational).
- **Peer-assessment** (structured, anonymised aggregation).
- **Parent-feedback form** (portal) — observations at home, screen time, reading habit, parent's note.
- **Multi-teacher input**: each subject teacher contributes their domain/subject lines; class teacher consolidates (workflow + permissions).
- **Portfolio/evidence attachments**: photos of work, project files, activity logs (Storage).
- **Observation log / anecdotal records** captured through the term, auto-surfaced into the card.

## 5. UX niceties that delight

- **Auto-fill from data** (marks/attendance) so teachers verify, not type.
- **Live preview** that looks exactly like the print.
- **Remark suggestions** + spell-check + character counters (Nexli HPC has counters).
- **Radar/spider chart** for domains + **trend lines** across terms (Nexli has `RadarChart`).
- **Batch workflow board**: see at a glance which students' cards are draft/submitted/approved (Nexli `HpcHub`).
- **Descriptor legend** printed on the card (what "Proficient" means).
- **One-click clone** of last term's structure.
- **Offline-friendly print-to-PDF**; no special hardware.

## 6. Governance & compliance
- Role-gated authoring/approval; **published only after approval** (parent sees nothing premature) — Nexli enforces this.
- **Audit trail** on submit/approve/return/publish.
- **Data sensitivity**: health/needs data restricted; parent sees only own child (own-record rules already in Nexli).
- **Retention & re-issue**; immutable once published (snapshot).
- **Board compliance**: correct CBSE/ICSE wording, grade legends, signatory lines.

## 7. AI / smart (advanced)
- **AI remark drafting** from the student's marks/domains/attendance → personalised, bilingual, constructive narrative (teacher reviews) — fits Nexli's `insights`/`ai` flag.
- **AI strengths/areas-to-improve** synthesis across 360° inputs.
- **AI translation** of the whole card.
- **Early-warning insights**: declining trend, attendance risk → nudge before report time.

---

## What makes each part *easy & delightful*

| Feature | Why it delights |
|---|---|
| Auto-fill marks/attendance from existing modules | Teachers verify, never re-type — biggest time saver. |
| Stage-correct NEP templates | Foundational vs Middle look right out-of-the-box. |
| 360° forms (self/peer/parent) | The card is genuinely holistic, not teacher-only. |
| Remark phrase bank | Constructive remarks in seconds. |
| Radar + term-trend charts | Parents instantly grasp progress. |
| Batch generate + workflow board | A whole class's cards managed on one screen. |
| Approve → auto-publish to parent portal | No printing/handing-out; parents self-download. |
| Bilingual cards | Matches real Indian report cards. |
| Print-to-PDF, offline | Works free, day one. |

---

## Mapping to existing Nexli building blocks (this module EXTENDS, not greenfield)

| Need | Existing Nexli piece |
|---|---|
| **HPC v1 (extend it)** | `features/hpc/*`: `HpcHub`, `HpcFormPage`, `HpcCardDoc`, `HpcCardView`, `HpcBatchPrintPage`, `MyHpcPage`, `hpcSchema.ts`, `hpcWorkflow.ts`, `hpcBulk.ts` |
| HPC data type | `types/special.ts` `HpcCard`, `HpcDomainRating`, `HpcSubjectLine`, `HpcApprovalStatus`, `HpcTerm` |
| NEP domains + descriptors | `features/analytics/meta.ts` `HPC_DOMAINS`, `HPC_RATING_DESCRIPTORS`, `HPC_TERM_OPTIONS`; `useHpcCards` in `analytics/data` |
| Approval state machine | `features/hpc/hpcWorkflow.ts` (draft→submitted→approved/returned, `HPC_APPROVER_ROLES`, `canApproveHpc`) |
| Radar chart | `features/analytics/RadarChart.tsx` |
| Marks source | `features/gradebook` (assessments/marks), `features/examinations` (results, `letterGrade`, `resultStatusFor`, `RESULT_STATUS_META`) |
| Attendance source | `features/attendance` |
| Students/grades/sections | `types/sis.ts`, students list |
| Print → PDF | `HpcCardDoc` + `.hpc-print` + `window.print()`; `HpcBatchPrintPage` |
| Parent/student view | `MyHpcPage`, parent/student portals + own-record rules |
| Role gating | HPC nav uses `gradebook.read`; `lib/roles/modules.ts` `hpc` (legacy `gradebook`) |
| Audit | `lib/audit.ts` |
| Charts for trends | `lib/legacy-charts.reference.js` / analytics components |

**Notable gaps to fill:** no **traditional marks report card** doc/engine yet (only HPC); no **structured self/peer/parent** capture (only free-text); no **assessment-structure config** (components/weightages); no **stage-specific templates**; no **bilingual** card; no **portfolio attachments**; no **AI remarks**. The phases below build these on top of the existing HPC.

---

## Sources

- [PARAKH / NCERT — Holistic Progress Card (official)](https://parakh.ncert.gov.in/hpc)
- [CBSE Academic — Holistic Progress Card](https://cbseacademic.nic.in/hpc.html)
- [Extramarks — What is the Holistic Progress Card by NCERT?](https://www.extramarks.com/blogs/schools/holistic-progress-card/)
- [Vawsum — HPC NEP 2020 | 360° Student Assessment](https://vawsum.com/holistic-progress-card-nep2020-360-student-assessment/)
- [Schoolnet India — Holistic Progress Cards](https://www.schoolnetindia.com/blog/holistic-progress-cards-redefining-student-assessments/)
- [Business Standard — How NCERT is planning to change student assessment](https://www.business-standard.com/education/news/holistic-progress-card-how-ncert-is-planning-to-change-student-assessment-124030600552_1.html)
- [Drishti IAS — Holistic Progress Card](https://www.drishtiias.com/daily-updates/daily-news-analysis/holistic-progress-card)
- [Wikipedia — National Education Policy 2020](https://en.wikipedia.org/wiki/National_Education_Policy_2020)
