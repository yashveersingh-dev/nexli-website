# Question Paper Generator — World-Best Feature Research

> Goal: research the **#1 standalone question-paper product** for Indian schools, then pool every feature so Nexli's phased plan can cherry-pick. Tailored to CBSE / ICSE / state boards, NEP 2020 competency-based assessment, NCERT/PARAKH, and regional languages.
> Benchmarks studied: myCBSEguide Exam Paper Creator, QB365, Addmen Question Paper Generator (shuffling/OMR), SchoolDeck AI Question Paper, Eklavvya, Edupedia/Teachmint paper makers.

---

## 1. The Question Bank (the foundation)

A paper generator is only as good as the bank it draws from. World-best banks:

- **Rich question model** — stem, options, answer, solution/marking scheme, hints, source, year asked.
- **Question types**: MCQ (single), MCQ (multiple correct), assertion–reason, true/false, fill-in-the-blank, match-the-following, one-word/very-short (VSA), short answer (SA), long answer (LA), case/passage-based (a *parent* passage with multiple child sub-questions), numerical/integer, diagram-label, map-work, drawing, comprehension, "competency-based" / HOTS, integrated (cross-topic).
- **Deep tagging (the differentiator)** — every question tagged by: subject → chapter/unit → topic → sub-topic/learning-outcome (NCERT LO codes), **Bloom's level** (Remember/Understand/Apply/Analyse/Evaluate/Create), **difficulty** (Easy/Medium/Hard, or 1–5), **competency vs rote** flag (NEP), marks, expected time, board(s), grade(s), and source (textbook page, PYQ year, self-authored).
- **Rich content**: inline images/diagrams, **LaTeX/MathML maths**, chemistry/physics notation, tables, audio (for languages), multi-part questions.
- **Multilingual question pairs**: the same question authored/stored in English + Hindi + regional language, linked so a bilingual paper can print both.
- **Reuse intelligence**: "last used in" tracking so a teacher avoids repeating the same question across recent papers; usage count; "freshness" score.
- **Authoring UX**: fast single-question editor, **bulk import** (CSV/Excel/Word/GIFT/Aiken/Moodle XML), paste-from-Word with auto image extraction, duplicate detection, an approval/moderation queue (HOD reviews before a question enters the shared bank).
- **PYQ library**: previous-years' board questions tagged by year and marks (huge selling point in India).

## 2. Blueprint / Paper Pattern Engine

The core IP. World-best generators **enforce a blueprint** so the paper is balanced and board-compliant:

- **Reusable blueprint templates** — e.g. "CBSE Class X Science SA-1 (80 marks)", "CBSE 2025-26 competency blueprint" (≈50% competency-based, 20% MCQ, 30% constructed-response), state-board patterns, ICSE patterns, school-internal patterns.
- **Section builder**: Section A/B/C/D…, each with instructions, a question-type, marks-per-question, count, choices ("attempt any 5 of 7"), and internal-choice "OR" questions.
- **Distribution targets**: by chapter weightage, by Bloom level %, by difficulty %, by competency vs knowledge %. The engine reports the *achieved* vs *target* mix live and flags gaps ("Analyse questions under target by 2").
- **Marks/time math**: auto-totals marks, validates against the declared total, estimates writing time, warns on overflow.
- **Two build modes**: (a) **Auto-generate** — engine picks questions that satisfy the blueprint at random (with constraints), regenerate until happy; (b) **Manual pick** — teacher hand-selects from filtered bank with a running blueprint meter; (c) **Hybrid** — auto-fill then tweak.
- **Constraints**: no repeats from last N papers, avoid two questions from the same sub-topic, lock specific must-include questions, exclude a chapter, balance across chapters.

## 3. Multiple Sets, Shuffling & Anti-Cheating

- **N parallel sets (Set A/B/C…)** from one blueprint — same difficulty/coverage, different/ reordered questions.
- **Shuffle questions within a section** (never across sections) and **shuffle MCQ options**, regenerating a per-set answer key automatically.
- **Equivalent-difficulty swap**: replace a question with another of the same topic/Bloom/marks to vary sets without unfairness.
- **Seat-plan / set assignment** export and watermark/"Set A" stamping.
- **Per-set answer keys + marking schemes** kept in lockstep.

## 4. Output, Layout & Print Quality

This is where Indian teachers judge a product. World-best output:

- **Polished, board-style header**: school name + logo, exam name, class/section, subject, max marks, time allowed, date, general instructions block, roll-no/name blanks, set code.
- **Professional typography**: proper question numbering (1, 1(a), 1(b)(i)), sub-question indentation, marks shown in right margin `[2]`, section dividers, page numbers, "Page X of Y", continued-on-next-page handling.
- **Maths/diagrams render crisply** (LaTeX), figures sized & captioned, ample answer space for SA/LA, **OMR bubble sheet** generation for MCQ exams.
- **Multiple export targets**: print-ready PDF, editable DOCX (teachers love editing), Google Forms / online-test export.
- **Branding / white-label**: school colours, watermark, footer ("Prepared by …", "Generated on …").
- **Companion documents**, all from one click: **Answer key**, **detailed solutions**, **marking scheme/rubric**, **blueprint summary sheet**, **invigilator copy**.
- **Layout options**: single/two-column, font size, paper size (A4/Legal), margins, language script, "leave space for working".

## 5. AI / Smart Capabilities (advanced tier)

