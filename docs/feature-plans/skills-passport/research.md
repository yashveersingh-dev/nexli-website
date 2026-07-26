# Digital Skills Passport / E-Portfolio — Research (world-best, standalone)

> Goal: build NEXLI's "achievements" surface as if it were the world's #1 standalone
> student e-portfolio + skills-passport product (think Credentialate Learner Passport
> + Open Badges backpack + a beautiful portfolio site), tailored to Indian K-12 and
> NEP 2020's holistic, multidisciplinary, skills-and-values mandate (the Holistic
> Progress Card / 360° learner profile). It aggregates a student's whole-child record
> — projects, co-curriculars, sports, arts, volunteering, leadership, internships,
> verified achievements — into one verifiable, shareable, exportable passport.

## Why a skills passport (the evidence / context)
- NEP 2020 pushes a **Holistic Progress Card** and a 360° view of the learner across
  cognitive, affective and psychomotor domains — schools need a place to *record and
  show* the non-exam achievements. A skills passport is exactly that surface.
- **Open Badges** are the global standard for portable, verifiable micro-credentials:
  each badge carries metadata (issuer, criteria, date, evidence) and is independently
  verifiable — the trust layer a passport needs.
- A **Learner Passport** aggregates academic + non-academic abilities into one
  holistic portrait, collected from many sources into a single backpack/wallet.
- Future-facing: maps onto India's **APAAR ID / ABC (Academic Bank of Credits)** so
  the school's verified records can later sync to the national locker (integration is
  ⛔ blocked on gov approval, but our data model is APAAR-shaped from day one).

Sources: see end of file.

## Pooled world-best feature list, by theme

### 1. Achievement record (the spine)
- **Typed entries**: Project, Co-curricular, Sport, Performing/Visual Art,
  Volunteering/Community Service, Leadership/Office, Competition/Olympiad,
  Internship/Work-experience, Certificate/Course, Award/Honour.
- Each entry: title, description, dates/duration, level (school/inter-school/
  district/state/national/international), role, organisation, **evidence**
  (photo/PDF/link), **skills/competencies tagged**, reflection note.
- **Self-added (student) vs school-recorded** — both, with clear provenance.

### 2. Verification & trust (the differentiator)
- **Verification workflow**: a student/parent claims → a teacher/coach/coordinator
  **verifies** → entry becomes a **verified credential** (signed by school, dated,
  by-whom). Unverified entries are clearly labelled.
- **Verified micro-credentials / badges** issued by the school against criteria
  (reuses the gamification badge engine), each with Open-Badge-style metadata.
- **Tamper-evident**: immutable verification record (verifier uid, time, hash of
  evidence) so a printed/exported passport can be trusted by colleges/employers.

### 3. Skills & competency mapping (NEP-aligned)
- Tag every achievement to a **skills taxonomy**: 21st-century skills (the 6 NEP
  C's — Collaboration, Communication, Critical Thinking, Creativity, Citizenship,
  Curiosity) + domain skills (coding, public speaking, athletics, music, etc.).
- **Skills profile / radar**: auto-aggregated strength map across all evidence —
  the holistic "portrait of a learner".

### 4. Portfolio presentation & sharing
- **Beautiful public/shareable portfolio**: a clean, printable, link-shareable
  (read-only, token-gated) page — the student's CV for college/scholarship apps.
- **Curated showcase**: student picks featured entries (a "highlight reel").
- **Multiple export formats**: PDF passport (one-pager + detailed), CV-style resume,
  and a JSON export (Open-Badges / future APAAR-shaped) for portability.

### 5. Aggregation from the whole ERP (no double entry)
- Auto-pull verified events/competitions (from `events` + `event_registrations`),
  sports/house honours, gamification badges, recognitions (Prefect/Captain), HPC
  competency data, library reading milestones — so the passport fills itself.

### 6. Lifecycle & continuity
- **Year-on-year accumulation** with class/grade context; carries across promotions.
- **Graduation export** → alumni profile (reuses the alumni module) so the passport
  follows the student out of school.

### 7. Discovery & recognition for the school
- Staff/coordinator views: who has rich vs empty passports, achievement coverage by
  class/house, talent search ("find all national-level sportspeople / coders").

## What makes it easy for users (UX principles)
- **Auto-filled first**: on first open it is already populated from events, badges,
  recognitions, HPC — the student edits/curates rather than starts blank.
- **Add an achievement in one short form** with drag-drop evidence; skill tags are
  suggested from the entry type.
- **Verification is one tap for staff** from a queue ("3 claims to verify").
- **Provenance is always visible**: green "Verified by [name], [date]" vs amber
  "Self-reported" — colleges trust it, students can't game it.
- **Share = one link or one PDF** — no account needed by the viewer.
- **Offline-first / Spark-tier**: all aggregation + PDF/JSON export run client-side;
  evidence files are the only storage concern (handled in phasing below).
- **Privacy-safe**: public link is token-gated, redacts anything the school marks
  private; student/parent control what is featured.

## Mapping to NEXLI data we already have
| Passport section | Source NEXLI data | Collection |
|---|---|---|
| Competitions / events | event registrations + events | `event_registrations`, `events` |
| Sports / house honours | houses, recognitions | `houses`, `recognitions` |
| Verified badges | gamification badges | `student_badges`, `badge_defs` |
| Leadership / office | recognitions, student tags | `recognitions`, `students.tags` |
| Competency radar | HPC + character awards | `hpc_*`, `point_awards` |
| Reading milestones | library issues | library collections |
| Student identity / class | student record | `students` |
| Graduation → alumni | alumni profile | `alumni` |

## Sources
- [Learner Passport Features — Credentialate (Edalex)](https://www.edalex.com/credentialate/learner-passport-features/)
- [Skills Ecosystem, Micro-Credentials, Digital Badges — Edalex](https://www.edalex.com/credentialate/skills-basics/)
- [Digital Badges Guide (verifiable skills & credentials) — BCdiploma](https://www.bcdiploma.com/en/blog/digital-badges-a-guide-to-understanding-using-and-benefiting-from-them)
- [Digital Badges & Micro-credentials — Digital Promise](https://digitalpromise.org/2023/04/13/the-relationship-between-digital-badges-and-micro-credentials/)
- [Microcredentials & Digital Badges — University of Arizona Registrar](https://registrar.arizona.edu/badge)
