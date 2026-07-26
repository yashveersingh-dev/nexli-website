# Career Counselling & Aptitude Engine — Research (world-best, standalone)

> Goal: build NEXLI's career engine as if it were the world's #1 standalone career
> assessment + guidance product for Indian schools (think Mindler / CareerGuide /
> iDreamCareer / Respicite, plus CBSE-NCERT's official **Tamanna** aptitude test),
> tailored to NEP 2020 (career guidance from school, multidisciplinary streams) and
> the Indian post-Class-10 stream decision (Science / Commerce / Arts-Humanities /
> Vocational). It **complements the existing counselling module** (which records
> confidential sessions, including a `career` type) by adding the *assessment,
> scoring, recommendation, and college/scholarship-matching* layer.

## Why this module (the evidence / context)
- **NEP 2020** mandates career guidance starting in school; CBSE & NCERT launched
  the **Tamanna** aptitude test for Classes 9–10 to help students choose subjects/
  streams scientifically. A school ERP that does this in-house is highly valuable.
- **Holland's RIASEC** model is the global "gold standard" for career *interest*
  assessment (used by the US Dept. of Labor); matching career to Holland type
  correlates with higher satisfaction and performance.
- Best Indian products combine **multiple lenses**: RIASEC interests + **aptitude**
  (numerical, verbal, logical, spatial, mechanical) + **multiple intelligences** +
  **personality** (MBTI-style) + **learning style (VAK)** + **EQ**, then map to a
  stream and a shortlist of careers.
- The **scoring + recommendation logic is deterministic and fully offline-buildable**.
  Only *AI-generated narrative guidance* (a personalised essay) would need an AI key.

Sources: see end of file.

## Pooled world-best feature list, by theme

### 1. Assessment battery (multi-lens, age-appropriate)
- **Interest — RIASEC** (Realistic, Investigative, Artistic, Social, Enterprising,
  Conventional): forced-choice / Likert items → 3-letter Holland code.
- **Aptitude**: numerical, verbal, logical/abstract, spatial, mechanical/clerical —
  timed mini-tests → percentile/band per aptitude.
- **Multiple Intelligences** (Gardner): linguistic, logical-math, spatial, musical,
  bodily-kinaesthetic, interpersonal, intrapersonal, naturalistic.
- **Personality** (lightweight Big-Five / MBTI-style 4-axis) — interest-fit colouring.
- **Learning style (VAK)** + **EQ** quick scales.
- **Item bank** of validated, India-localised questions; class-band variants
  (Class 8–9 explorer vs Class 10 decision vs Class 11–12 refinement).

### 2. Scoring engine (deterministic, explainable)
- Per-construct scoring (sum/weighted, reverse-keyed items handled), normed to bands
  (Low/Average/High or percentiles) — **all pure functions, no AI**.
- **Stream recommendation matrix**: combine RIASEC code + aptitude profile + interests
  → weighted fit score for Science (PCM/PCB), Commerce (with/without Maths),
  Humanities/Arts, and Vocational tracks. Transparent rule weights, e.g.
  Logical+Numerical→Science, Verbal+EQ→Humanities, Analytical+Commercial→Commerce.
- **Career fit list**: rank careers from a career library by match to the profile
  (RIASEC + aptitude + intelligences), each with a fit %.
- **Confidence/consistency flags** (e.g. inconsistent answers, low effort, ties).

### 3. Recommendations & report
- **Stream recommendation** with top-2 alternatives and the *why* (which scores drove
  it) — explainable, defensible to parents.
- **Top careers** with descriptions, required subjects, typical education path,
  India salary band, growth outlook (from a static career library).
- **Subject combination suggestions** (e.g. PCM + CS, Commerce + Maths + Economics).
- **Skills-to-build** tied to NEP competencies and the Skills Passport.
- **Printable report** (the deliverable parents expect from paid assessments).

### 4. Career & college library
- **Career library**: title, cluster, RIASEC tags, required aptitudes, subjects,
  education pathway, entrance exams (JEE/NEET/CLAT/CUET/CA…), salary band, demand.
- **College / course matcher**: by stream + career + location + budget; tag with
  entrance exams. (Live national DB import is heavier; start with a curated seed.)
- **Scholarship matcher**: NSP (National Scholarship Portal) categories, merit/means,
  state scholarships — match by class, category, income band, marks.
- **Entrance-exam calendar**: key dates for relevant exams.

### 5. Counsellor workflow (complements existing counselling module)
- Counsellor assigns/reviews assessments, reads the auto-report, adds professional
  notes, and **links the result to a confidential `career`-type counselling session**
  in the existing module (no duplication — one source of truth for the conversation,
  this module for the data/assessment).
- Cohort view: stream-inclination distribution for a Class-10 batch → school planning.

### 6. Engagement / accessibility
- Save-and-resume long assessments; progress bar; mobile-friendly.
- Bilingual (English + regional via existing i18n) for accessibility.
- Re-test over time to show how interests evolve (NEP's developmental view).

## What makes it easy for users (UX principles)
- **Guided, chunked assessment**: one construct at a time, clear instructions, timer
  only where needed, save-and-resume — not an intimidating 200-item wall.
- **Instant, explainable result**: the report shows *why* a stream was recommended
  (the driving scores), so students/parents trust it — no black box.
- **Counsellor-in-the-loop**: auto-result is a draft; the counsellor confirms and
  contextualises before it's shared — keeps it human and safe.
- **No double data entry**: pulls the student's actual marks (gradebook/exams) and
  attendance to sanity-check aptitude vs performance, and writes outcomes to the
  Skills Passport + links to the counselling session.
- **Offline-first / Spark-tier**: item bank, scoring, stream matrix, career/college/
  scholarship libraries are all bundled/Firestore data + client-side compute — works
  with zero paid services. Only an *optional* AI narrative needs a key.

## Mapping to NEXLI data we already have
| Capability | Source NEXLI data | Collection |
|---|---|---|
| Student identity / class / marks sanity-check | students, gradebook, exams | `students`, `assessments`/marks, `examinations` |
| Link result to a counselling conversation | existing counselling sessions (`career` type) | `counseling` |
| Outcomes → holistic record | Skills Passport, HPC | `portfolio_entries`, `hpc_*` |
| Skills to build → competencies | gamification competencies | `point_awards`, `student_badges` |
| College/scholarship → application pack | Skills Passport application bundle | `portfolio_*` |

## Sources
- [Psychometric assessments for choosing a career in India — Mindler](https://www.mindler.com/blog/the-role-of-psychometric-assessments-in-choosing-the-right-career-in-india/)
- [Aptitude tests for stream selection after 10th — eKal Academy](https://ekalacademy.com/blog/how-aptitude-tests-can-help-you-choose-right-career-stream-after-10th/)
- [CBSE/NCERT 'Tamanna' aptitude test for Class 9–10 — Careers360](https://news.careers360.com/tamanna-aptitude-test-for-class-9-10-students-make-better-career-choices/amp)
- [Holland Code (RIASEC) Test — Open Psychometrics](https://openpsychometrics.org/tests/RIASEC/)
- [Holland Code Assessment and RIASEC — Career Key](https://www.careerkey.org/fit/personality/holland-code-assessment-riasec)
- [Stream Selector psychometric test — Lodestar](https://lodestar.guru/stream-selector.html)