- **AI question generation** from a topic / textbook chapter / pasted passage → drafts MCQs, case-studies, HOTS, with answers — teacher reviews before saving (human-in-the-loop).
- **AI difficulty & Bloom auto-tagging** of imported/legacy questions.
- **AI distractor generation** for MCQs; **AI variants** (numbers/context changed) of an existing numerical question.
- **AI translation** to Hindi/regional languages with a review step.
- **"Generate a balanced paper in 3 minutes"** from just class+subject+chapters+marks, then refine.
- **Plagiarism/over-use guard**: warns if too many questions came from one source or were recently used.
- **Predicted difficulty / discrimination** once results exist (item analysis loop).

## 6. Workflow, Collaboration & Governance

- **Draft → review (HOD) → approve → lock → publish** with audit trail (mirrors Nexli's HPC approval pattern).
- **Confidentiality controls**: papers are sensitive — restricted visibility, watermarking, no parent/student access until exam day, optional time-locked release.
- **Collaboration**: co-authoring, comments on questions, "request change" loop.
- **Versioning**: every regenerate is a version; revert; compare.
- **Reuse library**: save a finished paper as a template; clone last year's and reshuffle.

## 7. Assessment Loop (closes the circle)

- **Tie to the exam**: a generated paper links to an Exam term + subject datesheet entry (Nexli already has Examinations).
- **OMR / online marking** → marks flow back to the **gradebook**; **item analysis** (which questions most students missed) feeds back into difficulty tags and remediation.
- **Student/parent delivery**: practice papers can be assigned; board-style papers stay staff-only.

## 8. Indian-context specifics that delight

- **Board presets** out-of-the-box: CBSE (incl. 2025-26 competency pattern), ICSE/ISC, major state boards, NIOS; correct grade nomenclature (Class I–XII).
- **NEP/NCERT alignment**: learning-outcome tagging, competency-based question share targets, art-integrated/experiential question types.
- **Regional languages & bilingual papers** (Hindi + English side-by-side is standard in many schools).
- **PYQ + sample-paper packs** per board.
- **Low-friction for non-technical teachers**: templates, big "auto-generate" button, instant preview, one-click PDF — works on modest hardware and patchy internet (offline-friendly).
- **Cost-sensitive**: must work without paid cloud/AI for the everyday case; AI is a premium add-on.

---

## What makes each part *easy & delightful* for users

| Feature | Why it delights |
|---|---|
| Auto-generate from blueprint | Teacher gets a balanced paper in seconds, not hours. |
| Live blueprint meter (target vs achieved) | Removes guesswork; paper is provably balanced/board-compliant. |
| One-click answer key + marking scheme | The dreaded second document is free. |
| Save paper/blueprint as template | Next term/next year is a 2-minute clone. |
| Multiple shuffled sets + per-set keys | Exam-hall anti-cheating with zero extra effort. |
| Editable DOCX export | Teachers keep their habit of final hand-tweaks. |
| Bilingual/regional output | Serves the real classroom, not just English-medium. |
| HOD review queue | Quality control without email ping-pong. |
| Reuse/freshness tracking | Stops the same questions appearing every term. |
| Works offline with the school's own bank | No API key needed for the core job. |

---

## Mapping to existing Nexli building blocks (reuse, don't rebuild)

| Need | Existing Nexli piece to reuse |
|---|---|
| Tenant data + live hooks | `lib/db.ts` (`tenantCol`, `tenantDoc`, `useCollection`, `useDocument`) |
| Role gating | `lib/rbac.ts` (`hasPermission`), `useCan`, nav `permission`; module key `exams` (legacy prefix `exams`) |
| Subjects / grades / sections | `types/academics.ts` `Subject`, school grade/section model already used by gradebook & exams |
| Exam terms / datesheet | `features/examinations/*` (`Exam`, datesheet, results) — link a paper to an exam+subject |
| Letter grades / pass logic | `examinations/examSchema.ts` (`letterGrade`, `PASS_PERCENT`) |
| Printable doc → PDF | **No PDF lib exists.** Pattern is a React "Doc" component + print CSS + `window.print()` (see `HpcCardDoc`, `ReceiptDoc`, `PayslipDoc`, `HpcBatchPrintPage`). Reuse this exactly. |
| Approval workflow | `features/hpc/hpcWorkflow.ts` state machine (draft→submitted→approved/returned) is the template for paper review. |
| Bulk print | `HpcBatchPrintPage` (stack pages, `window.print()`). |
| Forms | `react-hook-form` + `zod` string-schemas (see `assessmentSchema.ts`, `hpcSchema.ts` conventions). |
| Module registration | `app/registerModules.ts`, `app/nav.ts`, `lib/roles/modules.ts`. |

**Notable gap:** there is **no question bank** in Nexli today and **no LaTeX/PDF library**. The bank is the first thing this module must build; LaTeX and AI are explicitly later-phase, optional dependencies (see Phase-1 "Buildable now vs blocked").

---

## Sources

- [myCBSEguide — Exam Paper Creator for CBSE Schools](https://mycbseguide.com/blog/exam-paper-creator-for-cbse-schools/)
- [myCBSEguide — CBSE Test Generator](https://mycbseguide.com/cbse-test-generator.html)
- [QB365 — Online Question Paper Generator for CBSE](https://www.qb365.in/for-cbse)
- [SchoolDeck — AI Question Paper Generator (CBSE/JEE/NEET/UPSC)](https://databus.co/schooldeck/features/ai-question-paper/)
- [Eklavvya — AI Question Paper Generator (2026 Guide)](https://www.eklavvya.com/blog/ai-question-paper-generator/)
- [Addmen — Question Paper Generation Software (multiple sets & shuffling)](https://www.addmengroup.com/question-bank/question-paper-generation-software.htm)
- [Addmen — Question Paper Shuffling Software](https://www.admengroup.com/qpg-question-paper-shuffling-software.htm)
- [Addmen — MCQ Test / OMR Software](https://www.admengroup.com/mcq-test-software.htm)
